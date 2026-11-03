import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  RefreshControl,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { RoleGridContainer } from '../../components/agent/RoleGridContainer';
import { useRoleGridLayout } from '../../hooks/useRoleGridLayout';
import { useExploreRolesFeed } from '../../hooks/useExploreRolesFeed';
import { listAllRoles, listExploreCategories, recordRoleView } from '../../api/roles';
import { fetchLiveCampaigns } from '../../api/campaigns';
import { fetchLiveContests } from '../../api/contests';
import type { CampaignListItem, ContestListItem, ExploreRoleCategory, ExploreRoleItem, RoleItem, UserGender } from '../../types/api';
import { resolveRoleCategoryName, ROLE_CATEGORY_HISTORY_ID, sortRoleCategories } from '../../utils/roleCategory';
import {
  collectRoleCategories,
  computeCardWidth,
  filterRoles,
} from '../../utils/roleGrid';
import { useAuthStore } from '../../stores/authStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { ThemedAgentDetailModal } from '../../components/ui/ThemedAgentDetailModal';
import { MatureConfirmModal } from '../../components/settings/MatureConfirmModal';
import { DefaultShell } from './components/DefaultShell';
import { DefaultFilterChip } from './components/DefaultFilterChip';
import { DefaultR18FilterChip } from './components/DefaultR18FilterChip';
import { DefaultLanguageChip } from './components/DefaultLanguageChip';
import { DefaultOrientationChip } from './components/DefaultOrientationChip';
import { DefaultExploreRoleCard } from './components/DefaultExploreRoleCard';
import { DefaultSwipeRoleDeck } from './components/DefaultSwipeRoleDeck';
import { DefaultDailyTasksModal } from './components/DefaultDailyTasksModal';
import { DefaultCampaignBanner, type HomeBannerSlide } from './components/DefaultCampaignBanner';
import { TOKENS } from './theme/tokens';
import {
  useMobileBottomNavPadding,
  useMobilePageContentPaddingStyle,
} from '../../hooks/useMobileSafeAreaPadding';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { compareHomeAgentRank, keepExploreRoleForCatalog, type HomeAgentRankRow } from '../../utils/homeAgentRank';
import { loadMatureSettings, saveMatureSettings } from '../../engine/flagStore';
import { setLocalMatureOptIn } from '../../utils/matureOptIn';
import { updateUser } from '../../api/user';
import { ApiError } from '../../api/client';
import { PRIMARY_SCENE_ID } from '../../constants/scene';
import { MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT } from '../../constants/layout';
import { themedScrollViewProps } from '../../theme/webScrollbar';

const H_PADDING = TOKENS.layout.contentPadding;
const HOME_MOBILE_H_PADDING = 12;
const HOME_MIN_CARD_WIDTH = 148;
const HOME_MOBILE_COLUMNS = 2;
const HOME_GRID_GAP = 8;
const SCROLL_LOAD_THRESHOLD = 280;
const BACK_TOP_SHOW_Y = 420;
const BACK_TOP_FAB_GAP = 16;
const MOBILE_NAV_BAR_H = MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT;

function roleItemToExploreRole(item: RoleItem): ExploreRoleItem {
  return {
    id: item.id,
    name: item.name,
    avatar_url: item.avatar_url,
    figure_url: item.figure_url,
    preview_video_url_r: item.preview_video_url_r,
    preview_video_url_mature: item.preview_video_url_mature,
    introduction: item.introduction || item.scene_name || '',
    attributes: item.attributes,
    supported_langs: item.supported_langs,
    categories: item.categories,
    has_chat_history: item.has_chat_history,
    view_count: item.view_count ?? 0,
    like_count: item.like_count ?? 0,
    comment_count: item.comment_count ?? 0,
    media_count: item.media_count ?? 0,
    gift_points_total: item.gift_points_total ?? 0,
    content_rating: item.content_rating,
    source: item.source,
    official_subtype: item.official_subtype,
    verified_real_person: item.verified_real_person,
    published_at: item.published_at,
  };
}

/** users.gender is「性取向」: male/female means prefer that agent gender. */
function preferredAgentGenderFromOrientation(userGender?: string | null): 'male' | 'female' | '' {
  const g = (userGender || '').trim().toLowerCase();
  if (g === 'male' || g === 'female') return g;
  return '';
}

export function DefaultHomeScreen() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const user = useAuthStore((s) => s.user);
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const backTopBottom = useMobileBottomNavPadding(MOBILE_NAV_BAR_H + BACK_TOP_FAB_GAP);
  /** 悬浮底栏盖住内容区，滑动卡底部需预留同等高度。 */
  const mobileDeckBottomPad = useMobileBottomNavPadding(MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT);
  const homeHPadding = isDesktop ? H_PADDING : HOME_MOBILE_H_PADDING;
  const {
    numColumns: autoColumns,
    cardWidth: autoCardWidth,
    availableWidth,
    gap,
  } = useRoleGridLayout(homeHPadding, {
    minCardWidth: HOME_MIN_CARD_WIDTH,
    maxColumns: isDesktop ? undefined : HOME_MOBILE_COLUMNS,
    gap: HOME_GRID_GAP,
  });
  const numColumns = isDesktop ? autoColumns : HOME_MOBILE_COLUMNS;
  const cardWidth = isDesktop
    ? autoCardWidth
    : computeCardWidth(availableWidth, HOME_MOBILE_COLUMNS, gap);

  const scrollRef = useRef<ScrollView>(null);
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const showBackTopRef = useRef(false);
  const backTopAnim = useRef(new Animated.Value(0)).current;
  /** 触底加载时保留已展示顺序，避免整表重排导致跳动 */
  const stableHomeCardsRef = useRef<ExploreRoleItem[]>([]);
  const homeRankKeyRef = useRef('');

  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<ExploreRoleCategory[]>([]);
  const [selectedExploreRole, setSelectedExploreRole] = useState<ExploreRoleItem | null>(null);
  const [selectedLibraryRole, setSelectedLibraryRole] = useState<RoleItem | null>(null);
  const [dailyTasksVisible, setDailyTasksVisible] = useState(false);
  const [confirmMature, setConfirmMature] = useState(false);
  const [matureFilterOn, setMatureFilterOn] = useState(false);
  const [savingGender, setSavingGender] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  /** 移动端：滑动卡 / 网格 */
  const [mobileLayout, setMobileLayout] = useState<'deck' | 'grid'>('deck');

  // PC：不提供「聊过」筛选；若残留该 categoryId 则清掉
  useEffect(() => {
    if (isDesktop && categoryId === ROLE_CATEGORY_HISTORY_ID) {
      setCategoryId('');
    }
  }, [isDesktop, categoryId]);

  const [libraryRoles, setLibraryRoles] = useState<RoleItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [contests, setContests] = useState<ContestListItem[]>([]);

  const {
    roles: exploreRoles,
    hasChattedRoles,
    loading: exploreLoading,
    loadingMore,
    hasMore: exploreHasMore,
    refreshing,
    loadMore,
    refresh,
  } = useExploreRolesFeed({
    q: '',
    categoryId,
    excludeMature: !matureFilterOn,
  });

  const exploreDisplayCategories = useMemo(() => {
    const base = sortRoleCategories(
      categories.map((cat) => ({
        ...cat,
        name: resolveRoleCategoryName(cat.category_id, cat.name, t),
      })),
    );
    if (!hasChattedRoles) return base;
    return [
      { category_id: ROLE_CATEGORY_HISTORY_ID, name: t('explore.categoryHistory') },
      ...base,
    ];
  }, [categories, hasChattedRoles, t]);

  const nonOwnerRoles = useMemo(
    () => libraryRoles.filter((role) => role.is_owner !== true),
    [libraryRoles],
  );

  const libraryCategories = useMemo(
    () => collectRoleCategories(nonOwnerRoles, t),
    [nonOwnerRoles, t],
  );

  const unifiedCategories = useMemo(() => {
    const map = new Map<string, ExploreRoleCategory>();
    for (const cat of [...exploreDisplayCategories, ...libraryCategories]) {
      if (cat.category_id) map.set(cat.category_id, cat);
    }
    return Array.from(map.values());
  }, [exploreDisplayCategories, libraryCategories]);

  const filteredLibraryRoles = useMemo(
    () => filterRoles(nonOwnerRoles, '', categoryId),
    [nonOwnerRoles, categoryId],
  );

  const libraryOnlyRoles = useMemo(() => {
    const exploreIds = new Set(exploreRoles.map((r) => r.id));
    return filteredLibraryRoles.filter((r) => !exploreIds.has(r.id));
  }, [exploreRoles, filteredLibraryRoles]);

  const libraryExploreCards = useMemo(() => {
    if (categoryId === ROLE_CATEGORY_HISTORY_ID) return [];
    return libraryOnlyRoles.map(roleItemToExploreRole);
  }, [categoryId, libraryOnlyRoles]);

  const visibleExploreRoles = useMemo(() => {
    return exploreRoles.filter((item) => keepExploreRoleForCatalog(item, matureFilterOn));
  }, [exploreRoles, matureFilterOn]);

  const visibleLibraryExploreCards = useMemo(() => {
    return libraryExploreCards.filter((item) => keepExploreRoleForCatalog(item, matureFilterOn));
  }, [libraryExploreCards, matureFilterOn]);

  const homeAgentCards = useMemo(() => {
    const preferred = preferredAgentGenderFromOrientation(user?.gender);
    const rankKey = `${matureFilterOn ? 1 : 0}|${categoryId}|${preferred}|${lang}`;
    if (homeRankKeyRef.current !== rankKey) {
      homeRankKeyRef.current = rankKey;
      stableHomeCardsRef.current = [];
    }
    const ranked: HomeAgentRankRow[] = [
      ...visibleExploreRoles.map((item, index) => ({
        item,
        index,
        isOfficial: (item.source || '').toLowerCase() === 'official',
      })),
      ...visibleLibraryExploreCards.map((item, index) => ({
        item,
        index: 100_000 + index,
        isOfficial: true,
      })),
    ];
    const nextById = new Map(ranked.map((row) => [row.item.id, row]));
    const prev = stableHomeCardsRef.current;
    // 仅当上一屏卡片全部仍在新集合中时视为「追加」；刷新/筛选会丢项 → 全量重排
    const isAppend =
      prev.length > 0 && prev.every((item) => nextById.has(item.id));

    let result: ExploreRoleItem[];
    if (!isAppend) {
      ranked.sort((a, b) => compareHomeAgentRank(a, b, preferred, matureFilterOn));
      result = ranked.map((row) => row.item);
    } else {
      const prevIds = new Set(prev.map((item) => item.id));
      // 沿用已展示顺序，并刷新为最新 item 数据
      const kept = prev
        .filter((item) => nextById.has(item.id))
        .map((item) => nextById.get(item.id)!.item);
      const newcomers = ranked
        .filter((row) => !prevIds.has(row.item.id))
        .sort((a, b) => compareHomeAgentRank(a, b, preferred, matureFilterOn))
        .map((row) => row.item);
      result = [...kept, ...newcomers];
    }

    stableHomeCardsRef.current = result;
    return result;
  }, [visibleExploreRoles, visibleLibraryExploreCards, user?.gender, matureFilterOn, categoryId, lang]);

  const libraryCardIds = useMemo(
    () => new Set(visibleLibraryExploreCards.map((item) => item.id)),
    [visibleLibraryExploreCards],
  );

  useEffect(() => {
    let mounted = true;
    async function syncMatureFilter() {
      if (Platform.OS === 'ios') {
        // App Store: no R18 toggle; always standard catalog.
        setLocalMatureOptIn(false);
        if (mounted) setMatureFilterOn(false);
        return;
      }
      if (isLoggedIn && user?.content_tier) {
        if (mounted) setMatureFilterOn(user.content_tier === 'mature');
        return;
      }
      const settings = await loadMatureSettings(PRIMARY_SCENE_ID);
      if (mounted) setMatureFilterOn(settings.enabled);
    }
    void syncMatureFilter();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user?.content_tier]);

  const syncContentTier = useCallback(
    async (mature: boolean) => {
      if (Platform.OS === 'ios') {
        setLocalMatureOptIn(false);
        setMatureFilterOn(false);
        return;
      }
      await saveMatureSettings(PRIMARY_SCENE_ID, mature, true);
      setLocalMatureOptIn(mature);
      setMatureFilterOn(mature);
      if (!isLoggedIn) return;
      try {
        const updated = await updateUser({ content_tier: mature ? 'mature' : 'standard' });
        useAuthStore.setState({ user: updated });
      } catch (err) {
        if (err instanceof ApiError && err.code === 'VIP_010') {
          notifyWarning(t('settings.matureVipRequired'));
        } else {
          notifyError(t('settings.saveFailed'));
        }
        await saveMatureSettings(PRIMARY_SCENE_ID, false, true);
        setLocalMatureOptIn(false);
        setMatureFilterOn(false);
      }
    },
    [isLoggedIn, t],
  );

  const onToggleMatureFilter = useCallback(() => {
    if (Platform.OS === 'ios') return;
    if (matureFilterOn) {
      void syncContentTier(false);
      return;
    }
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    if (user?.vip && !user.vip.permissions.mature_mode) {
      notifyWarning(t('settings.matureVipRequired'));
      return;
    }
    setConfirmMature(true);
  }, [isLoggedIn, matureFilterOn, router, syncContentTier, t, user?.vip]);

  const saveOrientation = useCallback(
    async (gender: UserGender, genderCustom: string) => {
      if (!isLoggedIn || savingGender) return;
      setSavingGender(true);
      try {
        const updated = await updateUser({ gender, gender_custom: genderCustom });
        useAuthStore.setState({ user: updated });
        notifySuccess(t('settings.saved'));
      } catch {
        notifyError(t('settings.saveFailed'));
      } finally {
        setSavingGender(false);
      }
    },
    [isLoggedIn, savingGender, t],
  );

  useEffect(() => {
    void listExploreCategories()
      .then((resp) => setCategories(resp.items ?? []))
      .catch(() => setCategories([]));
  }, []);

  const loadLibrary = useCallback(async () => {
    if (!isRestored) return;
    // 访客无私人库；探索列表已由 useExploreRolesFeed 按 20 条分页。
    // 若再预拉 page_size=50 并入网格，会与第 2/3 页 id 重叠，触底看似“没追加”。
    if (!isLoggedIn) {
      setLibraryRoles([]);
      return;
    }
    try {
      const rolesResp = await listAllRoles();
      setLibraryRoles(rolesResp);
    } catch {
      setLibraryRoles([]);
    }
  }, [isLoggedIn, isRestored, lang]);

  const loadCampaigns = useCallback(async () => {
    try {
      const [campResp, contestResp] = await Promise.all([
        fetchLiveCampaigns(),
        fetchLiveContests(),
      ]);
      setCampaigns(campResp.items ?? []);
      setContests(contestResp.items ?? []);
    } catch {
      setCampaigns([]);
      setContests([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLibrary();
      void loadCampaigns();
    }, [loadLibrary, loadCampaigns]),
  );

  const onOpenExploreRole = useCallback(
    (id: string) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      const fromExplore = exploreRoles.find((r) => r.id === id) ?? null;
      if (fromExplore) {
        setSelectedExploreRole(fromExplore);
        setSelectedLibraryRole(null);
        return;
      }
      const fromLibrary = nonOwnerRoles.find((r) => r.id === id) ?? null;
      setSelectedLibraryRole(fromLibrary);
      setSelectedExploreRole(null);
    },
    [exploreRoles, isLoggedIn, nonOwnerRoles, router, t],
  );

  const onMatureLockedAgent = useCallback(() => {
    notifyWarning(t('agentMedia.matureLocked'), t('agentMedia.matureBannerCta'));
    router.push('/settings' as never);
  }, [router, t]);

  const handleCloseDetail = useCallback(() => {
    setSelectedExploreRole(null);
    setSelectedLibraryRole(null);
  }, []);

  const handleStartChat = useCallback(
    async (roleId: string) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      setSelectedExploreRole(null);
      setSelectedLibraryRole(null);
      try {
        await recordRoleView(roleId, 'chat');
      } catch {
        // non-fatal
      }
      router.push(`/free-chat/${roleId}`);
    },
    [isLoggedIn, router, t],
  );

  const handleSwipeLike = useCallback(
    (roleId: string) => {
      void handleStartChat(roleId);
    },
    [handleStartChat],
  );

  const onBeforeSwipeLike = useCallback(
    () => requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing')),
    [isLoggedIn, router, t],
  );

  const handleViewMedia = useCallback(
    (roleId: string) => {
      setSelectedExploreRole(null);
      setSelectedLibraryRole(null);
      router.push(`/agent/${roleId}/media` as never);
    },
    [router],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = Math.max(0, event.nativeEvent.contentOffset.y);
      const nextBackTop = y > BACK_TOP_SHOW_Y;
      if (nextBackTop !== showBackTopRef.current) {
        showBackTopRef.current = nextBackTop;
        setShowBackTop(nextBackTop);
      }

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y < contentSize.height - SCROLL_LOAD_THRESHOLD) {
        return;
      }
      if (exploreHasMore) void loadMore();
    },
    [exploreHasMore, loadMore],
  );

  useEffect(() => {
    Animated.timing(backTopAnim, {
      toValue: showBackTop ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [backTopAnim, showBackTop]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    showBackTopRef.current = false;
    setShowBackTop(false);
  }, []);

  const onOpenDailyTasks = useCallback(() => {
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    setDailyTasksVisible(true);
  }, [isLoggedIn, router, t]);

  const onNearEnd = useCallback(() => {
    if (exploreHasMore) void loadMore();
  }, [exploreHasMore, loadMore]);

  const agentsLoading = exploreLoading && exploreRoles.length === 0;
  const showExploreEmpty = !agentsLoading && !refreshing && homeAgentCards.length === 0;

  const filterBar = (
    <View style={styles.filterBar}>
      {/* 滑动卡模式：收起分类条，只留 R18；网格 / 桌面仍显示全部分类 */}
      {isDesktop || mobileLayout === 'grid' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <DefaultFilterChip
            label={t('explore.allCategories')}
            active={!categoryId}
            variant="accent"
            onPress={() => setCategoryId('')}
          />
          <DefaultFilterChip
            label={t('dailyTasks.chipLabel')}
            active={false}
            variant="theme"
            onPress={onOpenDailyTasks}
          />
          {unifiedCategories.map((cat) => {
            const isHistory = cat.category_id === ROLE_CATEGORY_HISTORY_ID;
            // PC：不展示「聊过」——历史会话改由侧栏 Chat 进入
            if (isDesktop && isHistory) return null;
            const active = categoryId === cat.category_id;
            return (
              <DefaultFilterChip
                key={cat.category_id}
                label={cat.name}
                active={active}
                // 聊过：淡金变体，区别于「全部」红 /「每日任务」蓝
                variant={isHistory ? 'history' : 'default'}
                onPress={() => setCategoryId(active ? '' : cat.category_id)}
              />
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.filterScroll} />
      )}
      {!isDesktop && mobileLayout === 'grid' ? (
        <Pressable
          style={({ pressed }) => [styles.layoutToggleBtn, pressed && styles.layoutToggleBtnPressed]}
          onPress={() => setMobileLayout('deck')}
          accessibilityRole="button"
          accessibilityLabel={t('explore.switchToDeck')}
          hitSlop={8}
        >
          <Ionicons name="albums-outline" size={18} color="#FFFFFF" />
        </Pressable>
      ) : null}
      <DefaultLanguageChip />
      <DefaultOrientationChip
        loggedIn={isLoggedIn}
        gender={user?.gender}
        genderCustom={user?.gender_custom}
        saving={savingGender}
        onSelect={(gender, custom) => void saveOrientation(gender, custom)}
        onPressWhenLoggedOut={() => {
          requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'));
        }}
      />
      {Platform.OS === 'ios' ? null : (
        <DefaultR18FilterChip
          label={t('explore.r18Filter')}
          active={matureFilterOn}
          onPress={onToggleMatureFilter}
        />
      )}
    </View>
  );

  const homeBannerSlides = useMemo((): HomeBannerSlide[] => {
    const slides: HomeBannerSlide[] = [];
    for (const item of campaigns) {
      if (!String(item.banner_url || '').trim()) continue;
      slides.push({
        key: `campaign:${item.campaign_id}`,
        name: item.name,
        banner_url: item.banner_url,
        onPress: () => router.push(`/activities/${encodeURIComponent(item.campaign_id)}`),
      });
    }
    for (const item of contests) {
      if (!String(item.banner_url || '').trim()) continue;
      slides.push({
        key: `contest:${item.slug}`,
        name: item.theme_title ? `${item.name} · ${item.theme_title}` : item.name,
        banner_url: item.banner_url,
        onPress: () => router.push(`/contest/${encodeURIComponent(item.slug)}`),
      });
    }
    return slides;
  }, [campaigns, contests, router]);

  const campaignBanner = <DefaultCampaignBanner slides={homeBannerSlides} />;

  const listFooter = (
    <View style={styles.listFooter}>
      {loadingMore ? <ActivityIndicator color={TOKENS.colors.accent} /> : null}
    </View>
  );

  /** 普通网格：渲染过的卡片保留，不靠虚拟列表回收 */
  const renderRoleGrid = () => {
    if (agentsLoading) {
      return <ActivityIndicator style={styles.loader} color={TOKENS.colors.accent} />;
    }
    if (showExploreEmpty) {
      return <Text style={Typo(styles.empty, 'sans', lang)}>{t('explore.empty')}</Text>;
    }
    return (
      <>
        <RoleGridContainer numColumns={numColumns} availableWidth={availableWidth} gap={gap}>
          {homeAgentCards.map((item) => (
            <View
              key={libraryCardIds.has(item.id) ? `lib-${item.id}` : item.id}
              style={[
                styles.gridItem,
                Platform.OS !== 'web' && numColumns > 1 ? { width: cardWidth } : null,
              ]}
            >
              <DefaultExploreRoleCard
                item={item}
                variant="grid"
                onPress={onOpenExploreRole}
                onMatureLocked={onMatureLockedAgent}
                nameFallback={t('common.notAvailable')}
                maturePreview={matureFilterOn}
              />
            </View>
          ))}
        </RoleGridContainer>
        {listFooter}
      </>
    );
  };

  return (
    <DefaultShell scrollable={false}>
      <DefaultDailyTasksModal
        visible={dailyTasksVisible}
        onClose={() => setDailyTasksVisible(false)}
        onBindEmail={() => {
          setDailyTasksVisible(false);
          router.push('/settings?bindEmail=1');
        }}
      />
      <MatureConfirmModal
        visible={confirmMature}
        onCancel={() => setConfirmMature(false)}
        onConfirm={() => {
          setConfirmMature(false);
          void syncContentTier(true);
        }}
      />
      <View
        style={[
          styles.content,
          isDesktop ? styles.contentDesktop : styles.contentMobile,
          { paddingHorizontal: homeHPadding },
          // 安全区必须叠在 contentMobile 之后，避免被固定 paddingTop 覆盖（上架刘海/状态栏）
          isDesktop
            ? null
            : {
                paddingTop:
                  (typeof pageContentPadding.paddingTop === 'number'
                    ? pageContentPadding.paddingTop
                    : 0) + 12,
              },
        ]}
      >
        {isDesktop ? (
          <ScrollView
            ref={scrollRef}
            {...scrollWebProps}
            style={[styles.list, scrollWebProps.style]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void refresh();
                  void loadLibrary();
                  void loadCampaigns();
                }}
                tintColor={TOKENS.colors.accent}
              />
            }
          >
            <View style={styles.headerDesktop}>{filterBar}</View>
            {campaignBanner}
            {renderRoleGrid()}
          </ScrollView>
        ) : (
          <>
            <View style={styles.headerMobile}>{filterBar}</View>
            {campaignBanner}
            {mobileLayout === 'deck' ? (
              <View style={[styles.deckWrap, { paddingBottom: mobileDeckBottomPad }]}>
                {agentsLoading ? (
                  <ActivityIndicator style={styles.loader} color={TOKENS.colors.accent} />
                ) : (
                  <DefaultSwipeRoleDeck
                    items={homeAgentCards}
                    nameFallback={t('common.notAvailable')}
                    onOpenDetail={onOpenExploreRole}
                    onLike={handleSwipeLike}
                    onBeforeLike={onBeforeSwipeLike}
                    onMatureLocked={onMatureLockedAgent}
                    onNearEnd={onNearEnd}
                    onToggleGrid={() => setMobileLayout('grid')}
                  />
                )}
                {loadingMore ? (
                  <View style={styles.loadingMoreHint}>
                    <ActivityIndicator color={TOKENS.colors.accent} size="small" />
                  </View>
                ) : null}
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                {...scrollWebProps}
                style={[styles.list, scrollWebProps.style]}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: mobileDeckBottomPad + 24 },
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      void refresh();
                      void loadLibrary();
                      void loadCampaigns();
                    }}
                    tintColor={TOKENS.colors.accent}
                  />
                }
              >
                {renderRoleGrid()}
              </ScrollView>
            )}
          </>
        )}

        {isDesktop || mobileLayout === 'grid' ? (
          <Animated.View
            pointerEvents={showBackTop ? 'box-none' : 'none'}
            style={[
              styles.backTopWrap,
              {
                bottom: backTopBottom,
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
              style={({ pressed }) => [styles.backTopFab, pressed && styles.backTopFabPressed]}
              onPress={scrollToTop}
              accessibilityRole="button"
              accessibilityLabel={t('explore.backToTop')}
            >
              <Ionicons name="chevron-up" size={22} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      <ThemedAgentDetailModal
        visible={selectedExploreRole !== null}
        role={selectedExploreRole}
        mode="explore"
        onClose={handleCloseDetail}
        onStartChat={handleStartChat}
        onViewMedia={handleViewMedia}
      />
      <ThemedAgentDetailModal
        visible={selectedLibraryRole !== null}
        role={selectedLibraryRole}
        mode="library"
        onClose={handleCloseDetail}
        onStartChat={handleStartChat}
        onViewMedia={handleViewMedia}
      />
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: 0,
    position: 'relative',
    zIndex: 1,
  },
  contentDesktop: {
    paddingTop: 40,
  },
  contentMobile: {
    /** Top inset: safe-area + 12，在组件内联计算，避免覆盖系统安全区 */
    paddingBottom: 0,
  },
  headerDesktop: {
    marginBottom: 20,
  },
  headerMobile: {
    marginBottom: 10,
    zIndex: 2,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  layoutToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  layoutToggleBtnPressed: {
    opacity: 0.85,
  },
  filterScroll: {
    flex: 1,
    minWidth: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 4,
  },
  deckWrap: {
    flex: 1,
    minHeight: 0,
  },
  loadingMoreHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loader: {
    marginTop: 40,
    marginBottom: 40,
  },
  empty: {
    color: TOKENS.colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  listFooter: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  gridItem: {
    minWidth: 0,
    overflow: 'visible',
  },
  backTopWrap: {
    position: 'absolute',
    right: 16,
    zIndex: 120,
  },
  backTopFab: {
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
  backTopFabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
