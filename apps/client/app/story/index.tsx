import type { Lang } from '../../src/i18n/types';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../src/utils/safeGoBack';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useI18n } from '../../src/i18n/I18nContext';
import { COLORS } from '../../src/theme/colors';
import { Typo, FONT_FAMILY } from '../../src/theme/typography';
import { useThemePage } from '../../src/theme/useThemePage';
import { StoryModeTopBar } from '../../src/components/story/StoryModeTopBar';
import { PageBackground } from '../../src/components/ui/PageBackground';
import { DividerStar } from '../../src/components/ui/DividerStar';
import { GeneralConfirmModal } from '../../src/components/ui/GeneralConfirmModal';
import { STORY_CHAPTERS } from '../../src/constants/storyRegistry';
import {
  resolveStoryChapterListTitle,
  resolveStorySceneListTitle,
} from '../../src/constants/storyGalleryCatalog';
import { getStorySceneThumbKey } from '../../src/constants/storySceneThumbs';
import { resolveImage } from '../../src/utils/assets';
import { useStoryHome, type StoryHomeSceneItem } from '../../src/hooks/useStoryHome';
import { DefaultStoryHome } from '../../src/pages/default/StoryHome';
import type { StoryChapterAccessResp, StoryListScenesResp } from '../../src/types/story';
import { useMobileSafeAreaPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';
const SCENE_ROW_HEIGHT = 88;
const STATUS_BAR_MIN_HEIGHT = 112;
const STATUS_METRIC_HEIGHT = 62;

const EMBLEM_BADGE = require('../../assets/images/ui/agents/emblem_cccp_badge.png');
const SEAL_ACTIVE = require('../../assets/images/ui/mode-select/seal_confirmed_large.png');
const SEAL_IDLE = require('../../assets/images/ui/mode-select/seal_standby_large.png');
const SCENE_ROW_BG = require('../../assets/images/ui/story/scene_row_bg.png');
const SCENE_ROW_LOCKED_BG = require('../../assets/images/ui/story/scene_row_locked_bg.png');
const STATUS_BAR_BG = require('../../assets/images/ui/story/status_bar_bg.png');
const CHAPTER_PANEL_BG = require('../../assets/images/ui/story/chapter_panel_bg.png');

const CHAPTER_CONTENT_PAD = 34;

/** 纸面档案文字色 — 对齐剧情首页设计稿 */
const PAPER_INK = '#2A2522';
const PAPER_INK_MUTED = '#554F4A';
const PAPER_LABEL = '#4A4238';
const PAPER_ACTION = '#8B2318';

type SceneItem = StoryHomeSceneItem;

function formatChapterHeading(chapterLabel: string, chapterTitle: string | undefined, fallback: string): string {
  if (!chapterTitle) return chapterLabel || fallback;
  if (chapterTitle.startsWith(chapterLabel)) return chapterTitle;
  return `${chapterLabel} · ${chapterTitle}`;
}

type StorySceneRowProps = {
  scene: SceneItem;
  width: number;
  onPress: () => void;
  t: (k: string) => string;
  lang: ReturnType<typeof useI18n>['lang'];
};

/** 锁定场景遮罩标题 — 淡红 */
const LOCKED_TITLE_COLOR = 'rgba(196, 112, 112, 0.92)';

function StorySceneRow({ scene, width, onPress, t, lang }: StorySceneRowProps) {
  const styles = useMemo(() => createStyles(lang), [lang]);
  const locked = !scene.unlocked;
  const displayTitle = resolveStorySceneListTitle(scene.scene_code, scene.title, lang);
  const thumbKey = getStorySceneThumbKey(scene.scene_code);
  const thumbSource = thumbKey ? resolveImage(thumbKey) : undefined;

  const scaled = useMemo(() => {
    const thumbW = Math.round(Math.min(96, width * 0.22));
    const thumbH = Math.round(thumbW * 0.72);
    return {
      thumbW,
      thumbH,
      codeSize: 11,
      titleSize: 15,
      actionSize: 12,
      stampSize: 15,
      stampLineHeight: 18,
    };
  }, [width]);

  const rowContent = (
    <View style={[styles.sceneRowInner, { minHeight: SCENE_ROW_HEIGHT }]}>
      <ExpoImage
        source={locked ? SCENE_ROW_LOCKED_BG : SCENE_ROW_BG}
        style={styles.sceneRowBg}
        contentFit="fill"
        pointerEvents="none"
      />

      {locked ? (
        <View style={[styles.thumbLockedIcon, { width: scaled.thumbW, height: scaled.thumbH }]}>
          <Ionicons
            name="lock-closed"
            size={Math.round(scaled.thumbH * 0.38)}
            color={COLORS.agents.paleGoldMuted}
          />
        </View>
      ) : thumbSource ? (
        <View style={[styles.thumbBox, { width: scaled.thumbW, height: scaled.thumbH }]}>
          <ExpoImage source={thumbSource} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
      ) : (
        <View style={[styles.thumbBox, styles.thumbFallback, { width: scaled.thumbW, height: scaled.thumbH }]} />
      )}

      <View style={[styles.sceneTextCol, locked && styles.sceneTextColLocked]}>
        <Text
          style={[
            styles.sceneCode,
            {
              fontSize: scaled.codeSize,
              lineHeight: scaled.codeSize * 1.3,
              color: locked ? COLORS.agents.paleGoldMuted : PAPER_INK_MUTED,
            },
          ]}
        >
          {scene.scene_code}
        </Text>
        <Text
          style={[
            styles.sceneTitle,
            {
              fontSize: scaled.titleSize,
              lineHeight: scaled.titleSize * 1.15,
              color: locked ? LOCKED_TITLE_COLOR : PAPER_INK,
            },
          ]}
          numberOfLines={2}
        >
          {locked ? t('storyHome.maskedTitle') : displayTitle}
        </Text>
      </View>

      {locked ? (
        <View style={styles.classifiedStamp}>
          <Text
            style={[
              styles.classifiedText,
              { fontSize: scaled.stampSize, lineHeight: scaled.stampLineHeight },
            ]}
          >
            {t('storyHome.classified')}
          </Text>
        </View>
      ) : (
        <View style={styles.playActionWrap}>
          <Text style={[styles.playAction, { fontSize: scaled.actionSize, color: PAPER_ACTION }]}>
            {scene.cleared ? t('storyHome.replayAction') : t('storyHome.playAction')}
          </Text>
          <Ionicons name="play" size={scaled.actionSize} color={PAPER_ACTION} />
        </View>
      )}
    </View>
  );

  if (locked) {
    return (
      <View style={[styles.sceneRowOuter, styles.sceneRowOuterLocked, { width }]} accessibilityState={{ disabled: true }}>
        {rowContent}
      </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={[styles.sceneRowOuter, { width }]}>
      {rowContent}
    </TouchableOpacity>
  );
}

type StoryChapterBlockProps = {
  chapterCode: string;
  chapterLabel: string;
  chapterTitle: string;
  cardWidth: number;
  data?: StoryListScenesResp;
  access?: StoryChapterAccessResp;
  locked: boolean;
  showDebugReset: boolean;
  onUnlock: () => void;
  onDebugReset: () => void;
  onEnterScene: (scene: SceneItem) => void;
  t: (k: string) => string;
  lang: ReturnType<typeof useI18n>['lang'];
};

function StoryChapterBlock({
  chapterCode,
  chapterLabel,
  chapterTitle,
  cardWidth,
  data,
  access,
  locked,
  showDebugReset,
  onUnlock,
  onDebugReset,
  onEnterScene,
  t,
  lang,
}: StoryChapterBlockProps) {
  const styles = useMemo(() => createStyles(lang), [lang]);
  const catalogChapterTitle = resolveStoryChapterListTitle(chapterCode, data?.chapter_title, lang);
  const displayTitle =
    catalogChapterTitle !== (data?.chapter_title || chapterCode)
      ? catalogChapterTitle
      : formatChapterHeading(chapterLabel, data?.chapter_title, chapterTitle);
  const sceneRowWidth = cardWidth - CHAPTER_CONTENT_PAD * 2;
  const temporarilyUnavailable = access?.reason === 'temporarily_unavailable';
  const canPointsUnlock =
    !temporarilyUnavailable && locked && access?.reason === 'requires_unlock' && !!access?.cost_points;

  return (
    <View style={[styles.chapterBlockOuter, { width: cardWidth }]}>
      <View style={styles.chapterBlockInner}>
        <ExpoImage source={CHAPTER_PANEL_BG} style={styles.sceneRowBg} contentFit="fill" pointerEvents="none" />
        <View style={styles.chapterHeaderBar}>
          <DividerStar size={12} color={COLORS.soviet.embroideryLight} />
          <Text style={styles.chapterHeaderTitle} numberOfLines={2}>
            {displayTitle}
          </Text>
          {data?.chapter_clear ? (
            <Text style={styles.chapterClearBadge}>{t('storyHome.chapterClear')}</Text>
          ) : null}
          {showDebugReset ? (
            <TouchableOpacity onPress={onDebugReset} hitSlop={8} style={styles.debugResetLink}>
              <Text style={styles.debugResetLinkText}>{t('storyHome.debugReset')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.chapterPaperStack}>
          {temporarilyUnavailable ? (
            <Text style={styles.comingSoonText}>{t('storyHome.chapterComingSoon')}</Text>
          ) : null}

          {canPointsUnlock ? (
            <TouchableOpacity style={styles.unlockBtn} onPress={onUnlock}>
              <Text style={styles.unlockText}>
                {t('storyHome.unlockPoints').replace('{cost}', String(access.cost_points))}
              </Text>
            </TouchableOpacity>
          ) : null}

          {!temporarilyUnavailable
            ? data?.scenes.map((scene) => (
                <StorySceneRow
                  key={scene.scene_code}
                  scene={scene}
                  width={sceneRowWidth}
                  onPress={() => onEnterScene(scene)}
                  t={t}
                  lang={lang}
                />
              ))
            : null}
        </View>
      </View>
    </View>
  );
}

type StoryStatusBarProps = {
  width: number;
  points: number;
  vipActive: boolean;
  onWorldviewPress: () => void;
  onGalleryPress: () => void;
  t: (k: string) => string;
};

function StatusMetricCard({
  children,
  sealSource,
  sealSize,
  sealOpacity = 1,
}: {
  children: React.ReactNode;
  sealSource?: ImageSourcePropType;
  sealSize?: number;
  sealOpacity?: number;
}) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  return (
    <View style={styles.statusMetricOuter}>
      <View style={styles.statusMetricInner}>
        <ExpoImage source={SCENE_ROW_BG} style={styles.sceneRowBg} contentFit="fill" pointerEvents="none" />
        <View style={styles.statusCol}>{children}</View>
        {sealSource && sealSize ? (
          <Image
            source={sealSource}
            style={[
              styles.statusMetricSeal,
              {
                width: sealSize,
                height: sealSize,
                opacity: sealOpacity,
              },
            ]}
            resizeMode="contain"
          />
        ) : null}
      </View>
    </View>
  );
}

function StoryStatusBar({ width, points, vipActive, onWorldviewPress, onGalleryPress, t }: StoryStatusBarProps) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const sealSize = Math.round(Math.min(40, width * 0.085));

  return (
    <View style={[styles.statusBarOuter, { width }]}>
      <View style={[styles.statusBarInner, { minHeight: STATUS_BAR_MIN_HEIGHT }]}>
        <ExpoImage source={STATUS_BAR_BG} style={styles.sceneRowBg} contentFit="fill" pointerEvents="none" />
        <View style={styles.statusContent}>
          <View style={styles.statusMetricsRow}>
            <StatusMetricCard>
              <Text style={[styles.statusLabel, { color: PAPER_LABEL }]}>{t('storyHome.points')}</Text>
              <Text style={[styles.pointsValue, { color: PAPER_ACTION }]}>{points}</Text>
            </StatusMetricCard>
            <StatusMetricCard
              sealSource={vipActive ? SEAL_ACTIVE : SEAL_IDLE}
              sealSize={sealSize}
              sealOpacity={vipActive ? 1 : 0.55}
            >
              <Text style={[styles.statusLabel, { color: PAPER_LABEL }]}>{t('storyHome.vipStatusLabel')}</Text>
              <Text style={[styles.vipStatus, { color: PAPER_ACTION }]}>
                {vipActive ? t('storyHome.vipOk') : t('storyHome.vipNo')}
              </Text>
            </StatusMetricCard>
          </View>
          <View style={styles.quickLinks}>
            <TouchableOpacity onPress={onWorldviewPress} activeOpacity={0.75}>
              <Text style={[styles.quickLinkText, { color: PAPER_INK }]}>
                {t('freeChat.worldviewEncyclopedia')}{' '}
                <Text style={{ color: PAPER_ACTION }}>→</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onGalleryPress} activeOpacity={0.75}>
              <Text style={[styles.quickLinkText, { color: PAPER_INK }]}>
                {t('storyHome.gallery')}{' '}
                <Text style={{ color: PAPER_ACTION }}>→</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function StoryHomeHeader({ emblemSize, titleSize }: { emblemSize: number; titleSize: number }) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);

  return (
    <View style={styles.header}>
      <Image source={EMBLEM_BADGE} style={{ width: emblemSize, height: emblemSize }} resizeMode="contain" />
      <View style={styles.titleRow}>
        <DividerStar size={14} color={COLORS.soviet.embroideryLight} />
        <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.1 }]}>{t('storyHome.title')}</Text>
        <DividerStar size={14} color={COLORS.soviet.embroideryLight} />
      </View>
    </View>
  );
}

export default function StoryHomeScreen() {
  const ThemedPage = useThemePage({ default: DefaultStoryHome });
  if (ThemedPage) return <ThemedPage />;
  return <SovietStoryHomeScreen />;
}

function SovietStoryHomeScreen() {
  const {
    t,
    lang,
    router,
    isDesktop,
    isLoggedIn,
    isDevUser,
    loading,
    refreshing,
    points,
    chapters,
    access,
    contentWidth,
    cardWidth,
    scrollPaddingHorizontal,
    unlockTarget,
    unlockLoading,
    vipLockedMessage,
    debugResetTarget,
    debugResetLoading,
    vipActive,
    onRefresh,
    unlockChapter,
    confirmUnlockChapter,
    enterScene,
    openResetConfirm,
    confirmResetChapter,
    openStoryWorldview,
    openGallery,
    setUnlockTarget,
    setVipLockedMessage,
    setDebugResetTarget,
  } = useStoryHome();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const safeAreaBottom = useMobileSafeAreaPaddingStyle({ top: false });

  const emblemSize = Math.round(Math.min(56, contentWidth * 0.12));
  const titleSize = Math.round(Math.min(28, contentWidth * 0.062));

  if (!isLoggedIn) {
    return (
      <View style={[styles.center, safeAreaBottom]}>
        <Text style={styles.msg}>{t('login.loginRequired')}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')}>
          <Text style={styles.primaryBtnText}>{t('login.login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isDevUser) {
    return (
      <View style={[styles.center, safeAreaBottom]}>
        <Text style={styles.msg}>{t('storyHome.devOnlyTitle')}</Text>
        <Text style={[styles.msg, { marginTop: 8, opacity: 0.75 }]}>{t('storyHome.devOnlyDesc')}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => safeGoBack('/story')}>
          <Text style={styles.primaryBtnText}>{t('menu.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, safeAreaBottom]}>
      <StatusBar style="light" />
      <PageBackground variant="modes" />
      <StoryModeTopBar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: scrollPaddingHorizontal }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.soviet.stainLight} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { width: contentWidth, alignSelf: 'center' }]}>
          <StoryHomeHeader emblemSize={emblemSize} titleSize={titleSize} />

          <StoryStatusBar
            width={cardWidth}
            points={points}
            vipActive={vipActive}
            onWorldviewPress={openStoryWorldview}
            onGalleryPress={openGallery}
            t={t}
          />

          {loading ? (
            <ActivityIndicator color={COLORS.soviet.stainLight} style={{ marginTop: 40 }} />
          ) : (
            STORY_CHAPTERS.map((ch) => {
              const data = chapters[ch.code];
              const acc = access[ch.code];
              const chapterLocked = !!(acc && !acc.unlocked && !acc.accessible);
              return (
                <StoryChapterBlock
                  key={ch.code}
                  chapterCode={ch.code}
                  chapterLabel={t(ch.labelKey)}
                  chapterTitle={ch.code}
                  cardWidth={cardWidth}
                  data={data}
                  access={acc}
                  locked={chapterLocked}
                  showDebugReset={isDevUser}
                  onUnlock={() => unlockChapter(ch.code)}
                  onDebugReset={() =>
                    openResetConfirm(
                      ch.code,
                      resolveStoryChapterListTitle(ch.code, data?.chapter_title, lang),
                    )
                  }
                  onEnterScene={(scene) => enterScene(scene, ch.code)}
                  t={t}
                  lang={lang}
                />
              );
            })
          )}

          <TouchableOpacity style={styles.prologueLink} onPress={() => router.push('/prologue')}>
            <Text style={styles.prologueLinkText}>{t('storyHome.prologueIntro')} →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <GeneralConfirmModal
        visible={unlockTarget != null}
        icon="star"
        title={t('storyHome.unlockTitle')}
        subtitle={
          unlockTarget
            ? t('storyHome.unlockConfirm')
                .replace('{cost}', String(access[unlockTarget]?.cost_points ?? 0))
                .replace(
                  '{title}',
                  resolveStoryChapterListTitle(
                    unlockTarget,
                    access[unlockTarget]?.chapter_title,
                    lang,
                  ),
                )
            : undefined
        }
        subtitleTone="warning"
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('storyHome.unlock')}
        onCancel={() => {
          if (!unlockLoading) setUnlockTarget(null);
        }}
        onConfirm={() => void confirmUnlockChapter()}
        loading={unlockLoading}
      />

      <GeneralConfirmModal
        visible={vipLockedMessage != null}
        icon="warning"
        title={t('vip.shop.storyLocked')}
        subtitle={vipLockedMessage ?? undefined}
        subtitleTone="body"
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('vip.shop.title')}
        onCancel={() => setVipLockedMessage(null)}
        onConfirm={() => {
          setVipLockedMessage(null);
          router.push('/vip/shop');
        }}
      />

      <GeneralConfirmModal
        visible={debugResetTarget != null}
        icon="trash"
        title={t('storyHome.debugResetTitle')}
        subtitle={
          debugResetTarget
            ? t('storyHome.debugResetConfirm').replace('{title}', debugResetTarget.title)
            : undefined
        }
        subtitleTone="warning"
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('storyHome.debugReset')}
        onCancel={() => {
          if (!debugResetLoading) setDebugResetTarget(null);
        }}
        onConfirm={() => void confirmResetChapter()}
        loading={debugResetLoading}
      />
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg.primary },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: COLORS.bg.primary,
  },
  scrollView: { flex: 1 },
  scroll: { paddingTop: 12, paddingBottom: 48 },
  content: { gap: 4 },
  header: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  title: Typo(
    {
      color: COLORS.soviet.parchment,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
      flexShrink: 1,
    },
    'display', lang
  ),
  statusBarOuter: {
    alignSelf: 'center',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  statusBarInner: {
    overflow: 'hidden',
    position: 'relative',
  },
  statusContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  statusMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  statusMetricOuter: {
    flex: 1,
    borderRadius: 4,
    minWidth: 0,
  },
  statusMetricInner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: STATUS_METRIC_HEIGHT,
    gap: 6,
  },
  statusCol: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  statusLabel: Typo(
    {
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono', lang
  ),
  pointsValue: Typo(
    {
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    'display', lang
  ),
  vipStatus: Typo(
    {
      fontSize: 15,
      lineHeight: 24,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    'sans', lang
  ),
  statusMetricSeal: {
    flexShrink: 0,
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(44, 38, 32, 0.12)',
  },
  quickLinkText: Typo({ fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }, 'mono'),
  chapterBlockOuter: {
    alignSelf: 'center',
    marginBottom: 22,
    borderRadius: 4,
    overflow: 'hidden',
  },
  chapterBlockInner: {
    position: 'relative',
    overflow: 'hidden',
  },
  chapterHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: CHAPTER_CONTENT_PAD,
  },
  chapterPaperStack: {
    gap: 8,
    paddingHorizontal: CHAPTER_CONTENT_PAD,
    paddingBottom: 14,
  },
  chapterHeaderTitle: Typo(
    {
      color: COLORS.soviet.parchment,
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
      letterSpacing: 0.3,
    },
    'sans', lang
  ),
  chapterClearBadge: Typo({ color: '#4ade80', fontSize: 10, letterSpacing: 0.5 }, 'mono'),
  debugResetLink: { flexShrink: 0, maxWidth: '38%' },
  debugResetLinkText: Typo(
    {
      color: '#f87171',
      fontSize: 9,
      fontWeight: '600',
      textAlign: 'right',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    'mono', lang
  ),
  comingSoonText: Typo(
    {
      color: COLORS.soviet.parchmentDark,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      paddingVertical: 14,
      paddingHorizontal: 8,
      opacity: 0.85,
    },
    'sans', lang
  ),
  unlockBtn: {
    backgroundColor: COLORS.soviet.stainLight,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(107, 76, 30, 0.45)',
  },
  unlockText: Typo({ color: '#1a1510', fontWeight: '700', fontSize: 13, letterSpacing: 0.4 }, 'sans'),
  sceneRowOuter: {
    alignSelf: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sceneRowOuterLocked: {
    cursor: 'not-allowed',
  } as object,
  sceneRowInner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
    overflow: 'hidden',
  },
  sceneRowBg: {
    ...StyleSheet.absoluteFill,
  },
  thumbBox: {
    zIndex: 2,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg.elevated,
  },
  thumbLockedIcon: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    
  },
  thumbFallback: {
    backgroundColor: COLORS.bg.subtle,
  },
  sceneTextCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
    zIndex: 2,
  },
  sceneTextColLocked: {
    opacity: 0.92,
  },
  sceneCode: Typo(
    {
      letterSpacing: 0.6,
      textTransform: 'lowercase',
    },
    'mono', lang
  ),
  sceneTitle: {
    fontFamily: FONT_FAMILY.sansBold,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  playActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  playAction: Typo(
    {
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      flexShrink: 0,
    },
    'mono', lang
  ),
  classifiedStamp: {
    zIndex: 2,
    flexShrink: 0,
    borderWidth: 2,
    borderColor: 'rgba(158,27,27,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: '-8deg' }],
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  classifiedText: Typo(
    {
      color: COLORS.agents.tabActive,
      fontWeight: '900',
      letterSpacing: 3,
    },
    'display', lang
  ),
  prologueLink: { marginTop: 12, alignItems: 'center' },
  prologueLinkText: Typo({ color: COLORS.text.secondary, fontSize: 13, letterSpacing: 0.3 }, 'sans'),
  msg: Typo({ color: COLORS.text.secondary, textAlign: 'center' }, 'sans', lang),
  primaryBtn: {
    backgroundColor: COLORS.accent.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: Typo({ color: '#111', fontWeight: '700' }, 'sans', lang),
});
};
