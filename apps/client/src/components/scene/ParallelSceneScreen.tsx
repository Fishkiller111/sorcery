import type { Lang } from '../../i18n/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/safeGoBack';
import { LinearGradient } from 'expo-linear-gradient';
import { getCommonLocalized } from '../../i18n/common';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { StoryModeTopBar } from '../story/StoryModeTopBar';
import { ParallelCutscenePlayer } from './ParallelCutscenePlayer';
import { ParallelGalleryModal } from './ParallelGalleryModal';
import {
  completeParallelScene,
  enterStoryScene,
} from '../../api/story';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { notifyError } from '../../utils/notify';
import { navigateToNextStoryScene } from '../../utils/storyNavigation';
import { useMobileSafeAreaPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { resolveStorySceneListTitle } from '../../constants/storyGalleryCatalog';
import { parallelPlaybackFromServer, PARALLEL_S0_02, PA02_GALLERY_CELLS } from '../../data/s0_02/parallel';
import type { ParallelPlaybackConfig } from '../../data/s0_02/parallel';
import { useStopStoryAudioOnBlur } from '../../hooks/useStopStoryAudioOnBlur';

const PA02_GALLERY_CELLS_LIST = [...PA02_GALLERY_CELLS];

type Props = {
  sceneCode: string;
  replayEnter?: boolean;
};

export function ParallelSceneScreen({
 sceneCode, replayEnter }: Props) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const router = useRouter();
  const safeAreaBottom = useMobileSafeAreaPaddingStyle({ top: false });
  useStopStoryAudioOnBlur();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const matureEnabled = user?.content_tier === 'mature';

  const [loading, setLoading] = useState(true);
  const [storySessionId, setStorySessionId] = useState('');
  const [sceneTitle, setSceneTitle] = useState('');
  const [playback, setPlayback] = useState<ParallelPlaybackConfig>(PARALLEL_S0_02);
  const [alreadySeen, setAlreadySeen] = useState(false);
  const [showCutscene, setShowCutscene] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    enterStoryScene(sceneCode, { replay: replayEnter })
      .then((res) => {
        setStorySessionId(res.story_session_id);
        setSceneTitle(resolveStorySceneListTitle(sceneCode, res.scene_title, lang));
        setAlreadySeen(!!res.already_seen);
        setPlayback(parallelPlaybackFromServer(res.parallel_playback));
        setShowCutscene(true);
      })
      .catch((e) => {
        const msg = e instanceof ApiError ? e.message : t('storyHome.enterFailed');
        notifyError(t('system.error'), msg);
      })
      .finally(() => setLoading(false));
  }, [sceneCode, isLoggedIn, t, replayEnter, lang]);

  const galleryCaption = useMemo(
    () =>
      matureEnabled
        ? getCommonLocalized('storyHome.pa02GalleryCaptionMature')
        : getCommonLocalized('storyHome.pa02GalleryCaptionStandard'),
    [matureEnabled],
  );

  const advanceToNextScene = useCallback(
    (nextSceneCode?: string, nextSceneType?: string) => {
      setAdvancing(true);
      setShowCutscene(false);
      navigateToNextStoryScene(router, nextSceneCode, nextSceneType);
    },
    [router],
  );

  const onComplete = useCallback(async () => {
    setCompleting(true);
    try {
      const res = await completeParallelScene(sceneCode, storySessionId || undefined);
      advanceToNextScene(res.next_scene_code, res.next_scene_type);
    } catch (e) {
      notifyError(t('system.error'), e instanceof ApiError ? e.message : t('errors.unknown'));
      setShowCutscene(true);
      setCompleting(false);
    }
  }, [sceneCode, storySessionId, t, advanceToNextScene]);

  const onSkipReplay = useCallback(async () => {
    if (!alreadySeen) return;
    setCompleting(true);
    try {
      const res = await completeParallelScene(sceneCode);
      advanceToNextScene(res.next_scene_code, res.next_scene_type);
    } catch (e) {
      notifyError(t('system.error'), e instanceof ApiError ? e.message : t('errors.unknown'));
      setCompleting(false);
    }
  }, [alreadySeen, sceneCode, t, advanceToNextScene]);

  if (!isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>{t('login.loginRequired')}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/login')}>
          <Text style={styles.btnText}>{t('login.login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, safeAreaBottom]}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1c1f28', '#0a0b0f']} style={StyleSheet.absoluteFill} />
      <StoryModeTopBar />
      <View style={styles.content}>
        <Text style={styles.kicker}>{t('storyHome.parallel')}</Text>
        <Text style={styles.title}>{sceneTitle || sceneCode}</Text>
        <Text style={styles.desc}>{t('storyHome.parallelDesc')}</Text>
        {loading || completing || advancing ? (
          <ActivityIndicator color={COLORS.accent.gold} style={{ marginTop: 24 }} />
        ) : (
          <>
            {!showCutscene ? (
              <TouchableOpacity style={styles.btn} onPress={() => setShowCutscene(true)}>
                <Text style={styles.btnText}>{t('storyHome.parallelReplay')}</Text>
              </TouchableOpacity>
            ) : null}
            {alreadySeen && !showCutscene ? (
              <TouchableOpacity style={styles.linkBtn} onPress={onSkipReplay}>
                <Text style={styles.linkBtnText}>{t('storyHome.parallelSkipReplay')}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
        <TouchableOpacity style={styles.link} onPress={() => safeGoBack('/story')}>
          <Text style={styles.linkText}>{t('menu.back')}</Text>
        </TouchableOpacity>
      </View>

      <ParallelCutscenePlayer
        playback={playback}
        matureEnabled={matureEnabled}
        visible={showCutscene && !loading && !advancing}
        onComplete={onComplete}
        onHotspot={() => setGalleryOpen(true)}
      />

      <ParallelGalleryModal
        visible={galleryOpen}
        title={getCommonLocalized('storyHome.pa02GalleryTitle')}
        caption={galleryCaption}
        cells={PA02_GALLERY_CELLS_LIST}
        matureEnabled={matureEnabled}
        onClose={() => setGalleryOpen(false)}
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
  content: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  kicker: Typo({ color: COLORS.accent.gold, fontSize: 12, letterSpacing: 2 }, 'mono', lang),
  title: Typo({
    color: COLORS.text.primary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  }, 'display', lang),
  desc: Typo({
    color: COLORS.text.secondary,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 16,
    textAlign: 'center',
  }, 'sans', lang),
  msg: Typo({ color: COLORS.text.secondary, textAlign: 'center' }, 'sans', lang),
  btn: {
    marginTop: 32,
    backgroundColor: COLORS.accent.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: Typo({ color: '#111', fontWeight: '700', fontSize: 15 }, 'sans', lang),
  linkBtn: { marginTop: 16 },
  linkBtnText: Typo({ color: COLORS.accent.gold, fontSize: 14 }, 'sans', lang),
  link: { marginTop: 20 },
  linkText: Typo({ color: COLORS.accent.gold, fontSize: 14 }, 'sans', lang),
});
};
