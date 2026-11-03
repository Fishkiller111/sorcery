import type { Lang } from '../../src/i18n/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { safeGoBack } from '../../src/utils/safeGoBack';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '../../src/i18n/I18nContext';
import { COLORS } from '../../src/theme/colors';
import { Typo } from '../../src/theme/typography';
import { StoryModeTopBar } from '../../src/components/story/StoryModeTopBar';
import { DividerStar } from '../../src/components/ui/DividerStar';
import { getStoryGallery, getStoryProgress, listStoryScenes } from '../../src/api/story';
import { DEFAULT_SEASON_ID, STORY_CHAPTERS } from '../../src/constants/storyRegistry';
import {
  GALLERY_SCENES,
  getGalleryBranchesForScene,
  getGalleryScenesForChapter,
  resolveGallerySceneTitle,
} from '../../src/constants/storyGalleryCatalog';
import { buildBranchViews } from '../../src/utils/storyGallery';
import { GalleryScenePicker } from '../../src/components/story/GalleryScenePicker';
import { RewardStampTreeMap } from '../../src/components/story/RewardStampTreeMap';
import { GalleryProgressPanel } from '../../src/components/story/GalleryProgressPanel';
import { useAuthStore } from '../../src/stores/authStore';
import { useVipStore } from '../../src/stores/vipStore';
import { resolveLocalized } from '../../src/i18n/utils';
import { useMobileSafeAreaPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';

export default function StoryGalleryScreen() {
  const { lang, t } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const safeAreaBottom = useMobileSafeAreaPaddingStyle({ top: false });
  const params = useLocalSearchParams();
  const seasonId = (Array.isArray(params.seasonId) ? params.seasonId[0] : params.seasonId) || DEFAULT_SEASON_ID;
  const initialScene = Array.isArray(params.scene) ? params.scene[0] : params.scene;

  const user = useAuthStore((s) => s.user);
  const fetchVip = useVipStore((s) => s.fetchVip);

  const [loading, setLoading] = useState(true);
  const [chapterCode, setChapterCode] = useState<string>('prologue');
  const [selectedScene, setSelectedScene] = useState(initialScene || 's0_01');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [galleryItems, setGalleryItems] = useState<Awaited<ReturnType<typeof getStoryGallery>>['items']>([]);
  const [sceneTitles, setSceneTitles] = useState<Record<string, string>>({});

  const matureEnabled = user?.content_tier === 'mature';

  const load = useCallback(async () => {
    const [prog, gallery, ...sceneLists] = await Promise.all([
      getStoryProgress(),
      getStoryGallery(seasonId),
      ...STORY_CHAPTERS.map((ch) => listStoryScenes(ch.code)),
    ]);
    setFlags(prog.flags || {});
    setGalleryItems(gallery.items || []);
    const titles: Record<string, string> = {};
    for (const list of sceneLists) {
      for (const sc of list.scenes) {
        titles[sc.scene_code] = sc.title;
      }
    }
    setSceneTitles(titles);
    await fetchVip();
  }, [seasonId, fetchVip]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const chapterScenes = useMemo(
    () => getGalleryScenesForChapter(chapterCode),
    [chapterCode],
  );

  useEffect(() => {
    if (!chapterScenes.some((s) => s.sceneCode === selectedScene) && chapterScenes[0]) {
      setSelectedScene(chapterScenes[0].sceneCode);
    }
  }, [chapterScenes, selectedScene]);

  const branches = useMemo(() => {
    const defs = getGalleryBranchesForScene(selectedScene);
    return buildBranchViews(defs, flags, galleryItems, lang, matureEnabled);
  }, [selectedScene, flags, galleryItems, lang, matureEnabled]);

  const branchStats = useMemo(() => {
    const stats: Record<string, { collected: number; total: number }> = {};
    for (const scene of GALLERY_SCENES) {
      const views = buildBranchViews(
        getGalleryBranchesForScene(scene.sceneCode),
        flags,
        galleryItems,
        lang,
        matureEnabled,
      );
      stats[scene.sceneCode] = {
        collected: views.filter((b) => b.unlocked).reduce((n, b) => n + b.collectedCount, 0),
        total: views.reduce((n, b) => n + b.totalImageCells, 0),
      };
    }
    return stats;
  }, [flags, galleryItems, lang, matureEnabled]);

  const totalCollected = Object.values(branchStats).reduce((n, s) => n + s.collected, 0);
  const totalCells = Object.values(branchStats).reduce((n, s) => n + s.total, 0);

  const unlockedBranchCount = useMemo(() => {
    let count = 0;
    for (const scene of GALLERY_SCENES) {
      for (const branch of getGalleryBranchesForScene(scene.sceneCode)) {
        if (flags[branch.seenFlag]) count += 1;
      }
    }
    return count;
  }, [flags]);

  const totalBranchCount = useMemo(
    () => GALLERY_SCENES.reduce((n, s) => n + getGalleryBranchesForScene(s.sceneCode).length, 0),
    [],
  );

  const rewardStats = useMemo(() => {
    let unlocked = 0;
    let total = 0;
    for (const scene of GALLERY_SCENES) {
      for (const branch of getGalleryBranchesForScene(scene.sceneCode)) {
        if (branch.type === 'reward') {
          total += 1;
          if (flags[branch.seenFlag]) unlocked += 1;
        }
      }
    }
    return { unlocked, total };
  }, [flags]);

  const currentSceneDef = chapterScenes.find((s) => s.sceneCode === selectedScene);
  const sceneHeading = currentSceneDef
    ? resolveLocalized(resolveGallerySceneTitle(currentSceneDef, sceneTitles[selectedScene]), lang)
    : '';
  const sceneFlavor = currentSceneDef?.flavor
    ? resolveLocalized(currentSceneDef.flavor, lang)
    : undefined;

  return (
    <View style={[styles.root, safeAreaBottom]}>
      <StatusBar style="light" />
      <LinearGradient colors={['#12141a', '#0a0b0f', '#050608']} style={StyleSheet.absoluteFill} />
      <StoryModeTopBar />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => safeGoBack('/story')} hitSlop={8} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>{t('menu.back')}</Text>
            </TouchableOpacity>
            <View style={styles.chapterTabs}>
              {STORY_CHAPTERS.map((ch) => {
                const active = ch.code === chapterCode;
                return (
                  <TouchableOpacity
                    key={ch.code}
                    style={[styles.chapterTab, active && styles.chapterTabActive]}
                    onPress={() => setChapterCode(ch.code)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chapterTabText, active && styles.chapterTabTextActive]}>
                      {t(ch.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.title}>{t('storyHome.gallery')}</Text>
            <Text style={styles.subtitle}>{t('gallery.subtitle')}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerDivider}>
          <DividerStar size={8} color={COLORS.accent.red} opacity={0.85} />
          <View style={styles.headerDividerLine} />
          <DividerStar size={8} color={COLORS.accent.red} opacity={0.85} />
        </View>
      </View>

      <GalleryScenePicker
        scenes={chapterScenes}
        sceneTitles={sceneTitles}
        selectedCode={selectedScene}
        onSelect={setSelectedScene}
        branchStats={branchStats}
        unlockedBranches={unlockedBranchCount}
        totalBranches={totalBranchCount}
      />

      <View style={styles.mapArea}>
        {loading ? (
          <ActivityIndicator color={COLORS.agents.brightGold} style={styles.loader} />
        ) : chapterScenes.length === 0 ? (
          <Text style={styles.empty}>{t('gallery.noScenes')}</Text>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
            >
              <RewardStampTreeMap
                sceneCode={selectedScene}
                sceneTitle={sceneHeading}
                sceneFlavor={sceneFlavor}
                branches={branches}
              />
              <GalleryProgressPanel
                collectedImages={totalCollected}
                totalImages={totalCells}
                unlockedBranches={unlockedBranchCount}
                totalBranches={totalBranchCount}
                unlockedRewards={rewardStats.unlocked}
                totalRewards={rewardStats.total}
              />
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: {
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 72,
  },
  headerLeft: {
    width: 130,
    gap: 8,
    paddingTop: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backArrow: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 14 }, 'mono', lang),
  backText: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 12, letterSpacing: 0.3 }, 'sans', lang),
  chapterTabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    alignSelf: 'flex-start',
  },
  chapterTab: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterTabActive: {
    backgroundColor: COLORS.agents.tabActive,
  },
  chapterTabText: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 11, fontWeight: '600' }, 'sans', lang),
  chapterTabTextActive: { color: COLORS.agents.paleGold, fontWeight: '700' },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  title: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'display', lang
  ),
  subtitle: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 9,
      letterSpacing: 2.5,
      marginTop: 2,
      textAlign: 'center',
    },
    'mono', lang
  ),
  headerSpacer: {
    width: 130,
  },
  headerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  headerDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.agents.border,
  },
  mapArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  loader: { marginTop: 48 },
  empty: Typo({ color: COLORS.agents.paleGoldMuted, textAlign: 'center', marginTop: 48, paddingHorizontal: 24 }, 'sans'),
});
};
