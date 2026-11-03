import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  RefreshControl,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { RoleGridContainer } from '../../components/agent/RoleGridContainer';
import { useRoleGridLayout } from '../../hooks/useRoleGridLayout';
import { computeCardWidth } from '../../utils/roleGrid';
import { useAuthStore } from '../../stores/authStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { notifyError, notifyWarning } from '../../utils/notify';
import { MatureConfirmModal } from '../../components/settings/MatureConfirmModal';
import { ThemedSimulatorDetailModal } from '../../components/ui/ThemedSimulatorDetailModal';
import { DefaultShell } from './components/DefaultShell';
import { DefaultCreateEntryModal } from './components/DefaultCreateEntryModal';
import { DefaultR18FilterChip } from './components/DefaultR18FilterChip';
import { DefaultExploreWorldCard } from './components/DefaultExploreWorldCard';
import { TOKENS } from './theme/tokens';
import {
  useMobileBottomNavPadding,
  useMobilePageContentPaddingStyle,
} from '../../hooks/useMobileSafeAreaPadding';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { isMatureCatalogRating, normalizeAgentContentRating } from '../../utils/agentRatingDisplay';
import { isIosSafeContentMode } from '../../utils/matureOptIn';
import { loadMatureSettings, saveMatureSettings } from '../../engine/flagStore';
import { setLocalMatureOptIn } from '../../utils/matureOptIn';
import { updateUser } from '../../api/user';
import { ApiError } from '../../api/client';
import { PRIMARY_SCENE_ID } from '../../constants/scene';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { useExploreWorldsFeed } from '../../hooks/useExploreWorldsFeed';
import type { ExploreCatalogKind, ExploreWorldItem } from '../../api/exploreWorlds';
import { checkWorldMatureGate } from '../../utils/worldMatureGate';
import { useSimulatorAccess } from '../../hooks/useSimulatorAccess';
import {
  resolveExploreSimulatorId,
  resolveExploreWorldId,
} from '../../utils/exploreCatalogNavigation';

const H_PADDING = TOKENS.layout.contentPadding;
const HOME_MOBILE_H_PADDING = 12;
const HOME_MIN_CARD_WIDTH = 148;
const HOME_MOBILE_COLUMNS = 2;
const HOME_GRID_GAP = 8;
const SCROLL_LOAD_THRESHOLD = 280;
const BACK_TOP_SHOW_Y = 420;
const BACK_TOP_FAB_GAP = 16;
const MOBILE_NAV_BAR_H = 80;

/** World tab — public explore catalog for story / script worlds. */
export function DefaultWorldsExploreScreen() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const { canAccessSimulator } = useSimulatorAccess();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const backTopBottom = useMobileBottomNavPadding(MOBILE_NAV_BAR_H + BACK_TOP_FAB_GAP);
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

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [confirmMature, setConfirmMature] = useState(false);
  const [matureFilterOn, setMatureFilterOn] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [catalogKind, setCatalogKind] = useState<ExploreCatalogKind>('all');
  const [createChoiceVisible, setCreateChoiceVisible] = useState(false);

  useEffect(() => {
    if (!canAccessSimulator && catalogKind === 'simulator') {
      setCatalogKind('all');
    }
  }, [canAccessSimulator, catalogKind]);
  const [detailSimulatorId, setDetailSimulatorId] = useState<string | null>(null);

  const {
    items: exploreWorlds,
    loading: worldsLoading,
    loadingMore: worldsLoadingMore,
    hasMore: worldsHasMore,
    refreshing: worldsRefreshing,
    loadMore: loadMoreWorlds,
    refresh: refreshWorlds,
  } = useExploreWorldsFeed(debouncedQ, true, !matureFilterOn, catalogKind);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let mounted = true;
    async function syncMatureFilter() {
      if (Platform.OS === 'ios') {
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

  const onExploreWorldPress = useCallback(
    (item: ExploreWorldItem) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      const gate = checkWorldMatureGate(item.content_rating, user);
      if (!gate.ok) {
        if (gate.reason === 'vip_required') {
          notifyWarning(t('settings.matureVipRequired'));
          return;
        }
        setConfirmMature(true);
        return;
      }
      const simulatorId = resolveExploreSimulatorId(item);
      if (simulatorId) {
        setDetailSimulatorId(simulatorId);
        return;
      }
      const worldId = resolveExploreWorldId(item);
      if (!worldId) {
        notifyWarning(t('worldPlay.loadFailed'));
        return;
      }
      router.push(`/world/${worldId}`);
    },
    [isLoggedIn, router, t, user],
  );

  const onStartSimulatorPlay = useCallback(
    (id: string) => {
      setDetailSimulatorId(null);
      router.push(`/simulator/${id}/play`);
    },
    [router],
  );

  const visibleExploreWorlds = useMemo(() => {
    if (matureFilterOn) return exploreWorlds;
    return exploreWorlds.filter((w) => {
      if (isMatureCatalogRating(w.content_rating)) return false;
      if (isIosSafeContentMode() && normalizeAgentContentRating(w.content_rating) === 'r') {
        return false;
      }
      return true;
    });
  }, [exploreWorlds, matureFilterOn]);

  const onMatureLockedWorld = useCallback(
    (item: ExploreWorldItem) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      const gate = checkWorldMatureGate(item.content_rating, user);
      if (!gate.ok) {
        if (gate.reason === 'vip_required') {
          notifyWarning(t('settings.matureVipRequired'));
          return;
        }
        setConfirmMature(true);
      }
    },
    [isLoggedIn, router, t, user],
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
      if (worldsHasMore) void loadMoreWorlds();
    },
    [loadMoreWorlds, worldsHasMore],
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

  const worldsInitialLoading = worldsLoading && exploreWorlds.length === 0;
  const showWorldsEmpty =
    !worldsInitialLoading && !worldsRefreshing && visibleExploreWorlds.length === 0;

  const header = (
    <View style={styles.header}>
      <Text style={Typo(styles.title, 'serif', lang)}>{t('defaultNav.world')}</Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={TOKENS.colors.searchAccent} style={styles.searchIcon} />
        <TextInput
          style={Typo(styles.search, 'sans', lang)}
          value={q}
          onChangeText={setQ}
          placeholder={t('freeChat.searchWorldsPlaceholder')}
          placeholderTextColor={TOKENS.colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {q.length > 0 ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={TOKENS.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterBar}>
        <View style={styles.filterScroll}>
          {([
            { value: 'all' as const, label: t('explore.kind.all') },
            { value: 'world' as const, label: t('explore.kind.world') },
            ...(canAccessSimulator
              ? [{ value: 'simulator' as const, label: t('explore.kind.simulator') }]
              : []),
          ]).map((opt) => {
            const active = catalogKind === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setCatalogKind(opt.value)}
                style={[styles.kindChip, active && styles.kindChipOn]}
              >
                <Text style={[styles.kindChipText, active && styles.kindChipTextOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => {
            if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
            if (canAccessSimulator) {
              setCreateChoiceVisible(true);
              return;
            }
            router.push('/create-world');
          }}
          style={({ pressed }) => [styles.createWorldBtn, pressed && styles.createWorldBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('createEntry.worldOrSimulatorTitle')}
          hitSlop={6}
        >
          <Ionicons name="add" size={22} color={TOKENS.colors.text} />
        </Pressable>
        {Platform.OS === 'ios' ? null : (
          <DefaultR18FilterChip
            label={t('explore.r18Filter')}
            active={matureFilterOn}
            onPress={onToggleMatureFilter}
          />
        )}
      </View>
    </View>
  );

  const worldsListFooter = (
    <View style={styles.listFooter}>
      {worldsLoadingMore ? <ActivityIndicator color={TOKENS.colors.accent} /> : null}
    </View>
  );

  const renderBody = () => {
    if (worldsInitialLoading) {
      return <ActivityIndicator style={styles.loader} color={TOKENS.colors.accent} />;
    }
    if (showWorldsEmpty) {
      return <Text style={Typo(styles.empty, 'sans', lang)}>{t('freeChat.emptyWorlds')}</Text>;
    }
    return (
      <>
        <RoleGridContainer numColumns={numColumns} availableWidth={availableWidth} gap={gap}>
          {visibleExploreWorlds.map((item) => (
            <View
              key={item.simulator_id || item.world_id || item.code}
              style={[
                styles.gridItem,
                Platform.OS !== 'web' && numColumns > 1 ? { width: cardWidth } : null,
              ]}
            >
              <DefaultExploreWorldCard
                item={item}
                onPress={onExploreWorldPress}
                onMatureLocked={onMatureLockedWorld}
              />
            </View>
          ))}
        </RoleGridContainer>
        {worldsListFooter}
      </>
    );
  };

  return (
    <DefaultShell scrollable={false}>
      <MatureConfirmModal
        visible={confirmMature}
        onCancel={() => setConfirmMature(false)}
        onConfirm={() => {
          setConfirmMature(false);
          void syncContentTier(true);
        }}
      />
      <ThemedSimulatorDetailModal
        visible={Boolean(detailSimulatorId)}
        simulatorId={detailSimulatorId}
        onClose={() => setDetailSimulatorId(null)}
        onStartPlay={onStartSimulatorPlay}
      />
      <View style={[styles.content, pageContentPadding, { paddingHorizontal: homeHPadding }]}>
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
              refreshing={worldsRefreshing}
              onRefresh={() => {
                void refreshWorlds();
              }}
              tintColor={TOKENS.colors.accent}
            />
          }
        >
          {header}
          {renderBody()}
        </ScrollView>

        {!isDesktop ? (
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
      <DefaultCreateEntryModal
        visible={createChoiceVisible}
        onClose={() => setCreateChoiceVisible(false)}
        kinds={['world', 'simulator']}
        title={t('createEntry.worldOrSimulatorTitle')}
        subtitle={t('createEntry.worldOrSimulatorSubtitle')}
      />
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 0,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    gap: 16,
    marginBottom: 20,
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 28,
    lineHeight: 34,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8, 9, 13, 0.72)',
    paddingHorizontal: 18,
    minHeight: 48,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        } as object)
      : {}),
  },
  searchIcon: {
    marginRight: 10,
  },
  search: {
    flex: 1,
    color: TOKENS.colors.text,
    fontSize: 15,
    paddingVertical: 12,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as object)
      : {}),
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterScroll: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  kindChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8, 10, 15, 0.45)',
  },
  kindChipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  kindChipText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 12 }, 'sans'),
  kindChipTextOn: Typo({ color: TOKENS.colors.text, fontSize: 12, fontWeight: '700' }, 'sans'),
  createWorldBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createWorldBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
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
    /** Clear floating glass bottom nav so last cards can scroll fully into view. */
    paddingBottom: 80,
    flexGrow: 1,
  },
  listFooter: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  gridItem: {
    minWidth: 0,
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
