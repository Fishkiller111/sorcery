import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatureConfirmModal } from '../../components/settings/MatureConfirmModal';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import { getExploreWorld, type ExploreWorldItem } from '../../api/exploreWorlds';
import { listExploreSimulators } from '../../api/simulator';
import {
  getWorldGallery,
  listWorldCheckpoints,
  deleteWorldCheckpoint,
  rollbackWorld,
  type WorldCheckpointItem,
} from '../../api/world';
import { createContentReport, type ContentReportReason } from '../../api/community';
import { ApiError } from '../../api/client';
import { APP_SITE_URL, resolveStaticUrl } from '../../constants/config';
import { resolveShareOrigin } from '../../utils/shareOrigin';
import { useWorldHome } from '../../hooks/useWorldHome';
import { useSimulatorAccess } from '../../hooks/useSimulatorAccess';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { notifyError, notifySuccess } from '../../utils/notify';
import { requireLoginForAction } from '../../utils/requireLogin';
import { copyOrShareText, shareTaskLink } from '../../utils/copyOrShare';
import { toBackendLang } from '../../utils/userLang';
import { useAuthStore } from '../../stores/authStore';
import type {
  WorldCastPreview,
  WorldGalleryItem,
  WorldKnowledgePreview,
  WorldLevelStatus,
  WorldScenePreview,
} from '../../types/world';
import type { ExploreSimulatorItem } from '../../types/simulator';
import { TOKENS } from './theme/tokens';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { WorldLevelMap } from './components/WorldLevelMap';
import { SocialReportReasonModal } from './social/SocialReportReasonModal';

type TabKey = 'lobby' | 'levels' | 'gallery' | 'saves' | 'settings';
type LevelsViewMode = 'list' | 'map';
type LobbySectionKey = 'cast' | 'lore' | 'scenes' | 'simulators';

const PC_BREAKPOINT = 900;

type Props = {
  worldId: string;
};

function LobbyCollapse({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <View style={styles.section}>
      <Pressable style={styles.collapseHeader} onPress={onToggle} hitSlop={6}>
        <Text style={Typo(styles.sectionTitle, 'sans', lang)}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#a3a3a3" />
      </Pressable>
      {open ? <View style={styles.collapseBody}>{children}</View> : null}
    </View>
  );
}

function resolveImageUri(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/placeholder/')) return null;
  const url = resolveStaticUrl(path);
  return url || null;
}

export function DefaultWorldDetailScreen({ worldId }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, lang, tp } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const {
    loading,
    enter,
    levels,
    cast,
    lore,
    scenes,
    entries,
    isOwner,
    error,
    reload,
    enterLevel,
    confirmMature,
    setConfirmMature,
    confirmMatureEnable,
    pickCastOpen,
    setPickCastOpen,
    playableCast,
    defaultPlayerCastId,
    selectPlayerCast,
    switchPlayerCast,
    pickingCast,
    playerCast,
    playerCastId,
  } = useWorldHome(worldId);

  const { canAccessSimulator, isDevUser } = useSimulatorAccess();

  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [tab, setTab] = useState<TabKey>('lobby');
  const [meta, setMeta] = useState<ExploreWorldItem | null>(null);
  const [gallery, setGallery] = useState<WorldGalleryItem[]>([]);
  const [checkpoints, setCheckpoints] = useState<WorldCheckpointItem[]>([]);
  const [checkpointsLoading, setCheckpointsLoading] = useState(false);
  const [loadingCheckpoint, setLoadingCheckpoint] = useState<string | null>(null);
  const [deletingCheckpoint, setDeletingCheckpoint] = useState<string | null>(null);
  const [pendingDeleteCheckpoint, setPendingDeleteCheckpoint] = useState<WorldCheckpointItem | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [levelsView, setLevelsView] = useState<LevelsViewMode>('list');
  const [lobbyOpen, setLobbyOpen] = useState<Record<LobbySectionKey, boolean>>({
    cast: true,
    lore: true,
    scenes: true,
    simulators: true,
  });
  const [relatedSims, setRelatedSims] = useState<ExploreSimulatorItem[]>([]);
  const [relatedSimsLoading, setRelatedSimsLoading] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [pendingSpoilerKey, setPendingSpoilerKey] = useState<string | null>(null);
  const [pickedCastId, setPickedCastId] = useState<string>('');
  const [pendingSwitchCast, setPendingSwitchCast] = useState<WorldCastPreview | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isPc = width >= PC_BREAKPOINT;

  useEffect(() => {
    if (pickCastOpen) {
      setPickedCastId(defaultPlayerCastId || playableCast[0]?.cast_id || '');
    }
  }, [pickCastOpen, defaultPlayerCastId, playableCast]);

  const toggleLobby = useCallback((key: LobbySectionKey) => {
    setLobbyOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const loreEntries = useMemo(() => {
    const list = lore?.knowledge ?? [];
    const rank = (imp?: string) => {
      const v = (imp || 'normal').toLowerCase();
      if (v === 'core') return 0;
      if (v === 'spoiler') return 2;
      return 1;
    };
    return [...list].sort((a, b) => rank(a.importance) - rank(b.importance));
  }, [lore?.knowledge]);

  const hasLore = !!(lore?.canon?.trim() || loreEntries.length);
  const hasScenes = scenes.length > 0;

  useEffect(() => {
    setRevealedSpoilers({});
    setPendingSpoilerKey(null);
    setLobbyOpen({ cast: true, lore: true, scenes: true, simulators: true });
    setRelatedSims([]);
  }, [worldId]);

  useEffect(() => {
    if (!canAccessSimulator || !worldId) {
      setRelatedSims([]);
      return;
    }
    let cancelled = false;
    setRelatedSimsLoading(true);
    void listExploreSimulators({ world_id: worldId, page_size: 10 })
      .then((resp) => {
        if (!cancelled) setRelatedSims(resp.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setRelatedSims([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedSimsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAccessSimulator, worldId]);

  const mapEnabled = useMemo(() => {
    const enabled = entries?.enabled ?? [];
    return enabled.includes('map') && !!String(entries?.map_image ?? '').trim();
  }, [entries]);

  useEffect(() => {
    if (!mapEnabled && levelsView === 'map') setLevelsView('list');
  }, [mapEnabled, levelsView]);

  useEffect(() => {
    if (entries?.primary === 'map' && mapEnabled) setLevelsView('map');
  }, [entries?.primary, mapEnabled]);

  const loadMeta = useCallback(async () => {
    if (!worldId) return;
    setMetaLoading(true);
    setMeta(null);
    try {
      const [explore, gal] = await Promise.all([
        getExploreWorld(worldId, { lang: toBackendLang(lang) }).catch(() => null),
        getWorldGallery(worldId).catch(() => ({ items: [] as WorldGalleryItem[] })),
      ]);
      setMeta(explore?.world ?? null);
      setGallery(gal.items ?? []);
    } catch (e) {
      notifyError(e instanceof ApiError ? e.message : t('worldPlay.loadFailed'));
    } finally {
      setMetaLoading(false);
    }
  }, [t, worldId, lang]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const loadCheckpoints = useCallback(async () => {
    if (!worldId) return;
    setCheckpointsLoading(true);
    try {
      const resp = await listWorldCheckpoints(worldId);
      const items = [...(resp.checkpoints ?? [])].sort((a, b) => b.created_at - a.created_at);
      setCheckpoints(items);
    } catch {
      setCheckpoints([]);
    } finally {
      setCheckpointsLoading(false);
    }
  }, [worldId]);

  useEffect(() => {
    if (tab === 'saves') void loadCheckpoints();
  }, [tab, loadCheckpoints]);

  const title = enter?.title || meta?.title || t('worldPlay.levelsTitle');
  const tagline = (enter?.tagline || meta?.tagline || '').trim();
  const tags = meta?.tags ?? [];
  const cover = resolveImageUri(enter?.cover_image || meta?.cover_image);
  const rating = (meta?.content_rating || enter?.content_rating || 'standard').toLowerCase();
  const unlockedGallery = useMemo(() => gallery.filter((g) => g.unlocked), [gallery]);
  const castCols = isPc ? 4 : 2;
  const castGap = 12;
  // scroll pad 16×2 + panel pad 14×2 + panel border 2×2 — otherwise cards overflow to 1 column.
  const castInnerW = Math.min(width, 1100) - 32 - 28 - 4;
  const castCardW = Math.max(
    120,
    Math.floor((castInnerW - castGap * (castCols - 1)) / castCols),
  );
  const galleryCols = isPc ? 4 : 2;
  const galleryCellPct = `${100 / galleryCols - 1.2}%` as const;

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const ownerUserId = meta?.owner_user_id || enter?.owner_user_id || '';

  const onShareWorld = useCallback(async () => {
    // 未配置分享地址时不跳转到原产品站点。
    const site = resolveShareOrigin(APP_SITE_URL, Platform.OS, Platform.OS === 'web' && typeof window !== 'undefined' ? window.location : undefined);
    if (!site) { notifyError(t('worldPlay.shareFailed')); return; }
    const url = `${site.replace(/\/$/, '')}/world/${encodeURIComponent(worldId)}`;
    const body = [title, tagline].filter(Boolean).join('\n');
    try {
      const shared = await shareTaskLink({
        url,
        text: body || undefined,
        title: t('worldPlay.shareWorld'),
      });
      if (shared) {
        notifySuccess(t('worldPlay.shareSuccess'));
        return;
      }
      const result = await copyOrShareText(
        [body, url].filter(Boolean).join('\n\n'),
        t('worldPlay.shareWorld'),
      );
      if (result === 'copied') notifySuccess(t('worldPlay.shareCopied'));
      else if (result === 'shared') notifySuccess(t('worldPlay.shareSuccess'));
    } catch (err) {
      notifyError(t('worldPlay.shareFailed'), err instanceof Error ? err.message : undefined);
    }
  }, [t, tagline, title, worldId]);

  const onReportWorld = useCallback(
    async (reason: ContentReportReason) => {
      if (!ownerUserId) {
        setReportOpen(false);
        return;
      }
      try {
        await createContentReport({
          target_type: 'user',
          target_id: ownerUserId,
          reason_code: reason,
          detail: `world:${worldId}`,
        });
        notifySuccess(t('worldPlay.reportOk'));
      } catch (err) {
        notifyError(t('worldPlay.reportFailed'), err instanceof Error ? err.message : undefined);
      } finally {
        setReportOpen(false);
      }
    },
    [ownerUserId, t, worldId],
  );

  const onStart = useCallback(() => {
    const startCode = enter?.start_level;
    const preferred =
      (startCode ? levels.find((l) => l.code === startCode) : null) ??
      levels.find((l) => l.unlocked) ??
      levels[0];
    if (!preferred) {
      notifyError(t('worldPlay.noLevels'));
      return;
    }
    enterLevel(preferred);
  }, [enter?.start_level, enterLevel, levels, t]);

  const tabs = useMemo(() => {
    const all: { key: TabKey; label: string }[] = [
      { key: 'lobby', label: t('worldPlay.tabLobby') },
      { key: 'levels', label: t('worldPlay.tabLevels') },
      { key: 'gallery', label: t('worldPlay.tabGallery') },
      { key: 'saves', label: t('worldPlay.tabSaves') },
    ];
    if (isOwner) {
      all.push({ key: 'settings', label: t('worldPlay.tabSettings') });
    }
    return all;
  }, [isOwner, t]);

  const onCastPress = useCallback(
    (c: WorldCastPreview) => {
      if (!c.is_playable || pickingCast) return;
      if (c.cast_id === playerCastId) return;
      if (!playerCastId) {
        void selectPlayerCast(c.cast_id);
        return;
      }
      setPendingSwitchCast(c);
    },
    [pickingCast, playerCastId, selectPlayerCast],
  );

  const confirmSwitchCast = useCallback(async () => {
    if (!pendingSwitchCast) return;
    const ok = await switchPlayerCast(pendingSwitchCast.cast_id);
    setPendingSwitchCast(null);
    if (ok) notifySuccess(t('worldPlay.switchCastOk'));
  }, [pendingSwitchCast, switchPlayerCast, t]);

  const onLoadCheckpoint = useCallback(
    async (cp: WorldCheckpointItem) => {
      if (loadingCheckpoint || deletingCheckpoint) return;
      setLoadingCheckpoint(cp.code);
      try {
        const resp = await rollbackWorld(worldId, cp.code);
        notifySuccess(t('worldPlay.savesLoadOk'));
        await reload();
        void loadCheckpoints();
        const level = resp.progress?.current_level || cp.level_code;
        if (level) {
          router.push(`/world/${worldId}/play/${level}`);
        }
      } catch (e) {
        notifyError(e instanceof ApiError ? e.message : t('worldPlay.savesLoadFailed'));
      } finally {
        setLoadingCheckpoint(null);
      }
    },
    [deletingCheckpoint, loadingCheckpoint, loadCheckpoints, reload, router, t, worldId],
  );

  const confirmDeleteCheckpoint = useCallback(async () => {
    const cp = pendingDeleteCheckpoint;
    if (!cp || deletingCheckpoint) return;
    setDeletingCheckpoint(cp.code);
    try {
      await deleteWorldCheckpoint(worldId, cp.code);
      setCheckpoints((prev) => prev.filter((item) => item.code !== cp.code));
      setPendingDeleteCheckpoint(null);
      notifySuccess(t('worldPlay.savesDeleteOk'));
    } catch (e) {
      notifyError(e instanceof ApiError ? e.message : t('worldPlay.savesDeleteFailed'));
    } finally {
      setDeletingCheckpoint(null);
    }
  }, [deletingCheckpoint, pendingDeleteCheckpoint, t, worldId]);

  useEffect(() => {
    if (tab === 'settings' && !isOwner) setTab('lobby');
  }, [isOwner, tab]);

  const renderLevelRow = (lv: WorldLevelStatus) => (
    <Pressable
      key={lv.code}
      style={[styles.levelCard, !lv.unlocked && styles.levelCardLocked]}
      onPress={() => enterLevel(lv)}
    >
      <View style={styles.levelRowTop}>
        <Text style={Typo(styles.levelTitle, 'sans', lang)} numberOfLines={2}>
          {lv.title}
        </Text>
        {lv.is_start ? (
          <View style={styles.levelBadge}>
            <Text style={Typo(styles.levelBadgeText, 'sans', lang)}>{t('worldPlay.start')}</Text>
          </View>
        ) : null}
      </View>
      {lv.synopsis ? (
        <Text style={Typo(styles.levelSynopsis, 'sans', lang)} numberOfLines={2}>
          {lv.synopsis}
        </Text>
      ) : null}
      <Text style={Typo(styles.levelMeta, 'sans', lang)}>
        {lv.cleared ? t('worldPlay.cleared') : lv.unlocked ? '' : t('worldPlay.locked')}
      </Text>
    </Pressable>
  );

  const importanceLabel = useCallback(
    (imp?: string) => {
      const v = (imp || 'normal').toLowerCase();
      if (v === 'core') return t('worldPlay.lobbyLoreCore');
      if (v === 'spoiler') return t('worldPlay.lobbyLoreSpoiler');
      return t('worldPlay.lobbyLoreNormal');
    },
    [t],
  );

  const renderKnowledge = (item: WorldKnowledgePreview) => {
    const imp = (item.importance || 'normal').toLowerCase();
    const isSpoiler = imp === 'spoiler';
    const revealed = !isSpoiler || !!revealedSpoilers[item.key];
    return (
      <View key={item.key} style={styles.loreCard}>
        <View style={styles.loreCardHead}>
          <Text style={Typo(styles.loreTitle, 'sans', lang)} numberOfLines={2}>
            {item.title || item.key}
          </Text>
          <View
            style={[
              styles.loreBadge,
              imp === 'core' && styles.loreBadgeCore,
              isSpoiler && styles.loreBadgeSpoiler,
            ]}
          >
            <Text style={Typo(styles.loreBadgeText, 'sans', lang)}>{importanceLabel(imp)}</Text>
          </View>
        </View>
        {revealed ? (
          <Text style={Typo(styles.loreBody, 'sans', lang)}>{item.body}</Text>
        ) : (
          <Pressable
            onPress={() => setPendingSpoilerKey(item.key)}
            accessibilityRole="button"
            accessibilityLabel={t('worldPlay.lobbySpoilerHint')}
          >
            <Text
              style={[
                Typo(styles.loreBody, 'sans', lang),
                styles.loreSpoilerBlur,
                Platform.OS === 'web' ? ({ filter: 'blur(5px)' } as object) : null,
              ]}
              numberOfLines={4}
            >
              {item.body || '████████████'}
            </Text>
            <Text style={Typo(styles.loreSpoilerHint, 'sans', lang)}>{t('worldPlay.lobbySpoilerHint')}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderScene = (sc: WorldScenePreview) => {
    const uri = resolveImageUri(sc.background_image);
    return (
      <View key={sc.code} style={styles.sceneCard}>
        {uri ? (
          <Image source={{ uri }} style={styles.sceneThumb} contentFit="cover" />
        ) : (
          <View style={[styles.sceneThumb, styles.portraitPlaceholder]}>
            <Text style={Typo(styles.portraitInitial, 'serif', lang)}>
              {(sc.title || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.sceneCopy}>
          <Text style={Typo(styles.loreTitle, 'sans', lang)} numberOfLines={2}>
            {sc.title || sc.code}
          </Text>
          {sc.opening ? (
            <Text style={Typo(styles.loreBody, 'sans', lang)} numberOfLines={4}>
              {sc.opening}
            </Text>
          ) : null}
          {sc.play_goal ? (
            <Text style={Typo(styles.sceneGoal, 'sans', lang)} numberOfLines={2}>
              {t('worldPlay.lobbySceneGoal')}: {sc.play_goal}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const lobbyBody = (
    <View style={styles.sectionStack}>
      <LobbyCollapse
        title={t('worldPlay.lobbyCast')}
        open={lobbyOpen.cast}
        onToggle={() => toggleLobby('cast')}
      >
        {cast.length === 0 ? (
          <Text style={Typo(styles.emptyInline, 'sans', lang)}>{t('worldPlay.lobbyCastEmpty')}</Text>
        ) : (
          <View style={[styles.castGrid, { gap: castGap }]}>
            {cast.map((c) => {
              const uri = resolveImageUri(c.figure_image);
              const isPlaying = !!playerCastId && c.cast_id === playerCastId;
              const pressable = !!c.is_playable;
              return (
                <Pressable
                  key={c.cast_id}
                  style={[
                    styles.portraitCard,
                    { width: castCardW },
                    isPlaying && styles.portraitCardPlaying,
                  ]}
                  onPress={pressable ? () => onCastPress(c) : undefined}
                  disabled={!pressable || pickingCast}
                >
                  <View style={styles.portraitFrame}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.portraitImage} contentFit="cover" contentPosition="top" />
                    ) : (
                      <View style={[styles.portraitImage, styles.portraitPlaceholder]}>
                        <Text style={Typo(styles.portraitInitial, 'serif', lang)}>
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {isPlaying ? (
                      <View style={[styles.leadBadge, styles.playingBadge]}>
                        <Text style={Typo(styles.leadBadgeText, 'sans', lang)}>{t('worldPlay.playingNow')}</Text>
                      </View>
                    ) : c.is_playable ? (
                      <View style={styles.leadBadge}>
                        <Text style={Typo(styles.leadBadgeText, 'sans', lang)}>{t('worldPlay.lobbyPlayable')}</Text>
                      </View>
                    ) : c.is_lead ? (
                      <View style={styles.leadBadge}>
                        <Text style={Typo(styles.leadBadgeText, 'sans', lang)}>{t('worldPlay.lobbyLead')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={Typo(styles.portraitCaption, 'sans', lang)} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.world_identity ? (
                    <Text style={Typo(styles.castIdentity, 'sans', lang)} numberOfLines={3}>
                      {c.world_identity}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </LobbyCollapse>

      <LobbyCollapse
        title={t('worldPlay.lobbyLore')}
        open={lobbyOpen.lore}
        onToggle={() => toggleLobby('lore')}
      >
        {!hasLore ? (
          <Text style={Typo(styles.emptyInline, 'sans', lang)}>{t('worldPlay.lobbyLoreEmpty')}</Text>
        ) : (
          <View style={styles.loreStack}>
            {lore?.canon?.trim() ? (
              <View style={styles.loreCard}>
                <Text style={Typo(styles.loreTitle, 'sans', lang)}>{t('worldPlay.lobbyLoreCanon')}</Text>
                <Text style={Typo(styles.loreBody, 'sans', lang)}>{lore.canon.trim()}</Text>
              </View>
            ) : null}
            {loreEntries.map(renderKnowledge)}
          </View>
        )}
      </LobbyCollapse>

      <LobbyCollapse
        title={t('worldPlay.lobbyScenes')}
        open={lobbyOpen.scenes}
        onToggle={() => toggleLobby('scenes')}
      >
        {!hasScenes ? (
          <Text style={Typo(styles.emptyInline, 'sans', lang)}>{t('worldPlay.lobbyScenesEmpty')}</Text>
        ) : (
          <View style={styles.loreStack}>{scenes.map(renderScene)}</View>
        )}
      </LobbyCollapse>

      {canAccessSimulator ? (
        <LobbyCollapse
          title={t('simulator.relatedTitle')}
          open={lobbyOpen.simulators}
          onToggle={() => toggleLobby('simulators')}
        >
          {relatedSimsLoading ? (
            <ActivityIndicator color={TOKENS.colors.accent} />
          ) : relatedSims.length === 0 ? (
            <View style={styles.relatedEmpty}>
              <Text style={Typo(styles.emptyInline, 'sans', lang)}>
                {t('simulator.relatedEmpty')}
              </Text>
              {isOwner || isDevUser ? (
                <Pressable
                  onPress={() => router.push('/simulator/create')}
                  hitSlop={8}
                  style={styles.relatedCreateBtn}
                >
                  <Text style={Typo(styles.relatedCreateText, 'sans', lang)}>
                    {t('simulator.relatedCreate')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.relatedList}>
              {relatedSims.map((item) => (
                <Pressable
                  key={item.simulator_id}
                  style={styles.relatedRow}
                  onPress={() => router.push(`/simulator/${item.simulator_id}`)}
                >
                  <View style={styles.relatedCopy}>
                    <Text style={Typo(styles.relatedTitle, 'sans', lang)} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.tagline ? (
                      <Text style={Typo(styles.relatedMeta, 'sans', lang)} numberOfLines={1}>
                        {item.tagline}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#a3a3a3" />
                </Pressable>
              ))}
            </View>
          )}
        </LobbyCollapse>
      ) : null}
    </View>
  );

  const levelsBody = (
    <View style={styles.sectionStack}>
      {mapEnabled ? (
        <View style={styles.viewToggle}>
          {([
            { key: 'list' as const, label: t('worldPlay.levelsListView'), icon: 'list' as const },
            { key: 'map' as const, label: t('worldPlay.levelsMapView'), icon: 'map' as const },
          ]).map((opt) => {
            const active = levelsView === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.viewToggleBtn, active && styles.viewToggleBtnActive]}
                onPress={() => setLevelsView(opt.key)}
              >
                <Ionicons name={opt.icon} size={14} color={active ? '#fff' : '#a3a3a3'} />
                <Text
                  style={Typo(
                    active ? styles.viewToggleTextActive : styles.viewToggleText,
                    'sans',
                    lang,
                  )}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {levelsView === 'map' && mapEnabled ? (
        <WorldLevelMap
          levels={levels}
          mapImage={entries?.map_image}
          onPressLevel={enterLevel}
        />
      ) : (
        <View style={styles.levelList}>
          {levels.length ? levels.map(renderLevelRow) : (
            <Text style={Typo(styles.emptyInline, 'sans', lang)}>{t('worldPlay.noLevels')}</Text>
          )}
        </View>
      )}
    </View>
  );

  const galleryBody = (
    <View style={styles.galleryGrid}>
      {gallery.length === 0 ? (
        <Text style={Typo(styles.emptyInline, 'sans', lang)}>{t('worldPlay.galleryEmpty')}</Text>
      ) : (
        gallery.map((g) => {
          const locked = !g.unlocked;
          const uri = !locked ? resolveImageUri(g.image_path) : null;
          return (
            <View
              key={g.gallery_id}
              style={[styles.galleryCell, { width: galleryCellPct }, locked && styles.galleryLocked]}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.galleryImage} contentFit="cover" />
              ) : (
                <View style={[styles.galleryImage, styles.galleryLockedFace]}>
                  <Text style={Typo(styles.galleryQuestion, 'serif', lang)}>?</Text>
                  <View style={styles.galleryBlurMask} />
                </View>
              )}
              <Text style={Typo(styles.portraitCaption, 'sans', lang)} numberOfLines={2}>
                {locked ? t('worldPlay.galleryLocked') : g.title}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );

  const savesBody = (
    <View style={styles.sectionStack}>
      {checkpointsLoading && checkpoints.length === 0 ? (
        <ActivityIndicator color={TOKENS.colors.accent} style={{ marginTop: 16 }} />
      ) : checkpoints.length === 0 ? (
        <Text style={Typo(styles.emptyInline, 'sans', lang)}>{t('worldPlay.savesEmpty')}</Text>
      ) : (
        checkpoints.map((cp) => {
          const levelTitle =
            levels.find((l) => l.code === cp.level_code)?.title || cp.level_code || '—';
          const when = cp.created_at
            ? new Date(cp.created_at * 1000).toLocaleString()
            : '';
          return (
            <View key={cp.code} style={styles.saveCard}>
              <View style={styles.saveCardCopy}>
                <View style={styles.saveCardHead}>
                  <Text style={Typo(styles.levelTitle, 'sans', lang)} numberOfLines={1}>
                    {levelTitle}
                  </Text>
                  <View style={[styles.loreBadge, cp.manual && styles.saveManualBadge]}>
                    <Text style={Typo(styles.loreBadgeText, 'sans', lang)}>
                      {cp.manual ? t('worldPlay.savesManual') : t('worldPlay.savesAuto')}
                    </Text>
                  </View>
                </View>
                <Text style={Typo(styles.levelMeta, 'sans', lang)} numberOfLines={1}>
                  {cp.beat_id ? `${cp.beat_id} · ` : ''}
                  {when}
                </Text>
              </View>
              <View style={styles.saveActions}>
                <Pressable
                  style={styles.saveLoadBtn}
                  onPress={() => void onLoadCheckpoint(cp)}
                  disabled={!!loadingCheckpoint || !!deletingCheckpoint}
                >
                  {loadingCheckpoint === cp.code ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={Typo(styles.saveLoadText, 'sans', lang)}>{t('worldPlay.savesLoad')}</Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.saveDeleteBtn}
                  onPress={() => setPendingDeleteCheckpoint(cp)}
                  disabled={!!loadingCheckpoint || !!deletingCheckpoint}
                  accessibilityRole="button"
                  accessibilityLabel={t('worldPlay.savesDelete')}
                >
                  {deletingCheckpoint === cp.code ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={Typo(styles.saveDeleteText, 'sans', lang)}>{t('worldPlay.savesDelete')}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const settingsBody = (
    <View style={styles.sectionStack}>
      <Text style={Typo(styles.settingsOwnerHint, 'sans', lang)}>{t('worldPlay.settingsOwnerOnly')}</Text>
      <View style={styles.settingsRow}>
        <Text style={Typo(styles.settingsLabel, 'sans', lang)}>{t('worldPlay.settingsRating')}</Text>
        <Text style={Typo(styles.settingsValue, 'sans', lang)}>{rating.toUpperCase()}</Text>
      </View>
      <Text style={Typo(styles.sectionBody, 'sans', lang)}>{t('worldPlay.settingsComingSoon')}</Text>
      <Text style={Typo(styles.settingsMeta, 'sans', lang)}>
        {tp('worldPlay.unlockedCount', { count: unlockedGallery.length })} ·{' '}
        {levels.filter((l) => l.cleared).length}/{levels.length}
      </Text>
    </View>
  );

  const busy = (loading && levels.length === 0) || metaLoading;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[TOKENS.colors.mainGradientStart, TOKENS.colors.mainGradientMid, TOKENS.colors.mainGradientEnd]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { zIndex: 20 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => setMoreOpen(true)}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t('worldPlay.moreA11y')}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
        </Pressable>
      </View>

      {busy ? (
        <ActivityIndicator color={TOKENS.colors.accent} style={{ marginTop: 48 }} />
      ) : (
        <>
          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => {
                  void reload();
                  void loadMeta();
                }}
                tintColor={TOKENS.colors.accent}
              />
            }
          >
            <View style={styles.hero}>
              <View style={styles.coverBox}>
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" contentPosition="top" />
                ) : (
                  <View style={[styles.cover, styles.portraitPlaceholder]}>
                    <Text style={Typo(styles.coverInitial, 'serif', lang)}>
                      {title.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.heroCopy}>
                <Text style={Typo(styles.heroTitle, 'serif', lang)} numberOfLines={2}>
                  {title}
                </Text>
                <View style={styles.statRow}>
                  <Text style={Typo(styles.statText, 'sans', lang)}>
                    {levels.length} {t('worldPlay.tabLevels')}
                  </Text>
                  <Text style={Typo(styles.statText, 'sans', lang)}>
                    {unlockedGallery.length}/{gallery.length} {t('worldPlay.tabGallery')}
                  </Text>
                </View>
                {rating !== 'standard' ? (
                  <Text style={Typo(styles.agentCount, 'sans', lang)}>{rating.toUpperCase()}</Text>
                ) : null}
                {tagline ? (
                  <Text style={Typo(styles.heroDesc, 'sans', lang)} numberOfLines={4}>
                    {tagline}
                  </Text>
                ) : null}
              </View>
            </View>

            {tags.length ? (
              <View style={styles.tagRow}>
                {tags.slice(0, 6).map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={Typo(styles.tagText, 'sans', lang)}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.tagRow}>
                <View style={styles.tagPill}>
                  <Text style={Typo(styles.tagText, 'sans', lang)}>{rating.toUpperCase()}</Text>
                </View>
              </View>
            )}

            {error === 'vip_required' ? (
              <Text style={Typo(styles.error, 'sans', lang)}>{t('settings.matureVipRequired')}</Text>
            ) : error ? (
              <Text style={Typo(styles.error, 'sans', lang)}>{error}</Text>
            ) : null}

            <View style={styles.tabBar}>
              {tabs.map((item) => {
                const active = tab === item.key;
                return (
                  <Pressable key={item.key} style={styles.tabItem} onPress={() => setTab(item.key)}>
                    {active ? (
                      <LinearGradient
                        colors={['#BA3C47', '#5B3A8E']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.tabActiveBg}
                      />
                    ) : null}
                    <Text
                      style={Typo(
                        active
                          ? { fontSize: 15, fontWeight: '700', color: '#fff' }
                          : { fontSize: 15, fontWeight: '700', color: '#a3a3a3' },
                        'sans',
                        lang,
                      )}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.panel}>
              {tab === 'lobby' ? lobbyBody : null}
              {tab === 'levels' ? levelsBody : null}
              {tab === 'gallery' ? galleryBody : null}
              {tab === 'saves' ? savesBody : null}
              {tab === 'settings' && isOwner ? settingsBody : null}
            </View>
          </ScrollView>

          <View style={[styles.ctaWrap, { paddingBottom: Math.max(12, insets.bottom) }]}>
            {playerCast ? (
              <Text style={Typo(styles.playingAs, 'sans', lang)}>
                {t('worldPlay.playingAs')} · {playerCast.name}
              </Text>
            ) : null}
            <Pressable onPress={onStart} style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaPressed]}>
              <LinearGradient
                colors={['#C4454F', '#8B2F6B']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.ctaGradient}
              >
                <Text style={Typo(styles.ctaText, 'sans', lang)}>{t('worldPlay.startNewChat')}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
      >
        <View style={styles.moreRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMoreOpen(false)} />
          <View style={[styles.moreCard, { top: insets.top + 48, right: 12 }]}>
            <Pressable
              style={({ pressed }) => [styles.moreItem, pressed && styles.moreItemPressed]}
              onPress={() => {
                setMoreOpen(false);
                // iOS：先关菜单再调系统分享，避免被 Modal 挡住
                setTimeout(() => void onShareWorld(), Platform.OS === 'ios' ? 280 : 0);
              }}
            >
              <Ionicons name="share-outline" size={18} color="#fff" style={styles.moreIcon} />
              <Text style={Typo(styles.moreItemText, 'sans', lang)}>{t('worldPlay.shareWorld')}</Text>
            </Pressable>
            {isOwner ? (
              <>
                <View style={styles.moreDivider} />
                <Pressable
                  style={({ pressed }) => [styles.moreItem, pressed && styles.moreItemPressed]}
                  onPress={() => {
                    setMoreOpen(false);
                    setTab('settings');
                  }}
                >
                  <Ionicons name="settings-outline" size={18} color="#fff" style={styles.moreIcon} />
                  <Text style={Typo(styles.moreItemText, 'sans', lang)}>{t('worldPlay.openSettings')}</Text>
                </Pressable>
              </>
            ) : null}
            {!isOwner && ownerUserId ? (
              <>
                <View style={styles.moreDivider} />
                <Pressable
                  style={({ pressed }) => [styles.moreItem, pressed && styles.moreItemPressed]}
                  onPress={() => {
                    setMoreOpen(false);
                    if (!requireLoginForAction(isLoggedIn, router, t('worldPlay.loginToReport'))) {
                      return;
                    }
                    setTimeout(() => setReportOpen(true), Platform.OS === 'ios' ? 280 : 0);
                  }}
                >
                  <Ionicons name="flag-outline" size={18} color="#fff" style={styles.moreIcon} />
                  <Text style={Typo(styles.moreItemText, 'sans', lang)}>{t('worldPlay.reportWorld')}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <SocialReportReasonModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSelect={(reason) => void onReportWorld(reason)}
      />

      <MatureConfirmModal
        visible={confirmMature}
        onConfirm={() => void confirmMatureEnable()}
        onCancel={() => setConfirmMature(false)}
      />
      <ThemedGeneralConfirmModal
        visible={pickCastOpen}
        icon="warning"
        title={t('worldPlay.pickCastTitle')}
        subtitle={t('worldPlay.pickCastBody')}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('worldPlay.pickCastConfirm')}
        loading={pickingCast}
        bodyContent={
          <View style={styles.pickCastList}>
            {playableCast.map((c) => {
              const uri = resolveImageUri(c.figure_image);
              const selected = pickedCastId === c.cast_id;
              const isDefault = c.cast_id === defaultPlayerCastId;
              return (
                <Pressable
                  key={c.cast_id}
                  style={[styles.pickCastRow, selected && styles.pickCastRowSelected]}
                  onPress={() => setPickedCastId(c.cast_id)}
                >
                  <View style={styles.pickCastThumb}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.pickCastImage} contentFit="cover" contentPosition="top" />
                    ) : (
                      <View style={[styles.pickCastImage, styles.portraitPlaceholder]}>
                        <Text style={Typo(styles.portraitInitial, 'serif', lang)}>
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={Typo(styles.pickCastName, 'sans', lang)}>{c.name}</Text>
                    {c.world_identity ? (
                      <Text style={Typo(styles.pickCastIdentity, 'sans', lang)} numberOfLines={2}>
                        {c.world_identity}
                      </Text>
                    ) : null}
                    {isDefault ? (
                      <Text style={Typo(styles.pickCastDefault, 'sans', lang)}>{t('worldPlay.pickCastDefault')}</Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? '#C4454F' : '#737373'}
                  />
                </Pressable>
              );
            })}
          </View>
        }
        onCancel={() => {
          if (!pickingCast) setPickCastOpen(false);
        }}
        onConfirm={() => {
          if (!pickedCastId) {
            notifyError(t('worldPlay.pickCastRequired'));
            return;
          }
          void selectPlayerCast(pickedCastId);
        }}
      />
      <ThemedGeneralConfirmModal
        visible={!!pendingSwitchCast}
        icon="warning"
        title={t('worldPlay.switchCastTitle')}
        subtitle={t('worldPlay.switchCastBody')}
        subtitleTone="warning"
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('worldPlay.switchCastConfirm')}
        loading={pickingCast}
        onCancel={() => {
          if (!pickingCast) setPendingSwitchCast(null);
        }}
        onConfirm={() => {
          void confirmSwitchCast();
        }}
      />
      <ThemedGeneralConfirmModal
        visible={!!pendingDeleteCheckpoint}
        icon="warning"
        title={t('worldPlay.savesDeleteTitle')}
        subtitle={t('worldPlay.savesDeleteBody')}
        subtitleTone="warning"
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('worldPlay.savesDeleteConfirm')}
        loading={!!deletingCheckpoint}
        onCancel={() => {
          if (!deletingCheckpoint) setPendingDeleteCheckpoint(null);
        }}
        onConfirm={() => {
          void confirmDeleteCheckpoint();
        }}
      />
      <ThemedGeneralConfirmModal
        visible={!!pendingSpoilerKey}
        icon="warning"
        title={t('worldPlay.lobbySpoilerTitle')}
        subtitle={t('worldPlay.lobbySpoilerBody')}
        subtitleTone="warning"
        cancelLabel={t('worldPlay.lobbySpoilerCancel')}
        confirmLabel={t('worldPlay.lobbySpoilerConfirm')}
        onCancel={() => setPendingSpoilerKey(null)}
        onConfirm={() => {
          if (pendingSpoilerKey) {
            setRevealedSpoilers((prev) => ({ ...prev, [pendingSpoilerKey]: true }));
          }
          setPendingSpoilerKey(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 48,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreRoot: {
    flex: 1,
  },
  moreCard: {
    position: 'absolute',
    minWidth: 200,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(18, 22, 32, 0.98)',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 30,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  moreItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  moreIcon: {
    width: 22,
  },
  moreItemText: Typo({ color: '#fff', fontSize: 14, fontWeight: '600' }, 'sans'),
  moreDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 10,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 14 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  coverBox: {
    width: 108,
    height: 144,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#d9d9d9',
  },
  cover: { width: '100%', height: '100%' },
  coverInitial: Typo({ color: TOKENS.colors.textSecondary, fontSize: 36, fontWeight: '700' }, 'serif'),
  heroCopy: { flex: 1, minWidth: 0, gap: 6 },
  heroTitle: Typo({ color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 32 }, 'serif'),
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  statText: Typo({ color: '#a4a4ac', fontSize: 13 }, 'sans'),
  agentCount: Typo({ color: '#8e8e96', fontSize: 13 }, 'sans'),
  heroDesc: Typo({ color: '#d4d4d8', fontSize: 14, lineHeight: 20 }, 'sans'),
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: {
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(132,132,132,0.42)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagText: Typo({ color: '#8e8e96', fontSize: 13 }, 'sans'),
  error: Typo({ color: '#c44', fontSize: 13 }, 'sans'),
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    overflow: 'hidden',
  },
  tabActiveBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 21,
  },
  panel: {
    marginTop: 4,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2c3445',
    backgroundColor: '#171c28',
    padding: 14,
    minHeight: 280,
  },
  sectionStack: { gap: 18 },
  section: { gap: 10 },
  sectionTitle: Typo({ color: '#d4d4d8', fontSize: 14, fontWeight: '600' }, 'sans'),
  sectionBody: Typo({ color: '#d4d4d8', fontSize: 14, lineHeight: 20 }, 'sans'),
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  collapseBody: { gap: 10 },
  emptyInline: Typo({ color: TOKENS.colors.textMuted, fontSize: 13 }, 'sans'),
  relatedEmpty: { gap: 10 },
  relatedCreateBtn: { alignSelf: 'flex-start' },
  relatedCreateText: Typo(
    { color: TOKENS.colors.accent, fontSize: 13, fontWeight: '600' },
    'sans',
  ),
  relatedList: { gap: 8 },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(8, 10, 15, 0.35)',
  },
  relatedCopy: { flex: 1, minWidth: 0, gap: 2 },
  relatedTitle: Typo({ color: '#e4e4e7', fontSize: 14, fontWeight: '600' }, 'sans'),
  relatedMeta: Typo({ color: '#8e8e96', fontSize: 12 }, 'sans'),
  hRow: { gap: 12, paddingRight: 8 },
  castGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  portraitCard: { gap: 6 },
  portraitCardPlaying: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(196,69,79,0.85)',
    padding: 4,
    backgroundColor: 'rgba(196,69,79,0.08)',
  },
  portraitFrame: { position: 'relative' },
  portraitImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    backgroundColor: '#2a3142',
  },
  portraitPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a3142',
  },
  portraitInitial: Typo({ color: '#888', fontSize: 28, fontWeight: '700' }, 'serif'),
  portraitCaption: Typo({ color: '#d4d4d8', fontSize: 13, fontWeight: '600', lineHeight: 17 }, 'sans'),
  castIdentity: Typo({ color: '#8e8e96', fontSize: 11, lineHeight: 15 }, 'sans'),
  leadBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(186,60,71,0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  playingBadge: {
    backgroundColor: 'rgba(34,197,94,0.92)',
  },
  leadBadgeText: Typo({ color: '#fff', fontSize: 10, fontWeight: '700' }, 'sans'),
  saveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(8,10,15,0.45)',
    padding: 14,
  },
  saveCardCopy: { flex: 1, minWidth: 0, gap: 4 },
  saveCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveManualBadge: { backgroundColor: 'rgba(34,197,94,0.22)' },
  saveLoadBtn: {
    borderRadius: 10,
    backgroundColor: 'rgba(186,60,71,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  saveLoadText: Typo({ color: '#fff', fontSize: 13, fontWeight: '700' }, 'sans'),
  saveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  saveDeleteBtn: {
    borderRadius: 10,
    backgroundColor: 'rgba(80,80,90,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  saveDeleteText: Typo({ color: '#fff', fontSize: 13, fontWeight: '700' }, 'sans'),
  loreStack: { gap: 10 },
  loreCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(8,10,15,0.4)',
    padding: 12,
    gap: 8,
  },
  loreCardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  loreTitle: Typo({ color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 }, 'sans'),
  loreBody: Typo({ color: '#c4c4cc', fontSize: 13, lineHeight: 19 }, 'sans'),
  loreSpoilerBlur: {
    color: 'transparent',
    textShadowColor: 'rgba(196,196,204,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  loreSpoilerHint: Typo({ color: '#a78bfa', fontSize: 12, marginTop: 6 }, 'sans'),
  loreBadge: {
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  loreBadgeCore: { backgroundColor: 'rgba(251,191,36,0.2)' },
  loreBadgeSpoiler: { backgroundColor: 'rgba(167,139,250,0.22)' },
  loreBadgeText: Typo({ color: '#d4d4d8', fontSize: 10, fontWeight: '700' }, 'sans'),
  sceneCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(8,10,15,0.4)',
    padding: 10,
  },
  sceneThumb: {
    width: 72,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#2a3142',
    overflow: 'hidden',
  },
  sceneCopy: { flex: 1, minWidth: 0, gap: 6 },
  sceneGoal: Typo({ color: '#a78bfa', fontSize: 12, lineHeight: 17 }, 'sans'),
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewToggleBtnActive: {
    backgroundColor: 'rgba(186,60,71,0.85)',
    borderColor: 'transparent',
  },
  viewToggleText: Typo({ color: '#a3a3a3', fontSize: 12, fontWeight: '600' }, 'sans'),
  viewToggleTextActive: Typo({ color: '#fff', fontSize: 12, fontWeight: '700' }, 'sans'),
  levelList: { gap: 10 },
  levelCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(8,10,15,0.45)',
    padding: 14,
    gap: 6,
  },
  levelCardLocked: { opacity: 0.55 },
  levelRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  levelTitle: Typo({ color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 }, 'sans'),
  levelSynopsis: Typo({ color: '#a4a4ac', fontSize: 12, lineHeight: 17 }, 'sans'),
  levelMeta: Typo({ color: TOKENS.colors.textMuted, fontSize: 12 }, 'sans'),
  levelBadge: {
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  levelBadgeText: Typo({ color: '#fde68a', fontSize: 10, fontWeight: '700' }, 'sans'),
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryCell: { gap: 6 },
  galleryLocked: { opacity: 0.92 },
  galleryImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    backgroundColor: '#12161f',
    overflow: 'hidden',
  },
  galleryLockedFace: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1118',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  galleryQuestion: Typo({ color: 'rgba(212,212,216,0.45)', fontSize: 42, fontWeight: '700' }, 'serif'),
  galleryBlurMask: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,12,18,0.35)',
  },
  settingsOwnerHint: Typo({ color: '#a78bfa', fontSize: 12, fontWeight: '600' }, 'sans'),
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsLabel: Typo({ color: '#a4a4ac', fontSize: 13 }, 'sans'),
  settingsValue: Typo({ color: '#fff', fontSize: 13, fontWeight: '600' }, 'sans'),
  settingsMeta: Typo({ color: TOKENS.colors.textMuted, fontSize: 12 }, 'sans'),
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(10,12,18,0.72)',
  },
  ctaBtn: { borderRadius: 999, overflow: 'hidden' },
  ctaPressed: { opacity: 0.9 },
  ctaGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  ctaText: Typo({ color: '#fff', fontSize: 16, fontWeight: '700' }, 'sans'),
  pickCastList: { gap: 8, marginTop: 4 },
  pickCastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pickCastRowSelected: {
    borderColor: 'rgba(196,69,79,0.65)',
    backgroundColor: 'rgba(196,69,79,0.12)',
  },
  pickCastThumb: {
    width: 44,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickCastImage: { width: '100%', height: '100%' },
  pickCastName: Typo({ color: '#fff', fontSize: 14, fontWeight: '600' }, 'sans'),
  pickCastIdentity: Typo({ color: '#a3a3a3', fontSize: 11, marginTop: 2 }, 'sans'),
  pickCastDefault: Typo({ color: '#C4454F', fontSize: 11, marginTop: 4, fontWeight: '600' }, 'sans'),
  playingAs: Typo({ color: '#d4d4d8', fontSize: 12, marginBottom: 6 }, 'sans'),
});
