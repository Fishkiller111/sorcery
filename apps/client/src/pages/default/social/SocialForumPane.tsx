import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  likeCommunityPost,
  unlikeCommunityPost,
  createContentReport,
  blockCommunityUser,
  type ContentReportReason,
} from '../../../api/community';
import { followExploreRole, unfollowExploreRole, unlockExploreRoleMedia, unlockExploreRoleMediaBundle } from '../../../api/roles';
import { getForumFeed } from '../../../api/forum';
import { ApiError } from '../../../api/client';
import { APP_SITE_URL, resolveStaticUrl } from '../../../constants/config';
import { resolveShareOrigin } from '../../../utils/shareOrigin';
import { useI18n } from '../../../i18n/I18nContext';
import { useAuthStore } from '../../../stores/authStore';
import { requireLoginForAction } from '../../../utils/requireLogin';
import { notifyError, notifySuccess, notifyWarning } from '../../../utils/notify';
import { copyOrShareText, shareTaskLink } from '../../../utils/copyOrShare';
import { formatApiError } from '../../../utils/apiError';
import { MATURE_LOCKED_REASON } from '../../../utils/mediaDisplay';
import { canUserSeeMature } from '../../../utils/agentRatingDisplay';
import { Typo } from '../../../theme/typography';
import { hiddenScrollViewProps } from '../../../theme/webScrollbar';
import type { ForumBoardSlug, PostImageView, PostItem } from '../../../types/api';
import { ForumBoardTabs } from './ForumBoardTabs';
import { ForumComposeModal } from './ForumComposeModal';
import { SocialPostCard } from './SocialPostCard';
import { SocialReportReasonModal } from './SocialReportReasonModal';
import { SOCIAL } from './socialTokens';
import { ThemedGeneralConfirmModal } from '../../../components/ui/ThemedGeneralConfirmModal';
import {
  SOCIAL_FEED_LOAD_MORE_SENTINEL_ID,
  useWebFeedScroll,
} from './useWebFeedScroll';
import { TOKENS } from '../theme/tokens';
import { useMobileBottomNavPadding } from '../../../hooks/useMobileSafeAreaPadding';

const PAGE_SIZE = 20;
const LOAD_MORE_DISTANCE = 480;
const BACK_TOP_SHOW_Y = 240;
const MOBILE_NAV_BAR_H = 80;
const POST_FAB_GAP = 20;

type BoardCache = {
  items: PostItem[];
  page: number;
  totalPages: number;
};

const emptyCache = (): BoardCache => ({ items: [], page: 1, totalPages: 1 });

export type SocialForumPaneHandle = {
  openCompose: () => void;
  scrollToTop: () => void;
};

type Props = {
  isMobileChrome: boolean;
  /** Hide outer FAB when this pane renders its own. */
  onComposeAvailabilityChange?: (ownsFab: boolean) => void;
};

export const SocialForumPane = forwardRef<SocialForumPaneHandle, Props>(
  function SocialForumPane({ isMobileChrome, onComposeAvailabilityChange }, ref) {
    const { t } = useI18n();
    const router = useRouter();
    const postFabBottom = useMobileBottomNavPadding(MOBILE_NAV_BAR_H + POST_FAB_GAP);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const user = useAuthStore((s) => s.user);
    const canSeeMature = canUserSeeMature(user);

    const [board, setBoard] = useState<ForumBoardSlug>('general');
    const [caches, setCaches] = useState<Partial<Record<ForumBoardSlug, BoardCache>>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [likeBusyId, setLikeBusyId] = useState<string | null>(null);
    const [unlockBusyId, setUnlockBusyId] = useState<string | null>(null);
    const [followBusyId, setFollowBusyId] = useState<string | null>(null);
    const [followedByRole, setFollowedByRole] = useState<Record<string, boolean>>({});
    const [composeOpen, setComposeOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<PostItem | null>(null);
    const [blockTarget, setBlockTarget] = useState<PostItem | null>(null);
    const [showBackTop, setShowBackTop] = useState(false);

    const loadedOnce = useRef<Partial<Record<ForumBoardSlug, boolean>>>({});
    const loadingMoreRef = useRef(false);
    const backTopAnim = useRef(new Animated.Value(0)).current;
    const showBackTopRef = useRef(false);
    const feedListRef = useRef<FlatList<PostItem> | null>(null);
    const loadFeedRef = useRef<
      ((nextBoard: ForumBoardSlug, nextPage: number, mode: 'replace' | 'append') => Promise<void>) | null
    >(null);
    const feedMetaRef = useRef({
      board: 'general' as ForumBoardSlug,
      page: 1,
      totalPages: 1,
      loading: true,
      refreshing: false,
    });

    const current = caches[board] ?? emptyCache();
    feedMetaRef.current = {
      board,
      page: current.page,
      totalPages: current.totalPages,
      loading,
      refreshing,
    };

    const applyPageResult = useCallback(
      (
        prev: BoardCache,
        nextItems: PostItem[],
        mode: 'replace' | 'append',
        nextPage: number,
        apiTotalPages: number,
      ): BoardCache => {
        let items = nextItems;
        if (mode === 'append') {
          const seen = new Set(prev.items.map((p) => p.post_id));
          const unique = nextItems.filter((p) => !seen.has(p.post_id));
          items = [...prev.items, ...unique];
        }
        const page = nextPage;
        let totalPages = Math.max(1, apiTotalPages);
        if (mode === 'append' && nextItems.length === 0) {
          totalPages = Math.max(1, prev.page);
        } else if (nextItems.length >= PAGE_SIZE && apiTotalPages <= page) {
          totalPages = page + 1;
        } else if (nextItems.length < PAGE_SIZE) {
          totalPages = page;
        }
        return { items, page, totalPages };
      },
      [],
    );

    const loadFeed = useCallback(
      async (nextBoard: ForumBoardSlug, nextPage: number, mode: 'replace' | 'append') => {
        try {
          const res = await getForumFeed({
            board: nextBoard,
            page: nextPage,
            page_size: PAGE_SIZE,
          });
          const nextItems = res.items ?? [];
          const page = res.pagination?.page ?? nextPage;
          const apiTotalPages = Math.max(1, res.pagination?.total_pages ?? 1);
          setCaches((prev) => {
            const base = prev[nextBoard] ?? emptyCache();
            return {
              ...prev,
              [nextBoard]: applyPageResult(base, nextItems, mode, page, apiTotalPages),
            };
          });
          loadedOnce.current[nextBoard] = true;
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            requireLoginForAction(false, router, t('social.loginToPost'));
            return;
          }
          notifyError(t('forum.loadFailed'), err instanceof Error ? err.message : undefined);
          if (mode === 'replace') {
            setCaches((prev) => ({ ...prev, [nextBoard]: emptyCache() }));
          }
        }
      },
      [applyPageResult, router, t],
    );
    loadFeedRef.current = loadFeed;

    const tryLoadMore = useCallback(async () => {
      const meta = feedMetaRef.current;
      if (meta.refreshing || loadingMoreRef.current) return;
      if (meta.page >= meta.totalPages) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      try {
        const load = loadFeedRef.current;
        if (!load) return;
        await load(meta.board, meta.page + 1, 'append');
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }, []);

    const refresh = useCallback(async () => {
      setRefreshing(true);
      try {
        await loadFeed(board, 1, 'replace');
      } finally {
        setRefreshing(false);
      }
    }, [board, loadFeed]);

    const {
      listRef: webFeedListRef,
      showPullOverlay,
      pullOverlayHeight,
    } = useWebFeedScroll({
      refreshing,
      onRefresh: refresh,
      onNearBottom: () => {
        void tryLoadMore();
      },
      enabled: Platform.OS === 'web',
    });

    const setFeedListRef = useCallback(
      (node: FlatList<PostItem> | null) => {
        feedListRef.current = node;
        webFeedListRef.current = node as unknown as typeof webFeedListRef.current;
      },
      [webFeedListRef],
    );

    const onFeedScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const y = Math.max(0, contentOffset.y);
        const distanceFromBottom = contentSize.height - layoutMeasurement.height - y;
        if (layoutMeasurement.height > 0 && distanceFromBottom < LOAD_MORE_DISTANCE) {
          void tryLoadMore();
        }
        if (isMobileChrome) {
          const nextBackTop = y > BACK_TOP_SHOW_Y;
          if (nextBackTop !== showBackTopRef.current) {
            showBackTopRef.current = nextBackTop;
            setShowBackTop(nextBackTop);
          }
        }
      },
      [isMobileChrome, tryLoadMore],
    );

    useEffect(() => {
      Animated.timing(backTopAnim, {
        toValue: showBackTop ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [backTopAnim, showBackTop]);

    useFocusEffect(
      useCallback(() => {
        let alive = true;
        (async () => {
          const needFetch = !loadedOnce.current[board];
          if (needFetch) setLoading(true);
          await loadFeed(board, 1, 'replace');
          if (alive) setLoading(false);
        })();
        return () => {
          alive = false;
        };
      }, [board, loadFeed]),
    );

    useEffect(() => {
      onComposeAvailabilityChange?.(true);
      return () => onComposeAvailabilityChange?.(false);
    }, [onComposeAvailabilityChange]);

    const openCompose = useCallback(() => {
      if (!requireLoginForAction(isLoggedIn, router, t('social.loginToPost'))) return;
      setComposeOpen(true);
    }, [isLoggedIn, router, t]);

    const scrollFeedToTop = useCallback(() => {
      feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        openCompose,
        scrollToTop: scrollFeedToTop,
      }),
      [openCompose, scrollFeedToTop],
    );

    const onChangeBoard = (next: ForumBoardSlug) => {
      if (next === board) return;
      showBackTopRef.current = false;
      setShowBackTop(false);
      setBoard(next);
      if (!loadedOnce.current[next]) setLoading(true);
    };

    const patchItems = useCallback(
      (postId: string, patch: Partial<PostItem> | ((p: PostItem) => PostItem)) => {
        setCaches((prev) => {
          const next: typeof prev = { ...prev };
          for (const key of Object.keys(next) as ForumBoardSlug[]) {
            const cache = next[key];
            if (!cache) continue;
            next[key] = {
              ...cache,
              items: cache.items.map((p) => {
                if (p.post_id !== postId) return p;
                return typeof patch === 'function' ? patch(p) : { ...p, ...patch };
              }),
            };
          }
          return next;
        });
      },
      [],
    );

    const onPressAuthor = (roleId: string) => {
      if (!roleId) return;
      router.push(`/agent/${roleId}/media` as never);
    };

    const onUnlockMedia = async (item: PostItem, image: PostImageView) => {
      if (!requireLoginForAction(isLoggedIn, router, t('social.loginToUnlock'))) return;
      if (unlockBusyId) return;
      if (image.locked_reason === MATURE_LOCKED_REASON) {
        if (!canSeeMature) {
          router.push('/settings');
          return;
        }
        void refresh();
        return;
      }
      if (!item.role_id || !image.media_id) return;
      const busyKey = `${item.post_id}:${image.media_id}`;
      setUnlockBusyId(busyKey);
      try {
        if (image.bundle_id) {
          await unlockExploreRoleMediaBundle(item.role_id, image.bundle_id);
        } else {
          await unlockExploreRoleMedia(item.role_id, image.media_id);
        }
        patchItems(item.post_id, (p) => ({
          ...p,
          images: (p.images || []).map((img) =>
            img.media_id === image.media_id ||
            (image.bundle_id && img.bundle_id === image.bundle_id)
              ? { ...img, locked: false, locked_reason: undefined, need_blur: false }
              : img,
          ),
        }));
        notifySuccess(t('social.unlockOk'));
      } catch (e) {
        notifyError(formatApiError(t, e));
      } finally {
        setUnlockBusyId(null);
      }
    };

    const onToggleLike = async (item: PostItem) => {
      if (!requireLoginForAction(isLoggedIn, router, t('social.loginToLike'))) return;
      if (likeBusyId) return;
      setLikeBusyId(item.post_id);
      const liked = !!item.liked_by_me;
      patchItems(item.post_id, {
        liked_by_me: !liked,
        like_count: Math.max(0, item.like_count + (liked ? -1 : 1)),
      });
      try {
        const res = liked
          ? await unlikeCommunityPost(item.post_id)
          : await likeCommunityPost(item.post_id);
        patchItems(item.post_id, { liked_by_me: res.liked, like_count: res.like_count });
      } catch (err) {
        patchItems(item.post_id, item);
        notifyError(t('social.likeFailed'), err instanceof Error ? err.message : undefined);
      } finally {
        setLikeBusyId(null);
      }
    };

    const onToggleFollow = async (item: PostItem) => {
      if (!requireLoginForAction(isLoggedIn, router, t('social.loginToFollow'))) return;
      if (!item.role_id || followBusyId) return;
      const roleId = item.role_id;
      const followed = !!followedByRole[roleId];
      setFollowBusyId(roleId);
      setFollowedByRole((prev) => ({ ...prev, [roleId]: !followed }));
      try {
        const res = followed
          ? await unfollowExploreRole(roleId)
          : await followExploreRole(roleId);
        setFollowedByRole((prev) => ({ ...prev, [roleId]: res.followed }));
      } catch (err) {
        setFollowedByRole((prev) => ({ ...prev, [roleId]: followed }));
        notifyError(t('social.followFailed'), err instanceof Error ? err.message : undefined);
      } finally {
        setFollowBusyId(null);
      }
    };

    const onSharePost = async (item: PostItem) => {
      const isPersonal = item.author_kind === 'user' || !item.role_id;
      const name = item.role_name?.trim() || (isPersonal ? 'User' : 'Agent');
      const content = item.content?.trim() || '';
      const path = item.role_id ? `/agent/${item.role_id}/media` : '/social';
      // 未配置分享地址时不跳转到原产品站点。
    const site = resolveShareOrigin(APP_SITE_URL, Platform.OS, Platform.OS === 'web' && typeof window !== 'undefined' ? window.location : undefined);
    if (!site) { notifyError(t('social.shareFailed')); return; }
      const url = `${site.replace(/\/$/, '')}${path}`;
      const body = [content, `— ${name}`].filter(Boolean).join('\n\n');
      try {
        const shared = await shareTaskLink({
          url,
          text: body || undefined,
          title: t('social.sharePost'),
        });
        if (shared) {
          notifySuccess(t('social.shareSuccess'));
          return;
        }
        const result = await copyOrShareText(
          [body, url].filter(Boolean).join('\n\n'),
          t('social.sharePost'),
        );
        if (result === 'copied') {
          notifySuccess(t('social.shareCopied'));
        } else if (result === 'shared') {
          notifySuccess(t('social.shareSuccess'));
        }
      } catch (err) {
        notifyError(t('social.shareFailed'), err instanceof Error ? err.message : undefined);
      }
    };

    const onReportPost = (item: PostItem) => {
      if (!requireLoginForAction(isLoggedIn, router, t('social.loginToComment'))) return;
      setReportTarget(item);
    };

    const submitReport = async (reason: ContentReportReason) => {
      const target = reportTarget;
      setReportTarget(null);
      if (!target) return;
      try {
        await createContentReport({
          target_type: 'post',
          target_id: target.post_id,
          reason_code: reason,
        });
        notifySuccess(t('social.reportSubmitted'));
      } catch (err) {
        notifyError(t('social.reportFailed'), formatApiError(t, err));
      }
    };

    const onBlockAuthor = (item: PostItem) => {
      if (!requireLoginForAction(isLoggedIn, router, t('social.loginToComment'))) return;
      const canBlockUser = Boolean(item.author_user_id);
      const canBlockAgent = Boolean(item.role_id) && item.author_kind !== 'user';
      if (!canBlockUser && !canBlockAgent) {
        notifyWarning(t('social.blockFailed'));
        return;
      }
      setBlockTarget(item);
    };

    const confirmBlock = async () => {
      const target = blockTarget;
      setBlockTarget(null);
      if (!target) return;
      try {
        const resp = await blockCommunityUser({
          user_id: target.author_user_id || undefined,
          post_id: target.post_id,
          reason_code: 'harassment',
        });
        const blockedRoleId = resp.blocked_role_id || '';
        const blockedUserId = resp.blocked_user_id || target.author_user_id || '';
        const keepPost = (p: PostItem) => {
          if (blockedRoleId && p.role_id === blockedRoleId) return false;
          if (!blockedRoleId && blockedUserId && p.author_user_id === blockedUserId) return false;
          return true;
        };
        setCaches((prev) => {
          const next: typeof prev = {};
          for (const key of Object.keys(prev) as ForumBoardSlug[]) {
            const cache = prev[key];
            if (!cache) continue;
            next[key] = {
              ...cache,
              items: cache.items.filter(keepPost),
            };
          }
          return next;
        });
        notifySuccess(t('social.blockOk'));
      } catch (err) {
        notifyError(t('social.blockFailed'), formatApiError(t, err));
      }
    };

    const onComposePosted = () => {
      loadedOnce.current[board] = false;
      void refresh();
    };

    const avatarUri = user?.avatar_url ? resolveStaticUrl(user.avatar_url) : null;
    const userDisplayName = user?.nickname?.trim() || user?.email?.trim() || '';
    const items = current.items;
    const showInitialLoader = loading && items.length === 0;
    const feedScrollHideProps = hiddenScrollViewProps();
    const feedScrollHideStyle = feedScrollHideProps.style as object | undefined;

    return (
      <View style={styles.root}>
        <View style={[styles.feedPanel, isMobileChrome && styles.feedPanelMobile]}>
          <View style={styles.boardHeader}>
            <ForumBoardTabs board={board} onChange={onChangeBoard} compact={isMobileChrome} />
            {!isMobileChrome ? (
              <Pressable
                style={({ pressed }) => [styles.desktopPostBtn, pressed && styles.desktopPostBtnPressed]}
                onPress={openCompose}
              >
                <Text style={styles.desktopPostBtnText}>{t('social.post')}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.tabDivider} />

          {showInitialLoader ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={TOKENS.colors.accent} />
            </View>
          ) : (
            <View style={styles.feedListWrap}>
              {Platform.OS === 'web' && showPullOverlay ? (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.webPullOverlay, { height: pullOverlayHeight }]}
                >
                  <ActivityIndicator color={TOKENS.colors.accent} />
                </Animated.View>
              ) : null}
              <FlatList
                {...(Platform.OS === 'web' ? feedScrollHideProps : null)}
                ref={setFeedListRef}
                key={board}
                data={items}
                keyExtractor={(item) => item.post_id}
                style={[styles.list, Platform.OS === 'web' ? feedScrollHideStyle : null]}
                contentContainerStyle={[
                  styles.listContent,
                  items.length === 0 && styles.listContentEmpty,
                ]}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={onFeedScroll}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  Platform.OS === 'web' ? undefined : (
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={refresh}
                      tintColor={TOKENS.colors.accent}
                      colors={[TOKENS.colors.accent]}
                      progressBackgroundColor="#1A1F2E"
                    />
                  )
                }
                onEndReached={() => {
                  void tryLoadMore();
                }}
                onEndReachedThreshold={isMobileChrome ? 0.5 : 0.25}
                ListEmptyComponent={
                  <View style={styles.centerState}>
                    <Text style={styles.emptyText}>{t('forum.empty')}</Text>
                  </View>
                }
                ListFooterComponent={
                  <View style={styles.listFooter}>
                    {loadingMore ? (
                      <ActivityIndicator
                        style={{ marginVertical: 12 }}
                        color={TOKENS.colors.accent}
                      />
                    ) : null}
                    <View
                      nativeID={SOCIAL_FEED_LOAD_MORE_SENTINEL_ID}
                      style={styles.loadMoreSentinel}
                      collapsable={false}
                    />
                  </View>
                }
                renderItem={({ item, index }) => (
                  <SocialPostCard
                    item={item}
                    showDivider={index < items.length - 1}
                    followedByMe={!!followedByRole[item.role_id]}
                    followBusy={followBusyId === item.role_id}
                    onPressAuthor={onPressAuthor}
                    onToggleLike={onToggleLike}
                    onToggleFollow={onToggleFollow}
                    onSharePost={onSharePost}
                    onReportPost={onReportPost}
                    onBlockAuthor={onBlockAuthor}
                    onUnlockMedia={(p, img) => void onUnlockMedia(p, img)}
                    canSeeMature={canSeeMature}
                    unlockBusy={
                      unlockBusyId === `${item.post_id}:${item.images?.[0]?.media_id || ''}`
                    }
                    unlockLabel={t('agentMedia.unlock')}
                    unlockMatureLabel={t('agentMedia.unlockMature')}
                    revealRLabel={t('agentMedia.revealR')}
                    likeBusy={likeBusyId === item.post_id}
                    followLabel={t('social.follow')}
                    followingLabel={t('social.following')}
                    shareLabel={t('social.sharePost')}
                    reportLabel={t('social.reportPost')}
                    blockLabel={t('social.blockUser')}
                    requireLogin={() =>
                      requireLoginForAction(isLoggedIn, router, t('social.loginToComment'))
                    }
                    currentUserId={user?.id}
                    commentsTitle={t('social.commentsTitle')}
                    commentPlaceholder={t('social.commentPlaceholder')}
                    commentSendLabel={t('social.commentSend')}
                    commentsEmptyLabel={t('social.commentsEmpty')}
                    enableCommentLikes
                  />
                )}
              />
            </View>
          )}
        </View>

        {isMobileChrome ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.mobilePostFab,
                { bottom: postFabBottom },
                pressed && styles.mobilePostFabPressed,
              ]}
              onPress={openCompose}
            >
              <Text style={styles.mobilePostFabText}>{t('social.post')}</Text>
            </Pressable>
            <Animated.View
              pointerEvents={!showBackTop ? 'none' : 'box-none'}
              style={[
                styles.mobileBackTopWrap,
                {
                  bottom: postFabBottom,
                  opacity: backTopAnim,
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.mobileBackTopFab,
                  pressed && styles.mobileBackTopFabPressed,
                ]}
                onPress={scrollFeedToTop}
                accessibilityRole="button"
                accessibilityLabel={t('social.backToTop')}
              >
                <Ionicons name="chevron-up" size={22} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          </>
        ) : null}

        <ForumComposeModal
          visible={composeOpen}
          board={board}
          onClose={() => setComposeOpen(false)}
          onPosted={onComposePosted}
          userAvatarUri={avatarUri}
          userDisplayName={userDisplayName}
        />

        <SocialReportReasonModal
          visible={!!reportTarget}
          onClose={() => setReportTarget(null)}
          onSelect={(reason) => void submitReport(reason)}
        />

        <ThemedGeneralConfirmModal
          visible={!!blockTarget}
          icon="warning"
          title={t('social.blockConfirmTitle')}
          subtitle={t('social.blockConfirmBody')}
          subtitleTone="warning"
          cancelLabel={t('menu.back')}
          confirmLabel={t('social.blockUser')}
          onCancel={() => setBlockTarget(null)}
          onConfirm={() => void confirmBlock()}
        />
      </View>
    );
  },
);

const glass =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as object)
    : {};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  feedPanel: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderWidth: 1.2,
    borderColor: SOCIAL.feedPanelBorder,
    borderRadius: SOCIAL.feedPanelRadius,
    backgroundColor: 'transparent',
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
    ...glass,
  },
  feedPanelMobile: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    overflow: 'visible',
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  desktopPostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: SOCIAL.postBtn,
  },
  desktopPostBtnPressed: { opacity: 0.88 },
  desktopPostBtnText: Typo(
    { color: '#0B0D12', fontSize: 14, fontWeight: '700' },
    'sans',
  ),
  tabDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SOCIAL.divider,
    marginHorizontal: 12,
  },
  feedListWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
  },
  list: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? ({
          height: '100%',
          maxHeight: '100%',
        } as object)
      : {}),
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  webPullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    overflow: 'hidden',
  },
  listFooter: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  loadMoreSentinel: {
    width: '100%',
    height: 24,
  },
  centerState: {
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: Typo(
    { color: SOCIAL.tabInactive, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    'sans',
  ),
  mobilePostFab: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: SOCIAL.postBtn,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.35)' } as object,
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      },
    }),
  },
  mobilePostFabPressed: { opacity: 0.9 },
  mobilePostFabText: Typo(
    { color: '#0B0D12', fontSize: 15, fontWeight: '700' },
    'sans',
  ),
  mobileBackTopWrap: {
    position: 'absolute',
    right: 16,
    marginBottom: 56,
    zIndex: 29,
  },
  mobileBackTopFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 31, 46, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SOCIAL.divider,
  },
  mobileBackTopFabPressed: { opacity: 0.85 },
});
