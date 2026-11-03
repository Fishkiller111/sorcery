import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getCommunityFeed,
  getCommunityHot,
  likeCommunityPost,
  unlikeCommunityPost,
  createContentReport,
  blockCommunityUser,
  type ContentReportReason,
} from '../../api/community';
import type { CommunityHotItem } from '../../api/community';
import { followExploreRole, unfollowExploreRole, unlockExploreRoleMedia, unlockExploreRoleMediaBundle } from '../../api/roles';
import { ApiError } from '../../api/client';
import { APP_SITE_URL, resolveStaticUrl } from '../../constants/config';
import { resolveShareOrigin } from '../../utils/shareOrigin';
import { FORUM_ENABLED } from '../../constants/platformFeatures';
import { useI18n } from '../../i18n/I18nContext';
import { useAuthStore } from '../../stores/authStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { copyOrShareText, shareTaskLink } from '../../utils/copyOrShare';
import { formatApiError } from '../../utils/apiError';
import { MATURE_LOCKED_REASON } from '../../utils/mediaDisplay';
import { canUserSeeMature } from '../../utils/agentRatingDisplay';
import { Typo } from '../../theme/typography';
import { hiddenScrollViewProps } from '../../theme/webScrollbar';
import type { CommunityFeedTab, PostImageView, PostItem } from '../../types/api';
import { DefaultShell } from './components/DefaultShell';
import { SocialComposeModal } from './social/SocialComposeModal';
import {
  SocialForumPane,
  type SocialForumPaneHandle,
} from './social/SocialForumPane';
import {
  SocialMobileSearchBar,
  type SocialMobileSearchBarHandle,
} from './social/SocialMobileSearchBar';
import { SocialPostCard } from './social/SocialPostCard';
import { SocialReportReasonModal } from './social/SocialReportReasonModal';
import { SocialRightRail } from './social/SocialRightRail';
import { SOCIAL } from './social/socialTokens';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import {
  SOCIAL_FEED_LOAD_MORE_SENTINEL_ID,
  useWebFeedScroll,
} from './social/useWebFeedScroll';
import { TOKENS } from './theme/tokens';
import { useMobileBottomNavPadding, useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';

type SocialSurface = 'post' | 'forum';

const PAGE_SIZE = 20;
/** Prefetch next page when within this distance of the list bottom. */
const LOAD_MORE_DISTANCE = 480;
/** Feed + right rail only when viewport is wide enough to keep post column spacious. */
const SOCIAL_RAIL_BREAKPOINT = 1100;
/** Search pill + For You / Follow tabs (collapsed chrome height). */
const MOBILE_CHROME_H = 108;
/**
 * Floating glass bottom nav visual height (icons + labels + bar padding).
 * Post FAB sits above this; keep a gap so it never clips into the frosted strip.
 */
const MOBILE_NAV_BAR_H = 80;
const POST_FAB_GAP = 20;
const SCROLL_HIDE_DY = 4;
const SCROLL_SHOW_IDLE_MS = 220;
const CHROME_ANIM_MS = 240;
/** Show back-to-top after scrolling past this offset. */
const BACK_TOP_SHOW_Y = 240;
/** Debounce keyword search before hitting the API. */
const SEARCH_DEBOUNCE_MS = 320;

type TabCache = {
  items: PostItem[];
  page: number;
  totalPages: number;
};

const emptyCache = (): TabCache => ({ items: [], page: 1, totalPages: 1 });

export function DefaultSocialScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const showRightRail = windowWidth >= SOCIAL_RAIL_BREAKPOINT;
  /** Sit Post FAB fully above the floating glass bottom nav. */
  const postFabBottom = useMobileBottomNavPadding(MOBILE_NAV_BAR_H + POST_FAB_GAP);
  /** Clear status bar / Dynamic Island on native. */
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const canSeeMature = canUserSeeMature(user);

  const [surface, setSurface] = useState<SocialSurface>('post');
  const showForumSegment = FORUM_ENABLED;
  const forumActive = showForumSegment && surface === 'forum';
  const [tab, setTab] = useState<CommunityFeedTab>('for_you');
  const [caches, setCaches] = useState<Record<CommunityFeedTab, TabCache>>({
    for_you: emptyCache(),
    following: emptyCache(),
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null);
  const [unlockBusyId, setUnlockBusyId] = useState<string | null>(null);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [followedByRole, setFollowedByRole] = useState<Record<string, boolean>>({});
  const [hotTopics, setHotTopics] = useState<CommunityHotItem[]>([]);
  const [hotLoading, setHotLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<PostItem | null>(null);
  const [blockTarget, setBlockTarget] = useState<PostItem | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchCache, setSearchCache] = useState<TabCache>(emptyCache());
  const [searchLoading, setSearchLoading] = useState(false);
  const [chromeShown, setChromeShown] = useState(true);
  const [showBackTop, setShowBackTop] = useState(false);
  const loadedOnce = useRef<Partial<Record<CommunityFeedTab, boolean>>>({});
  const mobileSearchRef = useRef<SocialMobileSearchBarHandle>(null);
  const chromeAnim = useRef(new Animated.Value(1)).current;
  const backTopAnim = useRef(new Animated.Value(0)).current;
  const chromeVisibleRef = useRef(true);
  const showBackTopRef = useRef(false);
  const lastScrollY = useRef(0);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchReqSeq = useRef(0);
  const loadingMoreRef = useRef(false);
  const refreshingRef = useRef(false);
  const loadFeedRef = useRef<
    ((nextTab: CommunityFeedTab, nextPage: number, mode: 'replace' | 'append') => Promise<void>) | null
  >(null);
  const loadSearchRef = useRef<
    ((q: string, nextPage: number, mode: 'replace' | 'append') => Promise<void>) | null
  >(null);
  const feedMetaRef = useRef({
    tab: 'for_you' as CommunityFeedTab,
    page: 1,
    totalPages: 1,
    loading: true,
    refreshing: false,
    searchActive: false,
    searchQ: '',
  });
  const feedListRef = useRef<FlatList<PostItem> | null>(null);
  const forumPaneRef = useRef<SocialForumPaneHandle | null>(null);

  const searchActive = searchQ.trim().length > 0;
  const current = searchActive ? searchCache : caches[tab];
  const isMobileChrome = !showRightRail;
  const feedScrollHideProps = hiddenScrollViewProps();
  const feedScrollHideStyle = feedScrollHideProps.style as object | undefined;
  refreshingRef.current = refreshing;
  feedMetaRef.current = {
    tab,
    page: current.page,
    totalPages: current.totalPages,
    loading,
    refreshing,
    searchActive,
    searchQ: searchQ.trim(),
  };

  const setChromeVisible = useCallback(
    (visible: boolean) => {
      if (chromeVisibleRef.current === visible) return;
      chromeVisibleRef.current = visible;
      setChromeShown(visible);
      Animated.timing(chromeAnim, {
        toValue: visible ? 1 : 0,
        duration: CHROME_ANIM_MS,
        useNativeDriver: false,
      }).start();
    },
    [chromeAnim],
  );

  const clearScrollIdleTimer = useCallback(() => {
    if (scrollIdleTimer.current) {
      clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = null;
    }
  }, []);

  const scheduleChromeShow = useCallback(() => {
    clearScrollIdleTimer();
    scrollIdleTimer.current = setTimeout(() => {
      setChromeVisible(true);
    }, SCROLL_SHOW_IDLE_MS);
  }, [clearScrollIdleTimer, setChromeVisible]);

  const tryLoadMore = useCallback(async () => {
    const meta = feedMetaRef.current;
    if (meta.refreshing || loadingMoreRef.current) return;
    if (meta.page >= meta.totalPages) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      if (meta.searchActive) {
        const loadSearch = loadSearchRef.current;
        if (!loadSearch) return;
        await loadSearch(meta.searchQ, meta.page + 1, 'append');
      } else {
        const load = loadFeedRef.current;
        if (!load) return;
        await load(meta.tab, meta.page + 1, 'append');
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const onFeedScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const rawY = contentOffset.y;
      const y = Math.max(0, rawY);

      // Load-more for native (and web backup): distance from bottom.
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

      if (!isMobileChrome || searchFocused) return;

      // Keep chrome stable near top / while refreshing — resizing the list mid-gesture
      // interrupts native RefreshControl (feels like the pull was cancelled).
      if (refreshingRef.current || rawY < 72) {
        clearScrollIdleTimer();
        if (!chromeVisibleRef.current) setChromeVisible(true);
        lastScrollY.current = y;
        return;
      }

      const dy = y - lastScrollY.current;
      lastScrollY.current = y;
      if (y > 16 && dy > SCROLL_HIDE_DY) {
        clearScrollIdleTimer();
        setChromeVisible(false);
      }
      scheduleChromeShow();
    },
    [
      clearScrollIdleTimer,
      isMobileChrome,
      scheduleChromeShow,
      searchFocused,
      setChromeVisible,
      tryLoadMore,
    ],
  );

  useEffect(() => {
    Animated.timing(backTopAnim, {
      toValue: showBackTop ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [backTopAnim, showBackTop]);

  const onFeedScrollEnd = useCallback(() => {
    if (!isMobileChrome || searchFocused) return;
    clearScrollIdleTimer();
    setChromeVisible(true);
  }, [clearScrollIdleTimer, isMobileChrome, searchFocused, setChromeVisible]);

  useEffect(() => {
    return () => clearScrollIdleTimer();
  }, [clearScrollIdleTimer]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Re-run keyword search when switching For You / Following while a query is active.
  useEffect(() => {
    const q = searchQ.trim();
    if (!q) return;
    void loadSearch(q, 1, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-search on tab change
  }, [tab]);

  useEffect(() => {
    if (searchFocused) {
      clearScrollIdleTimer();
      setChromeVisible(true);
    }
  }, [clearScrollIdleTimer, searchFocused, setChromeVisible]);

  const filteredItems = current.items;

  const patchCache = useCallback((target: CommunityFeedTab, patch: Partial<TabCache>) => {
    setCaches((prev) => ({
      ...prev,
      [target]: { ...prev[target], ...patch },
    }));
  }, []);

  const applyPageResult = useCallback(
    (
      prev: TabCache,
      nextItems: PostItem[],
      mode: 'replace' | 'append',
      nextPage: number,
      apiTotalPages: number,
    ): TabCache => {
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

  const loadSearch = useCallback(
    async (q: string, nextPage: number, mode: 'replace' | 'append') => {
      const keyword = q.trim();
      if (!keyword) {
        setSearchCache(emptyCache());
        setSearchLoading(false);
        return;
      }
      const seq = ++searchReqSeq.current;
      if (mode === 'replace') setSearchLoading(true);
      try {
        const nextTab = feedMetaRef.current.tab;
        if (nextTab === 'following' && !isLoggedIn) {
          requireLoginForAction(false, router, t('social.loginForFollowing'));
          setTab('for_you');
          return;
        }
        const res = await getCommunityFeed({
          tab: nextTab,
          page: nextPage,
          page_size: PAGE_SIZE,
          q: keyword,
        });
        if (seq !== searchReqSeq.current) return;
        const nextItems = res.items ?? [];
        const page = res.pagination?.page ?? nextPage;
        const apiTotalPages = Math.max(1, res.pagination?.total_pages ?? 1);
        setSearchCache((prev) => applyPageResult(prev, nextItems, mode, page, apiTotalPages));
      } catch (err) {
        if (seq !== searchReqSeq.current) return;
        if (err instanceof ApiError && err.status === 401) {
          requireLoginForAction(false, router, t('social.loginForFollowing'));
          setTab('for_you');
          return;
        }
        notifyError(t('social.loadFailed'), err instanceof Error ? err.message : undefined);
        if (mode === 'replace') setSearchCache(emptyCache());
      } finally {
        if (seq === searchReqSeq.current && mode === 'replace') {
          setSearchLoading(false);
        }
      }
    },
    [applyPageResult, isLoggedIn, router, t],
  );
  loadSearchRef.current = loadSearch;

  const scheduleSearch = useCallback(
    (q: string, immediate = false) => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      const keyword = q.trim();
      if (!keyword) {
        searchReqSeq.current += 1;
        setSearchCache(emptyCache());
        setSearchLoading(false);
        return;
      }
      const run = () => {
        searchDebounceRef.current = null;
        void loadSearch(keyword, 1, 'replace');
      };
      if (immediate) {
        run();
        return;
      }
      searchDebounceRef.current = setTimeout(run, SEARCH_DEBOUNCE_MS);
    },
    [loadSearch],
  );

  const onSearchChange = useCallback(
    (q: string) => {
      setSearchQ(q);
      scheduleSearch(q, false);
    },
    [scheduleSearch],
  );

  const onSearchSubmit = useCallback(
    (q: string) => {
      setSearchQ(q);
      scheduleSearch(q, true);
    },
    [scheduleSearch],
  );

  const loadFeed = useCallback(
    async (nextTab: CommunityFeedTab, nextPage: number, mode: 'replace' | 'append') => {
      try {
        if (nextTab === 'following' && !isLoggedIn) {
          requireLoginForAction(false, router, t('social.loginForFollowing'));
          setTab('for_you');
          return;
        }
        const res = await getCommunityFeed({
          tab: nextTab,
          page: nextPage,
          page_size: PAGE_SIZE,
        });
        const nextItems = res.items ?? [];
        if (nextTab === 'following' && mode === 'replace') {
          setFollowedByRole((prev) => {
            const next = { ...prev };
            for (const it of nextItems) {
              if (it.role_id) next[it.role_id] = true;
            }
            return next;
          });
        }
        setCaches((prev) => {
          const page = res.pagination?.page ?? nextPage;
          const apiTotalPages = Math.max(1, res.pagination?.total_pages ?? 1);
          return {
            ...prev,
            [nextTab]: applyPageResult(prev[nextTab], nextItems, mode, page, apiTotalPages),
          };
        });
        loadedOnce.current[nextTab] = true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          requireLoginForAction(false, router, t('social.loginForFollowing'));
          setTab('for_you');
          return;
        }
        notifyError(t('social.loadFailed'), err instanceof Error ? err.message : undefined);
        if (mode === 'replace') {
          patchCache(nextTab, { items: [], page: 1, totalPages: 1 });
        }
      }
    },
    [applyPageResult, isLoggedIn, patchCache, router, t],
  );
  loadFeedRef.current = loadFeed;

  const loadHot = useCallback(async () => {
    setHotLoading(true);
    try {
      const res = await getCommunityHot();
      setHotTopics(res.items ?? []);
    } catch {
      // keep previous topics on failure; rail shows empty if none
    } finally {
      setHotLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    // Lock chrome open so list height doesn't change under RefreshControl.
    clearScrollIdleTimer();
    setChromeVisible(true);
    setRefreshing(true);
    refreshingRef.current = true;
    try {
      const q = searchQ.trim();
      if (q) {
        await Promise.all([loadSearch(q, 1, 'replace'), loadHot()]);
      } else {
        await Promise.all([loadFeed(tab, 1, 'replace'), loadHot()]);
      }
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [clearScrollIdleTimer, loadFeed, loadHot, loadSearch, searchQ, setChromeVisible, tab]);

  const {
    listRef: webFeedListRef,
    showPullOverlay,
    pullOverlayHeight,
  } = useWebFeedScroll({
    refreshing,
    onRefresh: refresh,
    onNearBottom: tryLoadMore,
    enabled: Platform.OS === 'web',
  });

  const setFeedListRef = useCallback(
    (node: FlatList<PostItem> | null) => {
      feedListRef.current = node;
      webFeedListRef.current = node as unknown as typeof webFeedListRef.current;
    },
    [webFeedListRef],
  );

  const scrollFeedToTop = useCallback(() => {
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    showBackTopRef.current = false;
    setShowBackTop(false);
  }, []);

  const onFeedMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onFeedScrollEnd();
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distance =
        contentSize.height - layoutMeasurement.height - Math.max(0, contentOffset.y);
      if (layoutMeasurement.height > 0 && distance < LOAD_MORE_DISTANCE) {
        void tryLoadMore();
      }
    },
    [onFeedScrollEnd, tryLoadMore],
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const needFetch = !loadedOnce.current[tab];
        if (needFetch) setLoading(true);
        await Promise.all([loadFeed(tab, 1, 'replace'), loadHot()]);
        if (alive) setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [loadFeed, loadHot, tab]),
  );

  const dismissMobileSearch = useCallback(() => {
    mobileSearchRef.current?.dismiss();
  }, []);

  const onChangeTab = (next: CommunityFeedTab) => {
    if (next === tab) return;
    if (next === 'following' && !isLoggedIn) {
      requireLoginForAction(false, router, t('social.loginForFollowing'));
      return;
    }
    dismissMobileSearch();
    showBackTopRef.current = false;
    setShowBackTop(false);
    setTab(next);
    if (!searchQ.trim() && !loadedOnce.current[next]) setLoading(true);
  };

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
      // Mature already on — stale feed payload; reload current tab.
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
      setCaches((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as CommunityFeedTab[]) {
          next[key] = {
            ...next[key],
            items: next[key].items.map((p) => {
              if (p.post_id !== item.post_id) return p;
              return {
                ...p,
                images: (p.images || []).map((img) =>
                  img.media_id === image.media_id ||
                  (image.bundle_id && img.bundle_id === image.bundle_id)
                    ? {
                        ...img,
                        locked: false,
                        locked_reason: undefined,
                        need_blur: false,
                      }
                    : img,
                ),
              };
            }),
          };
        }
        return next;
      });
      setSearchCache((prev) => ({
        ...prev,
        items: prev.items.map((p) => {
          if (p.post_id !== item.post_id) return p;
          return {
            ...p,
            images: (p.images || []).map((img) =>
              img.media_id === image.media_id ||
              (image.bundle_id && img.bundle_id === image.bundle_id)
                ? {
                    ...img,
                    locked: false,
                    locked_reason: undefined,
                    need_blur: false,
                  }
                : img,
            ),
          };
        }),
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
    const apply = (list: PostItem[], next: Partial<PostItem>) =>
      list.map((p) => (p.post_id === item.post_id ? { ...p, ...next } : p));

    setCaches((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        items: apply(prev[tab].items, {
          liked_by_me: !liked,
          like_count: Math.max(0, item.like_count + (liked ? -1 : 1)),
        }),
      },
    }));
    if (searchActive) {
      setSearchCache((prev) => ({
        ...prev,
        items: apply(prev.items, {
          liked_by_me: !liked,
          like_count: Math.max(0, item.like_count + (liked ? -1 : 1)),
        }),
      }));
    }

    try {
      const res = liked
        ? await unlikeCommunityPost(item.post_id)
        : await likeCommunityPost(item.post_id);
      setCaches((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          items: apply(prev[tab].items, {
            liked_by_me: res.liked,
            like_count: res.like_count,
          }),
        },
      }));
      if (searchActive) {
        setSearchCache((prev) => ({
          ...prev,
          items: apply(prev.items, {
            liked_by_me: res.liked,
            like_count: res.like_count,
          }),
        }));
      }
    } catch (err) {
      setCaches((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          items: apply(prev[tab].items, item),
        },
      }));
      if (searchActive) {
        setSearchCache((prev) => ({
          ...prev,
          items: apply(prev.items, item),
        }));
      }
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
      // iOS：优先带 url 的系统分享；失败再回落纯文本
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
    const item = reportTarget;
    setReportTarget(null);
    if (!item) return;
    try {
      await createContentReport({
        target_type: 'post',
        target_id: item.post_id,
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
    const item = blockTarget;
    setBlockTarget(null);
    if (!item) return;
    try {
      const resp = await blockCommunityUser({
        user_id: item.author_user_id || undefined,
        post_id: item.post_id,
        reason_code: 'harassment',
      });
      const blockedRoleId = resp.blocked_role_id || '';
      const blockedUserId = resp.blocked_user_id || item.author_user_id || '';
      const keepPost = (p: PostItem) => {
        if (blockedRoleId && p.role_id === blockedRoleId) return false;
        if (!blockedRoleId && blockedUserId && p.author_user_id === blockedUserId) return false;
        return true;
      };
      // Instantly remove blocked author/agent posts from local feed.
      setCaches((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as CommunityFeedTab[]) {
          const cache = next[key];
          next[key] = {
            ...cache,
            items: (cache.items || []).filter(keepPost),
          };
        }
        return next;
      });
      setSearchCache((prev) => ({
        ...prev,
        items: (prev.items || []).filter(keepPost),
      }));
      notifySuccess(t('social.blockOk'));
    } catch (err) {
      notifyError(t('social.blockFailed'), formatApiError(t, err));
    }
  };

  const onEndReached = () => {
    void tryLoadMore();
  };

  const openCompose = () => {
    if (forumActive) {
      forumPaneRef.current?.openCompose();
      return;
    }
    if (!requireLoginForAction(isLoggedIn, router, t('social.loginToPost'))) return;
    setComposeOpen(true);
  };

  const onChangeSurface = (next: SocialSurface) => {
    if (next === surface) return;
    setSurface(next);
    showBackTopRef.current = false;
    setShowBackTop(false);
    if (next === 'post') {
      setChromeVisible(true);
    }
  };

  const onComposePosted = () => {
    loadedOnce.current[tab] = false;
    void refresh();
  };

  const avatarUri = user?.avatar_url ? resolveStaticUrl(user.avatar_url) : null;
  const userDisplayName = user?.nickname?.trim() || user?.email?.trim() || '';
  const showInitialLoader =
    (searchActive ? searchLoading : loading) && filteredItems.length === 0;

  const surfaceSegment = showForumSegment ? (
    <View
      style={[styles.surfaceSegment, isMobileChrome && styles.surfaceSegmentMobile]}
      accessibilityRole="tablist"
    >
      {(
        [
          { key: 'post' as const, label: t('social.segmentPost') },
          { key: 'forum' as const, label: t('social.segmentForum') },
        ] as const
      ).map((item) => {
        const active = surface === item.key;
        return (
          <Pressable
            key={item.key}
            style={[styles.surfaceTab, active && styles.surfaceTabActive]}
            onPress={() => onChangeSurface(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.surfaceTabLabel, active && styles.surfaceTabLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const tabs = (
    <View
      style={[styles.tabs, isMobileChrome && styles.tabsMobile]}
      accessibilityRole="tablist"
    >
      {(
        [
          { key: 'for_you' as const, label: t('social.tabForYou') },
          { key: 'following' as const, label: t('social.tabFollow') },
        ] as const
      ).map((item) => {
        const active = tab === item.key;
        return (
          <Pressable
            key={item.key}
            style={styles.tab}
            onPress={() => onChangeTab(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.tabLabel,
                isMobileChrome && styles.tabLabelMobile,
                active && styles.tabLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <DefaultShell scrollable={false}>
      <View
        style={[
          styles.root,
          isMobileChrome && styles.rootMobile,
          isMobileChrome
            ? {
                paddingTop:
                  (typeof pageContentPadding.paddingTop === 'number'
                    ? pageContentPadding.paddingTop
                    : 0) + 8,
              }
            : pageContentPadding,
          showRightRail && styles.rootDesktop,
        ]}
      >
        <View style={[styles.feedCol, isMobileChrome && styles.feedColMobile]}>
          {surfaceSegment}

          {forumActive ? (
            <SocialForumPane ref={forumPaneRef} isMobileChrome={isMobileChrome} />
          ) : (
            <>
          {isMobileChrome ? (
            <Animated.View
              style={[
                styles.mobileChromeSlot,
                {
                  opacity: chromeAnim,
                  maxHeight: chromeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, MOBILE_CHROME_H],
                  }),
                  marginBottom: chromeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 8],
                  }),
                  transform: [
                    {
                      translateY: chromeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-16, 0],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents={searchFocused || chromeShown ? 'auto' : 'none'}
            >
              <SocialMobileSearchBar
                ref={mobileSearchRef}
                placeholder={t('social.searchPlaceholder')}
                hotTitle={t('social.hotSearchTitle')}
                hotEmptyLabel={t('social.hotSearchEmpty')}
                hotTopics={hotTopics}
                hotLoading={hotLoading}
                value={searchQ}
                onChangeText={onSearchChange}
                onSubmit={onSearchSubmit}
                onFocusChange={setSearchFocused}
              />
              {tabs}
              <View style={styles.tabDivider} />
            </Animated.View>
          ) : null}

          {/* Figma 596:64 — bordered feed panel contains tabs + posts */}
          <View style={[styles.feedPanel, isMobileChrome && styles.feedPanelMobile]}>
            {!isMobileChrome ? (
              <>
                {tabs}
                <View style={styles.tabDivider} />
              </>
            ) : null}

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
                  key={searchActive ? `search:${tab}` : tab}
                  data={filteredItems}
                  keyExtractor={(item) => item.post_id}
                  style={[styles.list, Platform.OS === 'web' ? feedScrollHideStyle : null]}
                  contentContainerStyle={[
                    styles.listContent,
                    filteredItems.length === 0 && styles.listContentEmpty,
                  ]}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={onFeedScroll}
                  onScrollEndDrag={onFeedScrollEnd}
                  onMomentumScrollEnd={onFeedMomentumEnd}
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
                  onEndReached={onEndReached}
                  onEndReachedThreshold={isMobileChrome ? 0.5 : 0.25}
                  ListEmptyComponent={
                    <View style={styles.centerState}>
                      <Text style={styles.emptyText}>
                        {searchQ.trim() ? t('social.searchEmpty') : t('social.empty')}
                      </Text>
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
                      showDivider={index < filteredItems.length - 1}
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
                        unlockBusyId ===
                        `${item.post_id}:${item.images?.[0]?.media_id || ''}`
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
                    />
                  )}
                />
              </View>
            )}
          </View>
            </>
          )}
        </View>

        {showRightRail ? (
          <SocialRightRail
            searchPlaceholder={t('social.searchPlaceholder')}
            searchValue={searchQ}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            postLabel={t('social.post')}
            composeHint={userDisplayName || t('social.composePersonalLabel')}
            avatarUri={avatarUri}
            hotTopics={hotTopics}
            hotLoading={hotLoading}
            hotEmptyLabel={t('social.hotSearchEmpty')}
            onPostPress={openCompose}
          />
        ) : forumActive ? null : (
          <>
            <Animated.View
              pointerEvents={searchFocused ? 'none' : chromeShown ? 'box-none' : 'none'}
              style={[
                styles.mobilePostFabWrap,
                {
                  bottom: postFabBottom,
                  opacity: chromeAnim,
                  transform: [
                    {
                      translateY: chromeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 0],
                      }),
                    },
                    {
                      scale: chromeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [styles.mobilePostFab, pressed && styles.mobilePostFabPressed]}
                onPress={openCompose}
              >
                <Text style={styles.mobilePostFabText}>{t('social.post')}</Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              pointerEvents={searchFocused || !showBackTop ? 'none' : 'box-none'}
              style={[
                styles.mobileBackTopWrap,
                {
                  bottom: postFabBottom,
                  opacity: backTopAnim,
                  transform: [
                    {
                      translateY: backTopAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                    {
                      scale: backTopAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
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
        )}

        {!forumActive ? (
          <SocialComposeModal
            visible={composeOpen}
            onClose={() => setComposeOpen(false)}
            onPosted={onComposePosted}
            userAvatarUri={avatarUri}
            userDisplayName={userDisplayName}
          />
        ) : null}

        {!forumActive ? (
          <>
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
          </>
        ) : null}
      </View>
    </DefaultShell>
  );
}

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
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'web' ? 16 : 8,
    width: '100%',
  },
  rootMobile: {
    paddingHorizontal: 4,
    /** Top inset comes from pageContentPadding (safe area); keep a small gap below it. */
    paddingTop: 0,
  },
  rootDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 40,
    width: '100%',
    alignSelf: 'stretch',
    paddingLeft: 0,
    paddingRight: 0,
  },
  feedCol: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    paddingRight: 8,
  },
  feedColMobile: {
    paddingRight: 0,
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
    /** Web: contain list scroll. Native: visible so RefreshControl spinner isn't clipped. */
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
    ...glass,
  },
  feedPanelMobile: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    overflow: 'visible',
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
  mobileChromeSlot: {
    overflow: 'visible',
    zIndex: 40,
    elevation: 40,
    gap: 4,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 64,
    paddingTop: 18,
    paddingBottom: 14,
  },
  tabsMobile: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  surfaceSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  surfaceSegmentMobile: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  surfaceTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  surfaceTabActive: {
    borderColor: SOCIAL.divider,
    backgroundColor: 'rgba(242, 242, 244, 0.06)',
  },
  surfaceTabLabel: Typo(
    {
      color: SOCIAL.tabInactive,
      fontSize: 15,
      fontWeight: '600',
    },
    'sans',
  ),
  surfaceTabLabelActive: {
    color: SOCIAL.tabActive,
  },
  tab: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tabLabel: Typo(
    {
      color: SOCIAL.tabInactive,
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    'serif',
  ),
  tabLabelMobile: {
    fontSize: 18,
  },
  tabLabelActive: {
    color: SOCIAL.tabActive,
  },
  tabDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
    backgroundColor: SOCIAL.divider,
  },
  listContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyText: Typo(
    {
      color: SOCIAL.action,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 22,
    },
    'sans',
  ),
  mobilePostFabWrap: {
    position: 'absolute',
    left: 20,
    /** bottom set inline — clears floating DefaultBottomNav */
    zIndex: 120,
  },
  mobilePostFab: {
    backgroundColor: SOCIAL.postBtn,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mobilePostFabPressed: {
    backgroundColor: SOCIAL.postBtnPressed,
    transform: [{ scale: 0.98 }],
  },
  mobilePostFabText: Typo(
    {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  mobileBackTopWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 120,
  },
  mobileBackTopFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 30, 40, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mobileBackTopFabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
