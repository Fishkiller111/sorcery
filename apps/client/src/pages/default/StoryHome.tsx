import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { StoryModeTopBar } from '../../components/story/StoryModeTopBar';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import { STORY_CHAPTERS } from '../../constants/storyRegistry';
import { safeGoBack } from '../../utils/safeGoBack';
import {
  resolveStoryChapterListTitle,
  resolveStorySceneListTitle,
} from '../../constants/storyGalleryCatalog';
import { getStorySceneThumbKey } from '../../constants/storySceneThumbs';
import { resolveImage } from '../../utils/assets';
import { useStoryHome, type StoryHomeSceneItem } from '../../hooks/useStoryHome';
import type { StoryChapterAccessResp, StoryListScenesResp } from '../../types/story';
import { DefaultMainBackground } from './components/DefaultMainBackground';
import { DefaultCreateAgentDiamond } from './components/create-agent/DefaultCreateAgentDiamond';
import { TOKENS } from './theme/tokens';
import { glassWebStyle } from '../../components/free-chat/freeChatUi';
import { useMobileSafeAreaPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { themedScrollViewProps } from '../../theme/webScrollbar';

const SCENE_ROW_HEIGHT = 88;
const CHAPTER_PAD = 16;

function formatChapterHeading(chapterLabel: string, chapterTitle: string | undefined, fallback: string): string {
  if (!chapterTitle) return chapterLabel || fallback;
  if (chapterTitle.startsWith(chapterLabel)) return chapterTitle;
  return `${chapterLabel} - ${chapterTitle}`;
}

type DefaultStorySceneRowProps = {
  scene: StoryHomeSceneItem;
  width: number;
  onPress: () => void;
  t: (k: string) => string;
  lang: ReturnType<typeof useI18n>['lang'];
};

function DefaultStorySceneRow({ scene, width, onPress, t, lang }: DefaultStorySceneRowProps) {
  const styles = useMemo(() => createStyles(lang), [lang]);
  const locked = !scene.unlocked;
  const displayTitle = resolveStorySceneListTitle(scene.scene_code, scene.title, lang);
  const thumbKey = getStorySceneThumbKey(scene.scene_code);
  const thumbSource = thumbKey ? resolveImage(thumbKey) : undefined;

  const scaled = useMemo(() => {
    const thumbW = Math.round(Math.min(88, width * 0.22));
    const thumbH = Math.round(thumbW * 0.72);
    return { thumbW, thumbH };
  }, [width]);

  const inner = (
    <View style={[styles.sceneRowInner, { minHeight: SCENE_ROW_HEIGHT }]}>
      {locked ? (
        <View style={[styles.thumbLocked, { width: scaled.thumbW, height: scaled.thumbH }]}>
          <Ionicons name="lock-closed" size={Math.round(scaled.thumbH * 0.36)} color={TOKENS.colors.textMuted} />
        </View>
      ) : thumbSource ? (
        <View style={[styles.thumb, { width: scaled.thumbW, height: scaled.thumbH }]}>
          <ExpoImage source={thumbSource} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { width: scaled.thumbW, height: scaled.thumbH }]} />
      )}

      <View style={[styles.sceneTextCol, locked && styles.sceneTextColLocked]}>
        <Text style={styles.sceneCode}>{scene.scene_code}</Text>
        <Text style={[styles.sceneTitle, locked && styles.sceneTitleLocked]} numberOfLines={2}>
          {locked ? t('storyHome.maskedTitle') : displayTitle}
        </Text>
      </View>

      {locked ? (
        <Text style={styles.classified}>{t('storyHome.classified')}</Text>
      ) : (
        <View style={styles.playBtn}>
          <Text style={styles.playBtnText}>
            {scene.cleared ? t('storyHome.replayAction') : t('storyHome.playAction')}
          </Text>
          <Ionicons name="play" size={12} color={TOKENS.colors.text} />
        </View>
      )}
    </View>
  );

  if (locked) {
    return (
      <View style={[styles.sceneRow, { width }]} accessibilityState={{ disabled: true }}>
        {inner}
      </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.sceneRow, { width }]}>
      {inner}
    </TouchableOpacity>
  );
}

type DefaultStoryChapterBlockProps = {
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
  onEnterScene: (scene: StoryHomeSceneItem) => void;
  t: (k: string) => string;
  lang: ReturnType<typeof useI18n>['lang'];
};

function DefaultStoryChapterBlock({
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
}: DefaultStoryChapterBlockProps) {
  const styles = useMemo(() => createStyles(lang), [lang]);
  const catalogChapterTitle = resolveStoryChapterListTitle(chapterCode, data?.chapter_title, lang);
  const displayTitle =
    catalogChapterTitle !== (data?.chapter_title || chapterCode)
      ? catalogChapterTitle
      : formatChapterHeading(chapterLabel, data?.chapter_title, chapterTitle);
  const sceneRowWidth = cardWidth - CHAPTER_PAD * 2;
  const temporarilyUnavailable = access?.reason === 'temporarily_unavailable';
  const canPointsUnlock =
    !temporarilyUnavailable && locked && access?.reason === 'requires_unlock' && !!access?.cost_points;

  return (
    <View style={[styles.chapterCard, { width: cardWidth }]}>
      <View style={styles.chapterHeader}>
        <View style={styles.chapterTitleRow}>
          <DefaultCreateAgentDiamond size={7} />
          <Text style={styles.chapterTitle} numberOfLines={2}>
            {displayTitle}
          </Text>
        </View>
        {data?.chapter_clear ? <Text style={styles.chapterClearBadge}>{t('storyHome.chapterClear')}</Text> : null}
        {showDebugReset ? (
          <TouchableOpacity onPress={onDebugReset} hitSlop={8}>
            <Text style={styles.debugReset}>{t('storyHome.debugReset')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {temporarilyUnavailable ? (
        <Text style={styles.comingSoon}>{t('storyHome.chapterComingSoon')}</Text>
      ) : null}

      {canPointsUnlock ? (
        <TouchableOpacity style={styles.unlockBtn} onPress={onUnlock} activeOpacity={0.82}>
          <Text style={styles.unlockBtnText}>
            {t('storyHome.unlockPoints').replace('{cost}', String(access.cost_points))}
          </Text>
        </TouchableOpacity>
      ) : null}

      {!temporarilyUnavailable
        ? data?.scenes.map((scene) => (
            <DefaultStorySceneRow
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
  );
}

function DefaultStoryStatusBar({
  width,
  points,
  vipActive,
  onWorldviewPress,
  onGalleryPress,
  t,
}: {
  width: number;
  points: number;
  vipActive: boolean;
  onWorldviewPress: () => void;
  onGalleryPress: () => void;
  t: (k: string) => string;
}) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  return (
    <View style={[styles.statusWrap, { width }]}>
      <View style={styles.statusMetrics}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('storyHome.points')}</Text>
          <Text style={styles.metricValue}>{points}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('storyHome.vipStatusLabel')}</Text>
          <Text style={[styles.metricValue, styles.metricValueSm]}>
            {vipActive ? t('storyHome.vipOk') : t('storyHome.vipNo')}
          </Text>
          {vipActive ? (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={TOKENS.colors.accent}
              style={styles.vipIcon}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.quickLinks}>
        <TouchableOpacity onPress={onWorldviewPress} activeOpacity={0.75} style={styles.quickLink}>
          <Text style={styles.quickLinkText}>{t('freeChat.worldviewEncyclopedia')}</Text>
          <Ionicons name="chevron-forward" size={14} color={TOKENS.colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onGalleryPress} activeOpacity={0.75} style={styles.quickLink}>
          <Text style={styles.quickLinkText}>{t('storyHome.gallery')}</Text>
          <Ionicons name="chevron-forward" size={14} color={TOKENS.colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DefaultStoryGate({
  title,
  desc,
  actionLabel,
  onAction,
}: {
  title: string;
  desc?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const safeAreaBottom = useMobileSafeAreaPaddingStyle({ top: false });
  return (
    <View style={[styles.gate, safeAreaBottom]}>
      <DefaultMainBackground />
      <View style={styles.gateCard}>
        <Text style={styles.gateTitle}>{title}</Text>
        {desc ? <Text style={styles.gateDesc}>{desc}</Text> : null}
        <TouchableOpacity style={styles.gateBtn} onPress={onAction} activeOpacity={0.82}>
          <Text style={styles.gateBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function DefaultStoryHome() {
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
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  if (!isLoggedIn) {
    return (
      <DefaultStoryGate
        title={t('login.loginRequired')}
        actionLabel={t('login.login')}
        onAction={() => router.push('/login')}
      />
    );
  }

  if (!isDevUser) {
    return (
      <DefaultStoryGate
        title={t('storyHome.devOnlyTitle')}
        desc={t('storyHome.devOnlyDesc')}
        actionLabel={t('menu.back')}
        onAction={() => safeGoBack('/story', router)}
      />
    );
  }

  return (
    <View style={[styles.root, safeAreaBottom]}>
      <StatusBar style="light" />
      <DefaultMainBackground />
      <StoryModeTopBar variant="default" />

      <ScrollView
        {...scrollWebProps}
        style={[styles.scroll, scrollWebProps.style]}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: scrollPaddingHorizontal }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { width: contentWidth, alignSelf: 'center' }]}>
          <Text style={[styles.pageTitle, isDesktop && styles.pageTitleDesktop]}>{t('storyHome.title')}</Text>

          <DefaultStoryStatusBar
            width={cardWidth}
            points={points}
            vipActive={vipActive}
            onWorldviewPress={openStoryWorldview}
            onGalleryPress={openGallery}
            t={t}
          />

          {loading ? (
            <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />
          ) : (
            STORY_CHAPTERS.map((ch) => {
              const data = chapters[ch.code];
              const acc = access[ch.code];
              const chapterLocked = !!(acc && !acc.unlocked && !acc.accessible);
              return (
                <DefaultStoryChapterBlock
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
                    openResetConfirm(ch.code, resolveStoryChapterListTitle(ch.code, data?.chapter_title, lang))
                  }
                  onEnterScene={(scene) => enterScene(scene, ch.code)}
                  t={t}
                  lang={lang}
                />
              );
            })
          )}

          <TouchableOpacity style={styles.prologueLink} onPress={() => router.push('/prologue')}>
            <Text style={styles.prologueLinkText}>{t('storyHome.prologueIntro')}</Text>
            <Ionicons name="chevron-forward" size={14} color={TOKENS.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ThemedGeneralConfirmModal
        visible={unlockTarget != null}
        icon="star"
        title={t('storyHome.unlockTitle')}
        subtitle={
          unlockTarget
            ? t('storyHome.unlockConfirm')
                .replace('{cost}', String(access[unlockTarget]?.cost_points ?? 0))
                .replace(
                  '{title}',
                  resolveStoryChapterListTitle(unlockTarget, access[unlockTarget]?.chapter_title, lang),
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

      <ThemedGeneralConfirmModal
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

      <ThemedGeneralConfirmModal
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

const glassCard = {
  backgroundColor: TOKENS.colors.card,
  borderWidth: 1,
  borderColor: TOKENS.colors.cardBorder,
  borderRadius: TOKENS.radius.cardLg,
  ...glassWebStyle,
} as const;

function createStyles(lang: Lang) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 48 },
  content: { gap: 20 },
  pageTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 26,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 4,
      letterSpacing: 0.3,
    },
    'display', lang
  ),
  pageTitleDesktop: {
    fontSize: 32,
  },
  statusWrap: {
    ...glassCard,
    padding: 16,
    gap: 14,
    alignSelf: 'center',
  },
  statusMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.cardSolid,
    gap: 4,
    position: 'relative',
  },
  metricLabel: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono', lang
  ),
  metricValue: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    'display', lang
  ),
  metricValueSm: {
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  vipIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.lineFaint,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickLinkText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 13, fontWeight: '600' }, 'sans'),
  chapterCard: {
    ...glassCard,
    padding: CHAPTER_PAD,
    gap: 10,
    alignSelf: 'center',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  chapterTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minWidth: 0,
  },
  chapterTitle: Typo(
    {
      flex: 1,
      color: TOKENS.colors.text,
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 22,
    },
    'display', lang
  ),
  chapterClearBadge: Typo(
    {
      color: '#4ade80',
      fontSize: 10,
      letterSpacing: 0.5,
      flexShrink: 0,
    },
    'mono', lang
  ),
  debugReset: Typo(
    {
      color: '#f87171',
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      flexShrink: 0,
      maxWidth: 100,
      textAlign: 'right',
    },
    'mono', lang
  ),
  comingSoon: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      paddingVertical: 12,
    },
    'sans', lang
  ),
  unlockBtn: {
    backgroundColor: TOKENS.colors.inviteBanner,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    paddingVertical: 11,
    alignItems: 'center',
  },
  unlockBtnText: Typo({ color: TOKENS.colors.text, fontWeight: '700', fontSize: 13 }, 'sans'),
  sceneRow: {
    ...glassCard,
    borderRadius: TOKENS.radius.card,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  sceneRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  thumb: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    flexShrink: 0,
  },
  thumbFallback: {
    backgroundColor: TOKENS.colors.bgElevated,
  },
  thumbLocked: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    flexShrink: 0,
  },
  sceneTextCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
    minWidth: 0,
  },
  sceneTextColLocked: {
    opacity: 0.88,
  },
  sceneCode: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'lowercase',
    },
    'mono', lang
  ),
  sceneTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.15,
    },
    'sans', lang
  ),
  sceneTitleLocked: {
    color: 'rgba(196, 112, 112, 0.92)',
  },
  classified: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
      textTransform: 'uppercase',
      flexShrink: 0,
      opacity: 0.75,
    },
    'mono', lang
  ),
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TOKENS.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: TOKENS.radius.button,
    flexShrink: 0,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer' } as object)
      : {}),
  },
  playBtnText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'mono', lang
  ),
  loader: { marginTop: 40 },
  prologueLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
  },
  prologueLinkText: Typo({ color: TOKENS.colors.textMuted, fontSize: 13 }, 'sans'),
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: TOKENS.colors.bg,
  },
  gateCard: {
    ...glassCard,
    width: '100%',
    maxWidth: 400,
    padding: 28,
    gap: 14,
    alignItems: 'center',
  },
  gateTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
    },
    'display', lang
  ),
  gateDesc: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    'sans', lang
  ),
  gateBtn: {
    marginTop: 8,
    backgroundColor: TOKENS.colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: TOKENS.radius.button,
  },
  gateBtnText: Typo({ color: TOKENS.colors.text, fontWeight: '700', fontSize: 15 }, 'sans'),
});
};
