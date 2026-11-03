import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/safeGoBack';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { resolveStaticUrl, APP_SITE_URL } from '../../constants/config';
import {
  followExploreRole,
  getExploreRoleDetail,
  likeExploreRole,
  listExploreRoleMedia,
  listExploreRolePosts,
  unfollowExploreRole,
  unlikeExploreRole,
  unlockExploreRoleGallery,
  unlockExploreRoleMedia,
  unlockExploreRoleMediaBundle,
} from '../../api/roles';
import {
  likeCommunityPost,
  unlikeCommunityPost,
} from '../../api/community';
import type {
  ExploreRoleDetailResp,
  PostImageView,
  PostItem,
  RoleMediaItem,
} from '../../types/api';
import { formatApiError } from '../../utils/apiError';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { copyOrShareText } from '../../utils/copyOrShare';
import { useAuthStore } from '../../stores/authStore';
import { useAgentMediaCacheStore } from '../../stores/agentMediaCacheStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { canUserSeeMature } from '../../utils/agentRatingDisplay';
import {
  isMatureMediaLocked,
  isMatureRated,
  isRoleMediaVideo,
  MATURE_LOCKED_REASON,
  GALLERY_PACK_LOCKED_REASON,
  needsMatureMediaRefresh,
  resolveRoleMediaFileUrl,
  resolveRoleMediaThumbUrl,
  isRealPersonUnlockGateBlocked,
  type MediaUnlockRequirementsView,
} from '../../utils/mediaDisplay';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { DefaultShell } from './components/DefaultShell';
import { DefaultAvatarGlowFrame } from './components/DefaultAvatarGlowFrame';
import { VerifiedRealPersonBadge } from '../../components/agent/VerifiedRealPersonBadge';
import { RoleSafetyActionLinks } from '../../components/agent/RoleSafetyActionLinks';
import { isVerifiedRealPerson } from '../../utils/verifiedRealPerson';
import { SocialPostCard } from './social/SocialPostCard';
import { AgentMediaCard } from './agent-media/AgentMediaCard';
import { AgentGiftButton } from './agent-media/AgentGiftButton';
import { AgentGiftSheet } from './agent-media/AgentGiftSheet';
import { AgentMediaFilterTabs } from './agent-media/AgentMediaFilterTabs';
import { AgentCommentsPanel } from './agent-media/AgentCommentsPanel';
import { AgentMediaPreviewModal } from './agent-media/AgentMediaPreviewModal';
import { AgentMediaUnlockGateModal } from './agent-media/AgentMediaUnlockGateModal';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import { AGENT_MEDIA } from './agent-media/agentMediaTokens';
import { TOKENS } from './theme/tokens';
import { ApiError } from '../../api/client';

type MediaTab = 'comments' | 'photos' | 'videos' | 'post';

const BIO_COLLAPSE_LINES = 2;
const MEDIA_COLS_DESKTOP = 5;
const MEDIA_COLS_MOBILE = 3;
const MEDIA_GAP = 6;
/** Match backend maxPublishedRoleMedia so the gallery fills in one request when possible. */
const MEDIA_PAGE_SIZE = 50;

function mediaIsMature(item: RoleMediaItem): boolean {
  return isMatureRated(item) || isMatureMediaLocked(item);
}

function formatCount(n?: number): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function parseAttributes(attrJson?: string): Record<string, unknown> | null {
  if (!attrJson) return null;
  try {
    return JSON.parse(attrJson);
  } catch {
    return null;
  }
}

function formatScalar(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function formatCreatorHandle(nickname?: string | null): string | null {
  const raw = nickname?.trim();
  if (!raw) return null;
  return raw.startsWith('@') ? raw : `@${raw}`;
}

function isUnlockGateApiError(e: unknown): boolean {
  return e instanceof ApiError && (e.code === 'SOCIAL_020' || e.code === 'SOCIAL_021');
}

function genderLabel(
  raw: string | null,
  t: (key: string) => string,
): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase();
  if (key === 'male' || key === 'm') return t('settings.genderMale');
  if (key === 'female' || key === 'f') return t('settings.genderFemale');
  if (key === 'neutral' || key === 'androgynous') return t('createAgent.wizard.genderNeutral');
  if (key === 'other') return t('settings.genderOther');
  return raw;
}

export function DefaultAgentMediaScreen() {
  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const { t, tp } = useI18n();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = useIsDesktop();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const canSeeMature = canUserSeeMature(user);
  const pagePadding = useMobilePageContentPaddingStyle();

  const [detail, setDetail] = useState<ExploreRoleDetailResp | null>(null);
  const [media, setMedia] = useState<RoleMediaItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [tab, setTab] = useState<MediaTab>('photos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [roleLikeBusy, setRoleLikeBusy] = useState(false);
  const [unlockBusyId, setUnlockBusyId] = useState<string | null>(null);
  const [unlockGate, setUnlockGate] = useState<{
    lockedReason?: string;
    requirements?: MediaUnlockRequirementsView;
  } | null>(null);
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [galleryUnlockEligible, setGalleryUnlockEligible] = useState(false);
  const [galleryUnlockPrice, setGalleryUnlockPrice] = useState(1000);
  const [galleryConfirmOpen, setGalleryConfirmOpen] = useState(false);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaTotalPages, setMediaTotalPages] = useState(1);
  const [mediaTotalCount, setMediaTotalCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [previewItem, setPreviewItem] = useState<RoleMediaItem | null>(null);
  const loadingMoreRef = useRef(false);
  const mediaLenRef = useRef(0);
  const refreshedMaturePayloadRef = useRef(false);

  const contentPad = windowWidth >= 1100 ? 44 : windowWidth >= 720 ? 28 : 16;
  const contentWidth = Math.max(
    280,
    windowWidth - contentPad * 2 - (isDesktop ? TOKENS.layout.sidebarWidth : 0),
  );
  const mediaCols = isDesktop ? MEDIA_COLS_DESKTOP : MEDIA_COLS_MOBILE;
  const cardWidth = Math.max(
    56,
    Math.floor((contentWidth - MEDIA_GAP * (mediaCols - 1)) / mediaCols),
  );
  const avatarSize = isDesktop ? 112 : 76;

  const mediaCacheGet = useAgentMediaCacheStore((s) => s.get);
  const mediaCacheFresh = useAgentMediaCacheStore((s) => s.isFresh);
  const mediaCacheSet = useAgentMediaCacheStore((s) => s.set);
  const mediaCacheClear = useAgentMediaCacheStore((s) => s.clearRole);

  const requireLogin = useCallback(
    () => requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing')),
    [isLoggedIn, router, t],
  );

  const prefetchMediaThumbs = useCallback((items: RoleMediaItem[], from = 0, count = MEDIA_PAGE_SIZE) => {
    const slice = items.slice(from, from + count);
    const uris = slice
      .map((m) => resolveRoleMediaThumbUrl(m))
      .filter((u): u is string => Boolean(u));
    if (!uris.length) return;
    void Image.prefetch(uris, 'memory-disk').catch(() => undefined);
  }, []);

  const applyMediaPage = useCallback(
    (
      mediaResp: {
        items?: RoleMediaItem[];
        pagination?: { page: number; page_size: number; total: number; total_pages: number };
        image_count?: number;
        video_count?: number;
        gallery_unlocked?: boolean;
        gallery_unlock_price?: number;
        gallery_unlock_eligible?: boolean;
      },
      mode: 'replace' | 'append',
    ) => {
      if (typeof mediaResp.gallery_unlock_eligible === 'boolean') {
        setGalleryUnlockEligible(mediaResp.gallery_unlock_eligible);
      }
      if (typeof mediaResp.gallery_unlock_price === 'number' && mediaResp.gallery_unlock_price > 0) {
        setGalleryUnlockPrice(mediaResp.gallery_unlock_price);
      }
      if (mediaResp.gallery_unlocked) {
        setGalleryUnlockEligible(false);
      }
      const nextMedia = mediaResp.items ?? [];
      const page = Math.max(1, mediaResp.pagination?.page ?? 1);
      const pageSize = Math.max(1, mediaResp.pagination?.page_size ?? MEDIA_PAGE_SIZE);
      const hasPagination = Boolean(mediaResp.pagination);
      const totalFromApi =
        typeof mediaResp.pagination?.total === 'number' ? mediaResp.pagination.total : undefined;

      let images =
        typeof mediaResp.image_count === 'number' ? mediaResp.image_count : undefined;
      let videos =
        typeof mediaResp.video_count === 'number' ? mediaResp.video_count : undefined;
      if (mode === 'replace') {
        if (images == null) {
          images = nextMedia.filter((m) => m.media_type === 'image').length;
        }
        if (videos == null) {
          videos = nextMedia.filter((m) => m.media_type === 'video').length;
        }
      }

      let total =
        totalFromApi ??
        (images != null && videos != null ? images + videos : undefined) ??
        (mode === 'replace' ? nextMedia.length : undefined);

      let totalPages = mediaResp.pagination?.total_pages ?? 0;
      if (totalPages < 1) {
        if (typeof total === 'number' && total > 0) {
          totalPages = Math.max(1, Math.ceil(total / pageSize));
        } else if (nextMedia.length >= pageSize) {
          // Full page and unknown total — assume another page may exist.
          totalPages = page + 1;
        } else if (!hasPagination && mode === 'replace') {
          // Legacy API returned the full list in one shot.
          totalPages = 1;
          total = nextMedia.length;
        } else {
          totalPages = page;
        }
      }

      // If server counts say there is more than we hold, never clamp to a finished state.
      const knownNeed =
        (images ?? 0) + (videos ?? 0) > 0
          ? (images ?? 0) + (videos ?? 0)
          : typeof total === 'number'
            ? total
            : 0;
      const heldAfter =
        mode === 'replace' ? nextMedia.length : mediaLenRef.current + nextMedia.length;
      if (knownNeed > heldAfter && totalPages <= page) {
        totalPages = page + 1;
      }

      setMediaPage(page);
      setMediaTotalPages(totalPages);
      if (typeof total === 'number') setMediaTotalCount(total);
      else if (knownNeed > 0) setMediaTotalCount(knownNeed);
      if (typeof images === 'number') setImageCount(images);
      if (typeof videos === 'number') setVideoCount(videos);

      if (mode === 'append') {
        setMedia((prev) => {
          const seen = new Set(prev.map((m) => m.media_id));
          const merged = [...prev];
          for (const item of nextMedia) {
            if (!seen.has(item.media_id)) merged.push(item);
          }
          mediaLenRef.current = merged.length;
          return merged;
        });
      } else {
        mediaLenRef.current = nextMedia.length;
        setMedia(nextMedia);
      }
      prefetchMediaThumbs(nextMedia, 0, nextMedia.length);
      return {
        nextMedia,
        page,
        totalPages,
        total: typeof total === 'number' ? total : knownNeed || nextMedia.length,
        imageCount: images ?? 0,
        videoCount: videos ?? 0,
      };
    },
    [prefetchMediaThumbs],
  );

  const load = useCallback(
    async (mode: 'replace' | 'refresh' = 'replace') => {
      if (!roleId) return;
      if (mode === 'replace') {
        const cached = mediaCacheGet(roleId);
        if (cached) {
          setDetail(cached.detail);
          setMedia(cached.media);
          setPosts(cached.posts);
          setImageCount(cached.imageCount ?? 0);
          setVideoCount(cached.videoCount ?? 0);
          setMediaPage(cached.mediaPage ?? 1);
          setMediaTotalPages(cached.mediaTotalPages ?? 1);
          setMediaTotalCount(cached.mediaTotalCount ?? cached.media.length);
          mediaLenRef.current = cached.media.length;
          // Stale/incomplete cache: force another page attempt when counts exceed held items.
          const cachedNeed =
            (cached.imageCount ?? 0) + (cached.videoCount ?? 0) ||
            (cached.mediaTotalCount ?? 0);
          if (cachedNeed > cached.media.length) {
            setMediaTotalPages(Math.max(cached.mediaTotalPages ?? 1, (cached.mediaPage ?? 1) + 1));
          }
          setLoading(false);
          setLoadFailed(false);
          prefetchMediaThumbs(cached.media, 0, MEDIA_PAGE_SIZE);
          if (mediaCacheFresh(roleId)) {
            void (async () => {
              try {
                const [d, mediaResp, postsResp] = await Promise.all([
                  getExploreRoleDetail(roleId),
                  listExploreRoleMedia(roleId, 1, MEDIA_PAGE_SIZE).catch(() => ({
                    items: [] as RoleMediaItem[],
                  })),
                  listExploreRolePosts(roleId, 1, 30).catch(() => ({
                    items: [] as PostItem[],
                    pagination: { page: 1, page_size: 30, total: 0, total_pages: 1 },
                  })),
                ]);
                const agentName = d?.name?.trim() || '';
                const agentAvatar = d?.avatar_url || d?.figure_url || '';
                const nextPosts = (postsResp.items ?? []).map((p) => ({
                  ...p,
                  role_name: p.role_name?.trim() || agentName || p.role_name,
                  role_avatar: p.role_avatar || agentAvatar || p.role_avatar,
                }));
                const applied = applyMediaPage(mediaResp, 'replace');
                setDetail(d);
                setPosts(nextPosts);
                mediaCacheSet(roleId, {
                  detail: d,
                  media: applied.nextMedia,
                  posts: nextPosts,
                  imageCount: applied.imageCount,
                  videoCount: applied.videoCount,
                  mediaPage: applied.page,
                  mediaTotalPages: applied.totalPages,
                  mediaTotalCount: applied.total,
                });
              } catch {
                /* keep cached */
              }
            })();
            return;
          }
        } else {
          setLoading(true);
          setLoadFailed(false);
        }
      }
      try {
        const [d, mediaResp, postsResp] = await Promise.all([
          getExploreRoleDetail(roleId),
          listExploreRoleMedia(roleId, 1, MEDIA_PAGE_SIZE).catch(() => ({
            items: [] as RoleMediaItem[],
          })),
          listExploreRolePosts(roleId, 1, 30).catch(() => ({
            items: [] as PostItem[],
            pagination: { page: 1, page_size: 30, total: 0, total_pages: 1 },
          })),
        ]);
        setDetail(d);
        const applied = applyMediaPage(mediaResp, 'replace');
        const agentName = d?.name?.trim() || '';
        const agentAvatar = d?.avatar_url || d?.figure_url || '';
        const nextPosts = (postsResp.items ?? []).map((p) => ({
          ...p,
          role_name: p.role_name?.trim() || agentName || p.role_name,
          role_avatar: p.role_avatar || agentAvatar || p.role_avatar,
        }));
        setPosts(nextPosts);
        mediaCacheSet(roleId, {
          detail: d,
          media: applied.nextMedia,
          posts: nextPosts,
          imageCount: applied.imageCount,
          videoCount: applied.videoCount,
          mediaPage: applied.page,
          mediaTotalPages: applied.totalPages,
          mediaTotalCount: applied.total,
        });
      } catch (e) {
        notifyError(formatApiError(t, e));
        setLoadFailed(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [roleId, t, mediaCacheGet, mediaCacheFresh, mediaCacheSet, prefetchMediaThumbs, applyMediaPage],
  );

  const exploreMediaTotal = Math.max(mediaTotalCount, imageCount + videoCount, media.length);

  const hasMoreMedia = useMemo(() => {
    if (tab === 'post' || tab === 'comments') return false;
    if (media.length < exploreMediaTotal) return true;
    if (mediaPage < mediaTotalPages) return true;
    return false;
  }, [tab, media.length, exploreMediaTotal, mediaPage, mediaTotalPages]);

  const loadMoreMedia = useCallback(async () => {
    if (!roleId || tab === 'post' || tab === 'comments') return;
    if (loadingMoreRef.current || loading || refreshing) return;
    if (!hasMoreMedia) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = mediaPage + 1;
      const mediaResp = await listExploreRoleMedia(roleId, nextPage, MEDIA_PAGE_SIZE);
      const nextItems = mediaResp.items ?? [];
      if (!nextItems.length) {
        setMediaTotalPages(mediaPage);
        setMediaTotalCount(mediaLenRef.current);
        return;
      }
      const page = Math.max(1, mediaResp.pagination?.page ?? nextPage);
      const pageSize = Math.max(1, mediaResp.pagination?.page_size ?? MEDIA_PAGE_SIZE);
      let total =
        typeof mediaResp.pagination?.total === 'number'
          ? mediaResp.pagination.total
          : Math.max(mediaTotalCount, imageCount + videoCount);
      let totalPages = mediaResp.pagination?.total_pages ?? 0;
      if (totalPages < 1) {
        totalPages =
          total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : nextItems.length >= pageSize ? page + 1 : page;
      }
      if (typeof mediaResp.image_count === 'number') setImageCount(mediaResp.image_count);
      if (typeof mediaResp.video_count === 'number') setVideoCount(mediaResp.video_count);
      setMediaPage(page);

      setMedia((prev) => {
        const seen = new Set(prev.map((m) => m.media_id));
        const merged = [...prev];
        for (const item of nextItems) {
          if (!seen.has(item.media_id)) merged.push(item);
        }
        if (merged.length === prev.length) {
          // Server repeated the same page — stop paging.
          setMediaTotalPages(Math.max(1, page - 1) || mediaPage);
          setMediaTotalCount(prev.length);
          return prev;
        }
        mediaLenRef.current = merged.length;
        const need = Math.max(
          total,
          typeof mediaResp.image_count === 'number' || typeof mediaResp.video_count === 'number'
            ? (mediaResp.image_count ?? imageCount) + (mediaResp.video_count ?? videoCount)
            : 0,
          merged.length,
        );
        if (need > merged.length && totalPages <= page) totalPages = page + 1;
        if (nextItems.length < pageSize && need <= merged.length) totalPages = page;
        setMediaTotalPages(totalPages);
        setMediaTotalCount(need);
        mediaCacheSet(roleId, {
          detail,
          media: merged,
          posts,
          imageCount:
            typeof mediaResp.image_count === 'number' ? mediaResp.image_count : imageCount,
          videoCount:
            typeof mediaResp.video_count === 'number' ? mediaResp.video_count : videoCount,
          mediaPage: page,
          mediaTotalPages: totalPages,
          mediaTotalCount: need,
        });
        prefetchMediaThumbs(nextItems, 0, nextItems.length);
        return merged;
      });
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [
    roleId,
    tab,
    loading,
    refreshing,
    hasMoreMedia,
    mediaPage,
    mediaTotalCount,
    imageCount,
    videoCount,
    mediaCacheSet,
    detail,
    posts,
    prefetchMediaThumbs,
    t,
  ]);

  useEffect(() => {
    void load('replace');
  }, [load]);

  // After enabling Mature mode, drop stale redacted cache and refetch clear URLs (once).
  useEffect(() => {
    if (!canSeeMature) {
      refreshedMaturePayloadRef.current = false;
      return;
    }
    if (!roleId || refreshedMaturePayloadRef.current) return;
    const staleMedia = media.some((m) => needsMatureMediaRefresh(m, true));
    const stalePosts = posts.some((p) =>
      (p.images || []).some(
        (img) =>
          img.locked_reason === MATURE_LOCKED_REASON ||
          (isMatureRated(img) && !img.image_url),
      ),
    );
    if (!staleMedia && !stalePosts) return;
    refreshedMaturePayloadRef.current = true;
    mediaCacheClear(roleId);
    void load('refresh');
  }, [canSeeMature, roleId, media, posts, mediaCacheClear, load]);

  useEffect(() => {
    setPreviewItem(null);
  }, [roleId, tab]);

  const attributes = useMemo(
    () => parseAttributes(detail?.attributes),
    [detail?.attributes],
  );
  const age = formatScalar(attributes?.age);
  const gender = genderLabel(formatScalar(attributes?.gender), t);
  const bio =
    detail?.introduction?.trim()
    || formatScalar(attributes?.background)
    || detail?.scene_desc?.trim()
    || '';

  const photoCount = imageCount;

  const filteredMedia = useMemo(() => {
    let list: RoleMediaItem[];
    if (tab === 'photos') list = media.filter((m) => m.media_type === 'image');
    else if (tab === 'videos') list = media.filter((m) => m.media_type === 'video');
    else list = [];
    if (!canSeeMature) {
      list = list.filter((m) => !isMatureMediaLocked(m, false));
    }
    // Standard first, mature after; keep relative order within each group.
    return [...list].sort((a, b) => Number(mediaIsMature(a)) - Number(mediaIsMature(b)));
  }, [media, tab, canSeeMature]);

  // Keep fetching while the active tab is short of the known totals.
  useEffect(() => {
    if (tab === 'post' || tab === 'comments' || loading || refreshing || loadingMore) return;
    if (!hasMoreMedia) return;
    const needMoreForTab =
      tab === 'photos'
        ? filteredMedia.length < imageCount
        : tab === 'videos'
          ? filteredMedia.length < videoCount
          : false;
    if (!needMoreForTab) return;
    void loadMoreMedia();
  }, [
    tab,
    loading,
    refreshing,
    loadingMore,
    hasMoreMedia,
    filteredMedia.length,
    imageCount,
    videoCount,
    loadMoreMedia,
  ]);

  const maybeLoadMoreFromScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (tab === 'post' || tab === 'comments' || !hasMoreMedia) return;
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const distance = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distance < 480) {
        void loadMoreMedia();
      }
    },
    [tab, hasMoreMedia, loadMoreMedia],
  );

  const hasMatureLocked = useMemo(
    () => !canSeeMature && media.some((m) => isMatureMediaLocked(m, false)),
    [canSeeMature, media],
  );
  const showGalleryUnlockBar =
    galleryUnlockEligible &&
    !isVerifiedRealPerson(detail) &&
    tab !== 'post' &&
    tab !== 'comments';

  const followedByMe = Boolean(detail?.stats?.followed_by_me);
  const likedByMe = Boolean(detail?.stats?.liked_by_me);
  const likeCount = detail?.stats?.like_count ?? 0;
  const followerCount = detail?.stats?.follower_count ?? 0;
  const avatarUri = resolveStaticUrl(detail?.avatar_url || detail?.figure_url);
  const creatorHandle = formatCreatorHandle(detail?.creator_nickname);
  const showSafetyActions = Boolean(
    roleId && !(user?.id && detail?.creator_user_id && detail.creator_user_id === user.id),
  );

  const tabs: { key: MediaTab; label: string }[] = [
    { key: 'photos', label: t('agentMedia.tabPhotos') },
    { key: 'videos', label: t('agentMedia.tabVideos') },
    { key: 'post', label: t('agentMedia.tabPost') },
    {
      key: 'comments',
      label:
        typeof detail?.stats?.comment_count === 'number' && detail.stats.comment_count > 0
          ? `${t('agentMedia.tabComments')} ${detail.stats.comment_count}`
          : t('agentMedia.tabComments'),
    },
  ];

  const handleChat = () => {
    if (!roleId) return;
    if (!requireLogin()) return;
    router.push(`/free-chat/${roleId}` as never);
  };

  const handleGift = () => {
    if (!requireLogin()) return;
    setGiftOpen(true);
  };

  const handleGiftSent = (pointsSpent: number) => {
    setDetail((prev) => {
      if (!prev?.stats) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          gift_points_total: (prev.stats.gift_points_total ?? 0) + pointsSpent,
        },
      };
    });
  };

  const handleFollow = async () => {
    if (!roleId || followBusy) return;
    if (!requireLogin()) return;
    setFollowBusy(true);
    try {
      const resp = followedByMe
        ? await unfollowExploreRole(roleId)
        : await followExploreRole(roleId);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                followed_by_me: resp.followed,
                follower_count: resp.follower_count,
              },
            }
          : prev,
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setFollowBusy(false);
    }
  };

  const handleToggleRoleLike = async () => {
    if (!roleId || roleLikeBusy) return;
    if (!requireLogin()) return;
    setRoleLikeBusy(true);
    try {
      const resp = likedByMe
        ? await unlikeExploreRole(roleId)
        : await likeExploreRole(roleId);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                liked_by_me: resp.liked,
                like_count: resp.like_count,
              },
            }
          : prev,
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setRoleLikeBusy(false);
    }
  };

  const requestGalleryUnlock = () => {
    if (unlockBusyId) return;
    if (!requireLogin()) return;
    setGalleryConfirmOpen(true);
  };

  const handleUnlockGallery = async () => {
    if (!roleId || unlockBusyId) return;
    if (!requireLogin()) return;
    setUnlockBusyId('gallery-all');
    try {
      await unlockExploreRoleGallery(roleId);
      setGalleryUnlockEligible(false);
      setGalleryConfirmOpen(false);
      mediaCacheClear(roleId);
      notifySuccess(t('agentMedia.galleryUnlockSuccess'));
      await load('refresh');
    } catch (e) {
      setGalleryConfirmOpen(false);
      if (e instanceof ApiError && e.code === 'PTS_001') {
        notifyWarning(t('agentMedia.giftInsufficient'));
        router.push('/soul/wallet');
        return;
      }
      notifyError(formatApiError(t, e));
    } finally {
      setUnlockBusyId(null);
    }
  };

  const handleSharePost = async (item: PostItem) => {
    const name = item.role_name?.trim() || detail?.name || 'Agent';
    const content = item.content?.trim() || '';
    const path = roleId ? `/agent/${roleId}/media` : '/social';
    const url = APP_SITE_URL ? `${APP_SITE_URL}${path}` : path;
    const message = [content, `— ${name}`, url].filter(Boolean).join('\n\n');
    try {
      const result = await copyOrShareText(message, t('social.sharePost'));
      if (result === 'copied') {
        notifySuccess(t('social.shareCopied'));
      } else if (result === 'shared') {
        notifySuccess(t('social.shareSuccess'));
      }
    } catch (e) {
      notifyError(t('social.shareFailed'), e instanceof Error ? e.message : undefined);
    }
  };

  const handleUnlock = async (item: RoleMediaItem) => {
    if (!roleId || unlockBusyId) return;
    // Mature gate: without Mature mode → Settings; with mode but stale redaction → refresh.
    if (isMatureMediaLocked(item, canSeeMature) || needsMatureMediaRefresh(item, canSeeMature)) {
      if (!canSeeMature) {
        if (!requireLogin()) return;
        router.push('/settings');
        return;
      }
      mediaCacheClear(roleId);
      setUnlockBusyId(item.media_id);
      try {
        await load('refresh');
      } finally {
        setUnlockBusyId(null);
      }
      return;
    }
    if (!item.locked) return;
    if (!requireLogin()) return;
    if (isRealPersonUnlockGateBlocked(item)) {
      setUnlockGate({
        lockedReason: item.locked_reason,
        requirements: item.unlock_requirements,
      });
      return;
    }
    if (item.locked_reason === GALLERY_PACK_LOCKED_REASON) {
      requestGalleryUnlock();
      return;
    }
    setUnlockBusyId(item.media_id);
    try {
      if (item.bundle_id) {
        const resp = await unlockExploreRoleMediaBundle(roleId, item.bundle_id);
        const unlocked = new Set(resp.media_ids ?? []);
        setMedia((prev) =>
          prev.map((m) =>
            unlocked.has(m.media_id) || m.bundle_id === item.bundle_id
              ? { ...m, locked: false }
              : m,
          ),
        );
      } else {
        const resp = await unlockExploreRoleMedia(roleId, item.media_id);
        setMedia((prev) =>
          prev.map((m) =>
            m.media_id === item.media_id
              ? {
                  ...m,
                  locked: false,
                  file_url:
                    canSeeMature || !isMatureMediaLocked(m, canSeeMature)
                      ? resp.file_url || m.file_url
                      : m.file_url,
                }
              : m,
          ),
        );
      }
      void load('refresh');
    } catch (e) {
      if (isUnlockGateApiError(e)) {
        setUnlockGate({
          lockedReason: item.locked_reason,
          requirements: item.unlock_requirements,
        });
        return;
      }
      notifyError(formatApiError(t, e));
    } finally {
      setUnlockBusyId(null);
    }
  };

  const handleUnlockPostMedia = async (post: PostItem, image: PostImageView) => {
    if (!roleId || unlockBusyId) return;
    if (!requireLogin()) return;
    if (image.locked_reason === MATURE_LOCKED_REASON) {
      if (!canSeeMature) {
        router.push('/settings');
        return;
      }
      mediaCacheClear(roleId);
      const busyKey = `post:${post.post_id}:mature-refresh`;
      setUnlockBusyId(busyKey);
      try {
        await load('refresh');
      } finally {
        setUnlockBusyId(null);
      }
      return;
    }
    if (!image.media_id) return;
    if (isRealPersonUnlockGateBlocked(image)) {
      setUnlockGate({ lockedReason: image.locked_reason });
      return;
    }
    if (image.locked_reason === GALLERY_PACK_LOCKED_REASON) {
      requestGalleryUnlock();
      return;
    }
    const busyKey = `post:${post.post_id}:${image.media_id}`;
    setUnlockBusyId(busyKey);
    try {
      if (image.bundle_id) {
        await unlockExploreRoleMediaBundle(roleId, image.bundle_id);
      } else {
        await unlockExploreRoleMedia(roleId, image.media_id);
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id !== post.post_id
            ? p
            : {
                ...p,
                images: (p.images || []).map((img) =>
                  img.media_id === image.media_id ||
                  (image.bundle_id && img.bundle_id === image.bundle_id)
                    ? { ...img, locked: false, locked_reason: undefined, need_blur: false }
                    : img,
                ),
              },
        ),
      );
      void load('refresh');
    } catch (e) {
      if (isUnlockGateApiError(e)) {
        setUnlockGate({ lockedReason: image.locked_reason });
        return;
      }
      notifyError(formatApiError(t, e));
    } finally {
      setUnlockBusyId(null);
    }
  };

  const openMatureSettings = () => {
    if (!requireLogin()) return;
    router.push('/settings');
  };

  const handleTogglePostLike = async (item: PostItem) => {
    if (likeBusyId) return;
    if (!requireLogin()) {
      notifyWarning(t('social.loginToLike'));
      return;
    }
    setLikeBusyId(item.post_id);
    try {
      const resp = item.liked_by_me
        ? await unlikeCommunityPost(item.post_id)
        : await likeCommunityPost(item.post_id);
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === item.post_id
            ? { ...p, liked_by_me: resp.liked, like_count: resp.like_count }
            : p,
        ),
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setLikeBusyId(null);
    }
  };

  const renderHero = () => {
    const bioBlock = bio ? (
      <View style={styles.bioRow}>
        <Text
          style={[styles.bio, isDesktop && styles.bioDesktop]}
          numberOfLines={bioExpanded ? undefined : BIO_COLLAPSE_LINES}
        >
          {bio}
        </Text>
        {bio.length > 120 ? (
          <Pressable onPress={() => setBioExpanded((v) => !v)} hitSlop={8}>
            <Text style={[styles.readMore, isDesktop && styles.readMoreDesktop]}>
              {bioExpanded ? t('agentMedia.readLess') : t('agentMedia.readMore')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    ) : null;

    if (isDesktop) {
      return (
        <View style={styles.heroDesktop}>
          <View style={styles.heroTop}>
            <View style={styles.identityRow}>
              <DefaultAvatarGlowFrame size={96} verified={Boolean(detail?.verified_real_person)}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={roleId ? `avatar-${roleId}` : undefined}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallbackDesktop]} />
                )}
              </DefaultAvatarGlowFrame>
              <View style={styles.identityTextDesktop}>
                <Text style={styles.name} numberOfLines={2}>
                  {detail?.name?.trim() || '—'}
                </Text>
                <View style={styles.statsRowDesktop}>
                  <View style={styles.statFollowersWrap}>
                    <Text style={styles.statFollowersValue}>{formatCount(followerCount)}</Text>
                    <Text style={styles.statFollowersLabel}>{t('agentMedia.followers')}</Text>
                  </View>
                  <Pressable
                    onPress={() => void handleToggleRoleLike()}
                    disabled={roleLikeBusy}
                    style={({ pressed }) => pressed && { opacity: 0.7 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('agentMedia.likes')}
                  >
                    <Text
                      style={[
                        styles.statTextDesktop,
                        likedByMe && styles.statLiked,
                      ]}
                    >
                      {likedByMe ? '♥' : '♡'} {formatCount(likeCount)}{' '}
                      {t('agentMedia.likes')}
                    </Text>
                  </Pressable>
                  <Text style={styles.statTextDesktop}>
                    {formatCount(photoCount)} {t('agentMedia.photos')}
                  </Text>
                  <Text style={styles.statTextDesktop}>
                    {formatCount(videoCount)} {t('agentMedia.videos')}
                  </Text>
                </View>
                {creatorHandle ? (
                  <Text style={styles.creatorTextDesktop}>
                    {t('agentMedia.creator')}: {creatorHandle}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.actionsCol}>
              {showSafetyActions ? (
                <RoleSafetyActionLinks
                  roleId={roleId}
                  creatorUserId={detail?.creator_user_id}
                  onBlocked={() => safeGoBack('/', router)}
                />
              ) : null}
              <View style={styles.actionsDesktop}>
                <Pressable
                  onPress={handleChat}
                  style={({ pressed }) => [
                    styles.chatBtn,
                    pressed && { backgroundColor: AGENT_MEDIA.chatPressed },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.chatBtnTextDesktop}>{t('agentMedia.chat')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleFollow()}
                  disabled={followBusy}
                  style={({ pressed }) => [
                    styles.followBtn,
                    followedByMe ? styles.followBtnFollowing : styles.followBtnIdleDesktop,
                    pressed && {
                      backgroundColor: followedByMe
                        ? AGENT_MEDIA.followPressed
                        : AGENT_MEDIA.chatPressed,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  {followBusy ? (
                    <ActivityIndicator
                      size="small"
                      color={followedByMe ? '#fff' : '#111'}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.followBtnText,
                        followedByMe ? styles.followBtnTextFollowing : styles.followBtnTextIdle,
                      ]}
                    >
                      {followedByMe ? t('chat.following') : t('chat.follow')}
                    </Text>
                  )}
                </Pressable>
              </View>
              <AgentGiftButton onPress={handleGift} />
            </View>
          </View>

          {(age || gender) ? (
            <View style={styles.metaRow}>
              {age ? (
                <>
                  <Text style={styles.metaLabel}>{t('agentMedia.age')}: </Text>
                  <Text style={styles.metaValue}>{age}</Text>
                </>
              ) : null}
              {age && gender ? <Text style={styles.metaSpacer}>  </Text> : null}
              {gender ? (
                <>
                  <Text style={styles.metaLabel}>{t('agentMedia.gender')}: </Text>
                  <Text style={styles.metaValue}>{gender}</Text>
                </>
              ) : null}
            </View>
          ) : null}

          {bioBlock}
        </View>
      );
    }

    // Mobile — Figma 1114:14
    return (
      <LinearGradient
        colors={[AGENT_MEDIA.heroBgStart, AGENT_MEDIA.heroBgEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.hero, styles.heroMobile]}
      >
        <View style={styles.identityRowMobile}>
          <View
            style={[
              styles.avatarFrame,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
            ]}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={roleId ? `avatar-${roleId}` : undefined}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]} />
            )}
            {detail?.verified_real_person ? (
              <VerifiedRealPersonBadge size={Math.max(16, Math.round(avatarSize * 0.28))} />
            ) : null}
          </View>
          <View style={styles.identityText}>
            <View style={styles.identityTitleRow}>
              <Text style={[styles.name, styles.nameMobile, styles.nameInTitleRow]} numberOfLines={2}>
                {detail?.name?.trim() || '—'}
              </Text>
              {showSafetyActions ? (
                <RoleSafetyActionLinks
                  roleId={roleId}
                  creatorUserId={detail?.creator_user_id}
                  onBlocked={() => safeGoBack('/', router)}
                />
              ) : null}
            </View>
            <View style={styles.statsRow}>
              <Pressable
                onPress={() => void handleToggleRoleLike()}
                disabled={roleLikeBusy}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('agentMedia.likes')}
              >
                <Text style={[styles.statText, likedByMe && styles.statLiked]}>
                  {likedByMe ? '♥' : '♡'} {formatCount(likeCount)}{' '}
                  {t('agentMedia.likes')}
                </Text>
              </Pressable>
              <Text style={styles.statText}>
                {formatCount(photoCount)} {t('agentMedia.photos')}
              </Text>
              <Text style={styles.statText}>
                {formatCount(videoCount)} {t('agentMedia.videos')}
              </Text>
            </View>
            {creatorHandle ? (
              <Text style={styles.creatorText}>
                {t('agentMedia.creator')}: {creatorHandle}
              </Text>
            ) : null}
          </View>
        </View>
        {bioBlock}
        <View style={[styles.actions, styles.actionsMobile]}>
          <Pressable
            onPress={handleChat}
            style={({ pressed }) => [
              styles.chatBtn,
              styles.actionBtnMobile,
              pressed && { backgroundColor: AGENT_MEDIA.chatPressed },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.chatBtnText}>{t('agentMedia.chat')}</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleFollow()}
            disabled={followBusy}
            style={({ pressed }) => [
              styles.followBtn,
              styles.actionBtnMobile,
              followedByMe ? styles.followBtnFollowing : styles.followBtnIdle,
              pressed && { backgroundColor: AGENT_MEDIA.followPressed },
            ]}
            accessibilityRole="button"
          >
            {followBusy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.followBtnText, styles.followBtnTextLight]}>
                {followedByMe ? t('chat.following') : t('chat.follow')}
              </Text>
            )}
          </Pressable>
          <AgentGiftButton onPress={handleGift} inline />
        </View>
      </LinearGradient>
    );
  };

  const renderTabs = () =>
    isDesktop ? (
      <AgentMediaFilterTabs tabs={tabs} activeKey={tab} onChange={setTab} />
    ) : (
      <View style={styles.tabsBlock}>
        <AgentMediaFilterTabs tabs={tabs} activeKey={tab} onChange={setTab} centered />
        <View style={styles.tabsDivider} />
      </View>
    );

  const body = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={AGENT_MEDIA.chatBg} />
        </View>
      );
    }
    if (loadFailed && !detail) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('agentMedia.loadFailed')}</Text>
          <Pressable onPress={() => void load('replace')} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('chat.retry')}</Text>
          </Pressable>
        </View>
      );
    }

    if (tab === 'comments') {
      if (!roleId) {
        return (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('agentMedia.commentsEmpty')}</Text>
          </View>
        );
      }
      return (
        <AgentCommentsPanel
          roleId={roleId}
          isDesktop={isDesktop}
          requireLogin={requireLogin}
          onCommentCountChange={(delta) => {
            setDetail((prev) =>
              prev?.stats
                ? {
                    ...prev,
                    stats: {
                      ...prev.stats,
                      comment_count: Math.max(0, (prev.stats.comment_count ?? 0) + delta),
                    },
                  }
                : prev,
            );
          }}
        />
      );
    }

    if (tab === 'post') {
      if (!posts.length) {
        return (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('agentMedia.emptyPosts')}</Text>
          </View>
        );
      }
      return (
        <View style={styles.postsCol}>
          {posts.map((item, index) => (
            <SocialPostCard
              key={item.post_id}
              item={item}
              showDivider={index < posts.length - 1}
              followedByMe={followedByMe}
              followBusy={followBusy}
              onPressAuthor={() => undefined}
              onToggleLike={(p) => void handleTogglePostLike(p)}
              onToggleFollow={() => void handleFollow()}
              onSharePost={(p) => void handleSharePost(p)}
              onUnlockMedia={(p, img) => void handleUnlockPostMedia(p, img)}
              canSeeMature={canSeeMature}
              unlockBusy={
                unlockBusyId ===
                  `post:${item.post_id}:${item.images?.[0]?.media_id || ''}` ||
                unlockBusyId === `post:${item.post_id}:mature-refresh`
              }
              unlockLabel={t('agentMedia.unlock')}
              unlockMatureLabel={t('agentMedia.unlockMature')}
              revealRLabel={t('agentMedia.revealR')}
              likeBusy={likeBusyId === item.post_id}
              followLabel={t('social.follow')}
              followingLabel={t('social.following')}
              shareLabel={t('social.sharePost')}
              requireLogin={requireLogin}
              commentsTitle={t('social.commentsTitle')}
              commentPlaceholder={t('social.commentPlaceholder')}
              commentSendLabel={t('social.commentSend')}
              commentsEmptyLabel={t('social.commentsEmpty')}
            />
          ))}
        </View>
      );
    }

    if (!filteredMedia.length) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('agentMedia.emptyMedia')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.mediaGrid}>
        {filteredMedia.map((item) => (
          <AgentMediaCard
            key={item.media_id}
            item={item}
            width={cardWidth}
            canSeeMature={canSeeMature}
            unlockLabel={
              isMatureMediaLocked(item, canSeeMature) && !canSeeMature
                ? t('agentMedia.unlockMature')
                : item.locked_reason === GALLERY_PACK_LOCKED_REASON
                  ? t('agentMedia.galleryUnlockCta')
                : item.bundle_id
                  ? t('agentMedia.unlockPack')
                  : t('agentMedia.unlock')
            }
            revealRLabel={t('agentMedia.revealR')}
            unlocking={unlockBusyId === item.media_id}
            onUnlock={() => void handleUnlock(item)}
            onPress={() => setPreviewItem(item)}
          />
        ))}
        {loadingMore ? (
          <View style={[styles.mediaLoadMore, { width: contentWidth }]}>
            <ActivityIndicator color={AGENT_MEDIA.chatBg} />
          </View>
        ) : hasMoreMedia ? (
          <Pressable
            onPress={() => void loadMoreMedia()}
            style={[styles.mediaLoadMoreBtn, { width: contentWidth }]}
            accessibilityRole="button"
          >
            <Text style={styles.mediaLoadMoreText}>{t('agentMedia.loadMore')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <DefaultShell scrollable={false}>
      <View style={[styles.root, { paddingHorizontal: contentPad }, pagePadding]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => safeGoBack('/')}
            style={styles.backBtn}
            accessibilityRole="button"
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={AGENT_MEDIA.text} />
            <Text style={styles.backText}>{t('agentMedia.back')}</Text>
          </Pressable>
        </View>

        <ScrollView
          {...scrollWebProps}
          style={[styles.scroll, scrollWebProps.style]}
          contentContainerStyle={[
            styles.scrollContent,
            (showGalleryUnlockBar || (hasMatureLocked && tab !== 'post' && tab !== 'comments')) && {
              paddingBottom: 96,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={maybeLoadMoreFromScroll}
          onMomentumScrollEnd={maybeLoadMoreFromScroll}
          onScrollEndDrag={maybeLoadMoreFromScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load('refresh');
              }}
              tintColor={AGENT_MEDIA.chatBg}
            />
          }
        >
          {renderHero()}
          {renderTabs()}
          {body()}
        </ScrollView>

        {showGalleryUnlockBar ? (
          <View style={styles.galleryBanner}>
            <Text style={styles.galleryBannerTitle} numberOfLines={2}>
              {t('agentMedia.galleryUnlockTitle').replace(
                '{name}',
                detail?.name?.trim() || 'Agent',
              )}
            </Text>
            <Pressable
              onPress={requestGalleryUnlock}
              disabled={unlockBusyId === 'gallery-all'}
              style={({ pressed }) => [
                styles.galleryBannerBtn,
                pressed && { opacity: 0.88 },
                unlockBusyId === 'gallery-all' && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${t('agentMedia.galleryUnlockCta')} · ${galleryUnlockPrice} Soul`}
            >
              {unlockBusyId === 'gallery-all' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="lock-closed" size={14} color="#fff" />
              )}
              <Text style={styles.galleryBannerBtnText}>{t('agentMedia.galleryUnlockCta')}</Text>
            </Pressable>
          </View>
        ) : hasMatureLocked && tab !== 'post' && tab !== 'comments' ? (
          <View style={styles.matureBanner}>
            <View style={styles.matureBannerTextCol}>
              <Text style={styles.matureBannerTitle}>{t('agentMedia.matureBannerTitle')}</Text>
              <Text style={styles.matureBannerSub}>{t('agentMedia.matureBannerCta')}</Text>
            </View>
            <Pressable
              onPress={openMatureSettings}
              style={({ pressed }) => [styles.matureBannerBtn, pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
            >
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={styles.matureBannerBtnText}>{t('agentMedia.unlockMature')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {roleId ? (
        <AgentGiftSheet
          visible={giftOpen}
          roleId={roleId}
          agentName={detail?.name?.trim()}
          onClose={() => setGiftOpen(false)}
          onSent={handleGiftSent}
        />
      ) : null}

      <AgentMediaPreviewModal
        visible={Boolean(previewItem)}
        item={previewItem}
        items={filteredMedia}
        onClose={() => setPreviewItem(null)}
        closeLabel={t('agentMedia.close')}
        revealRLabel={t('agentMedia.revealR')}
        canSeeMature={canSeeMature}
      />

      {roleId ? (
        <AgentMediaUnlockGateModal
          visible={Boolean(unlockGate)}
          roleId={roleId}
          lockedReason={unlockGate?.lockedReason}
          requirements={unlockGate?.requirements}
          onClose={() => setUnlockGate(null)}
          onChat={() => {
            setUnlockGate(null);
            handleChat();
          }}
          onVip={() => {
            setUnlockGate(null);
            router.push('/vip/shop');
          }}
        />
      ) : null}

      <ThemedGeneralConfirmModal
        visible={galleryConfirmOpen}
        icon="star"
        title={tp('agentMedia.galleryUnlockConfirmTitle', { price: galleryUnlockPrice })}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('agentMedia.galleryUnlockConfirmPay')}
        dismissOnBackdrop={unlockBusyId !== 'gallery-all'}
        loading={unlockBusyId === 'gallery-all'}
        onCancel={() => {
          if (unlockBusyId === 'gallery-all') return;
          setGalleryConfirmOpen(false);
        }}
        onConfirm={() => void handleUnlockGallery()}
      />
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AGENT_MEDIA.pageBg,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: Typo({ color: AGENT_MEDIA.textSecondary, fontSize: 15, fontWeight: '500' }, 'sans'),
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  hero: {
    borderRadius: AGENT_MEDIA.heroRadius,
    borderWidth: 1.4,
    borderColor: AGENT_MEDIA.heroBorder,
    overflow: 'hidden',
  },
  heroMobile: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 18,
    gap: 14,
  },
  /** Original PC hero — unchanged from pre-mobile redesign */
  heroDesktop: {
    backgroundColor: '#12131A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 28,
    paddingVertical: 28,
    gap: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flex: 1,
    minWidth: 240,
  },
  identityRowMobile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    width: '100%',
  },
  avatarFrame: {
    overflow: 'visible',
    position: 'relative',
    flexShrink: 0,
    backgroundColor: AGENT_MEDIA.avatarFallback,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: AGENT_MEDIA.avatarFallback,
  },
  avatarFallbackDesktop: {
    backgroundColor: '#2A1A3A',
  },
  identityText: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingTop: 2,
  },
  identityTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  identityTextDesktop: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  name: Typo({ color: AGENT_MEDIA.text, fontSize: 34, fontWeight: '700', lineHeight: 40 }, 'sans'),
  nameMobile: Typo(
    { color: AGENT_MEDIA.text, fontSize: 22, fontWeight: '700', lineHeight: 28 },
    'sans',
  ),
  nameInTitleRow: {
    flex: 1,
    minWidth: 0,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  statsRowDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 16,
  },
  statFollowersWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginRight: 4,
  },
  statFollowersValue: Typo(
    {
      color: AGENT_MEDIA.text,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 26,
    },
    'sans',
  ),
  statFollowersLabel: Typo(
    {
      color: AGENT_MEDIA.chatBg,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 20,
    },
    'sans',
  ),
  statText: Typo(
    {
      color: AGENT_MEDIA.textSecondary,
      fontSize: 13,
      fontWeight: '400',
      lineHeight: 18,
    },
    'sans',
  ),
  statTextDesktop: Typo(
    { color: AGENT_MEDIA.textSecondary, fontSize: 15, fontWeight: '400' },
    'sans',
  ),
  statLiked: {
    color: AGENT_MEDIA.chatBg,
    fontWeight: '600',
  },
  actionsCol: {
    alignItems: 'stretch',
    gap: 10,
    flexShrink: 0,
    minWidth: 260,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionsDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionsMobile: {
    width: '100%',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 2,
  },
  chatBtn: {
    flex: 1,
    minWidth: 100,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: AGENT_MEDIA.chatBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnMobile: {
    flex: 1,
    minWidth: 0,
    height: 52,
    paddingHorizontal: 10,
  },
  chatBtnText: Typo({ color: '#111', fontSize: 15, fontWeight: '700' }, 'sans'),
  chatBtnTextDesktop: Typo({ color: '#111', fontSize: 16, fontWeight: '700' }, 'sans'),
  followBtn: {
    flex: 1,
    minWidth: 100,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnIdle: {
    backgroundColor: AGENT_MEDIA.followBg,
  },
  followBtnIdleDesktop: {
    backgroundColor: AGENT_MEDIA.chatBg,
  },
  followBtnFollowing: {
    backgroundColor: AGENT_MEDIA.followBg,
  },
  followBtnText: Typo({ fontSize: 15, fontWeight: '600' }, 'sans'),
  followBtnTextIdle: { color: '#111' },
  followBtnTextFollowing: { color: '#fff' },
  followBtnTextLight: { color: '#fff' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaLabel: Typo({ color: AGENT_MEDIA.metaLabel, fontSize: 16, fontWeight: '400' }, 'sans'),
  metaValue: Typo({ color: AGENT_MEDIA.text, fontSize: 16, fontWeight: '500' }, 'sans'),
  metaSpacer: { width: 12 },
  bioRow: {
    gap: 6,
  },
  bio: Typo(
    {
      color: AGENT_MEDIA.bio,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
    },
    'sans',
  ),
  bioDesktop: {
    fontSize: 16,
    lineHeight: 24,
  },
  readMore: Typo(
    {
      color: '#B4B4BB',
      fontSize: 14,
      fontWeight: '400',
      textDecorationLine: 'underline',
      alignSelf: 'flex-end',
    },
    'sans',
  ),
  readMoreDesktop: {
    fontSize: 15,
  },
  creatorText: Typo(
    {
      color: AGENT_MEDIA.creator,
      fontSize: 13,
      fontWeight: '400',
      lineHeight: 18,
    },
    'sans',
  ),
  creatorTextDesktop: Typo(
    {
      color: AGENT_MEDIA.creator,
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 22,
    },
    'sans',
  ),
  tabsBlock: {
    width: '100%',
    gap: 0,
  },
  tabsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AGENT_MEDIA.divider,
    width: '100%',
    marginTop: 2,
    marginBottom: 8,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MEDIA_GAP,
    paddingVertical: 4,
  },
  mediaLoadMore: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaLoadMoreBtn: {
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  mediaLoadMoreText: Typo(
    { color: AGENT_MEDIA.chatBg, fontSize: 15, fontWeight: '600' },
    'sans',
  ),
  postsCol: {
    borderWidth: 1,
    borderColor: AGENT_MEDIA.divider,
    borderRadius: 16,
    overflow: 'hidden',
  },
  center: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: Typo({ color: AGENT_MEDIA.textMuted, fontSize: 15 }, 'sans'),
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AGENT_MEDIA.followBg,
  },
  retryText: Typo({ color: '#fff', fontSize: 14, fontWeight: '600' }, 'sans'),
  galleryBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(28, 28, 32, 0.94)',
  },
  galleryBannerTitle: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  galleryBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FF5C9A',
  },
  galleryBannerBtnText: Typo({ color: '#fff', fontSize: 13, fontWeight: '700' }, 'sans'),
  matureBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(12, 14, 20, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  matureBannerTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  matureBannerTitle: Typo({ color: '#fff', fontSize: 13, fontWeight: '600' }, 'sans'),
  matureBannerSub: Typo({ color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 15 }, 'sans'),
  matureBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: AGENT_MEDIA.chatBg,
  },
  matureBannerBtnText: Typo({ color: '#fff', fontSize: 12, fontWeight: '700' }, 'sans'),
});
