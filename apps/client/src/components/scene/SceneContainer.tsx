import type { Lang } from '../../i18n/types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/safeGoBack';
import { SceneConfig, BeatId } from '../../engine/types';
import { useStoryServerScene } from '../../hooks/useStoryServerScene';
import { useStopStoryAudioOnBlur } from '../../hooks/useStopStoryAudioOnBlur';
import { useVoiceAsr } from '../../hooks/useVoiceAsr';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../i18n/I18nContext';
import { resolveLocalized } from '../../i18n/utils';
import { resolveStoryImageSource } from '../../utils/assets';
import { BackgroundLayer } from './BackgroundLayer';
import { GrainOverlay } from '../common/GrainOverlay';
import { SceneTopHud } from './SceneTopHud';
import { ChatLayer } from './ChatLayer';
import { QuickPhrases } from './QuickPhrases';
import { ChatInputBar } from '../ui/ChatInputBar';
import { RewardHint } from './RewardHint';
import { RewardPlayer } from './RewardPlayer';
import { MatureGate } from './MatureGate';
import { MatureConfirmModal } from '../settings/MatureConfirmModal';
import { BadEndPlayer } from './BadEndPlayer';
import { SceneClearCard } from './SceneClearCard';
import { ProloguePaywall } from '../story/ProloguePaywall';
import { StorySceneTransitionCard } from './StorySceneTransitionCard';
import { StoryModeTopBar } from '../story/StoryModeTopBar';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { navigateToNextStoryScene, STORY_SCENE_AUTO_ADVANCE_MS } from '../../utils/storyNavigation';
import { useStoryScenePresentation } from '../../hooks/useStoryScenePresentation';
import { VisualInsertOverlay } from './VisualInsertOverlay';
import { StoryStuckHelpModal } from './StoryStuckHelpModal';
import { STORY_STUCK_ROUNDS_THRESHOLD } from '../../constants/config';
import { useMobileSafeAreaPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';

interface SceneContainerProps {
  config: SceneConfig;
  jumpToBeat?: BeatId;
  forceNewEnter?: boolean;
  replayEnter?: boolean;
}

export function SceneContainer({
 config, forceNewEnter, replayEnter }: SceneContainerProps) {
  const { lang, t } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const router = useRouter();
  const safeAreaBottom = useMobileSafeAreaPaddingStyle({ top: false });
  useStopStoryAudioOnBlur();
  const isDevUser = useAuthStore((s) => s.user?.is_dev === true);
  const user = useAuthStore((s) => s.user);
  const {
    state,
    loaded,
    loadError,
    send,
    interruptGeneration,
    setMature,
    restart,
    isGenerating,
    awaitingAssistantReply,
    showTurnProgress,
    respondingAgentId,
    badEnd,
    dismissBadEnd,
    showClear,
    sceneClearInfo,
    storyImage,
    dismissStoryImage,
    contentTier,
    applySessionMatureTier,
    rewardActive,
    rewardEnter,
    rewardStage,
    rewardComplete,
    dismissReward,
    matureGateTarget,
    setMatureGateTarget,
    userRoundsInBeat,
  } = useStoryServerScene(config, { forceNewEnter, replayEnter });

  const { activeInsert, onUserSend, dismissInsert, insertBlocking, chapterEndActive } =
    useStoryScenePresentation({
      sceneId: config.sceneId,
      currentBeat: state.currentBeat,
      messages: state.messages,
      isGenerating,
      awaitingAssistantReply,
      rewardActive,
      rewardStage: rewardStage,
      rewardBranchId: rewardEnter?.reward_id,
      badEndVisible: badEnd !== null,
      sceneClearPending: showClear && config.sceneId === 's0_04',
    });

  const handleSend = (text: string) => {
    if (insertBlocking || chapterEndActive) return;
    onUserSend(text);
    void send(text);
  };

  const { recording, asrLoading, handleStartRecording, handleStopRecording } = useVoiceAsr({
    onText: (text) => handleSend(text),
    disabled: isGenerating,
    lang,
    userLangs: user ?? undefined,
  });

  const currentBeat = config.beats.find((b) => b.beatId === state.currentBeat);
  const isSceneClear = state.currentBeat === 'scene_clear' || showClear;
  const hasNextScene = !!sceneClearInfo?.next_scene_code;
  const showPaywall = isSceneClear && !!sceneClearInfo?.show_paywall && !chapterEndActive;
  const showGenericClear = isSceneClear && !hasNextScene && !showPaywall && !chapterEndActive;
  const [confirmMatureTier, setConfirmMatureTier] = useState(false);
  const [quickPhrasesUnlocked, setQuickPhrasesUnlocked] = useState(false);
  const [showStuckHelpModal, setShowStuckHelpModal] = useState(false);
  const stuckPromptBeatRef = useRef<BeatId | null>(null);

  const beatId = state.currentBeat;

  useEffect(() => {
    setQuickPhrasesUnlocked(false);
    setShowStuckHelpModal(false);
    stuckPromptBeatRef.current = null;
  }, [beatId]);

  useEffect(() => {
    if (isDevUser || rewardActive || isSceneClear || !currentBeat) return;
    if (currentBeat.quickPhrases.length === 0) return;
    if (userRoundsInBeat < STORY_STUCK_ROUNDS_THRESHOLD) return;
    if (quickPhrasesUnlocked || showStuckHelpModal) return;
    if (stuckPromptBeatRef.current === beatId) return;

    stuckPromptBeatRef.current = beatId;
    setShowStuckHelpModal(true);
  }, [
    isDevUser,
    rewardActive,
    isSceneClear,
    currentBeat,
    userRoundsInBeat,
    quickPhrasesUnlocked,
    showStuckHelpModal,
    beatId,
  ]);

  useEffect(() => {
    if (!isSceneClear || !hasNextScene || replayEnter) return;
    const timer = setTimeout(() => {
      navigateToNextStoryScene(
        router,
        sceneClearInfo?.next_scene_code,
        sceneClearInfo?.next_scene_type,
      );
    }, STORY_SCENE_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [isSceneClear, hasNextScene, sceneClearInfo, router, replayEnter]);

  const handleMatureSelect = (mature: boolean) => {
    setMature(mature);
    setMatureGateTarget(null);
  };

  const toggleTier = () => {
    const next = contentTier === 'mature' ? 'standard' : 'mature';
    if (next === 'mature') {
      setConfirmMatureTier(true);
      return;
    }
    setMature(false);
    void applySessionMatureTier('standard');
  };

  const helpQuickPhrases = useMemo(
    () => (currentBeat?.quickPhrases ?? []).slice(0, 3),
    [currentBeat?.quickPhrases],
  );

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent.gold} />
      </View>
    );
  }

  if (loadError === 'login_required') {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{t('login.loginRequired')}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>{t('login.login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadError === 'dev_required') {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{t('storyHome.devOnlyTitle')}</Text>
        <Text style={[styles.errorText, { marginTop: 8 }]}>{t('storyHome.devOnlyDesc')}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => safeGoBack('/story')}>
          <Text style={styles.loginBtnText}>{t('menu.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadError === 'vip_required') {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{t('vip.shop.storyLocked')}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/vip/shop')}>
          <Text style={styles.loginBtnText}>{t('storyHome.viewVip')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadError && loadError !== 'login_required' && loadError !== 'dev_required' && loadError !== 'vip_required') {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{t('errors.unknown')}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => safeGoBack('/story')}>
          <Text style={styles.loginBtnText}>{t('menu.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentBeat && !isSceneClear) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent.gold} />
      </View>
    );
  }

  const showRewardHint =
    !rewardActive && currentBeat?.beatId === 'beat_4' && !!currentBeat.rewardEntry;
  const storyImageSource = resolveStoryImageSource(storyImage?.image_url);
  const showResponseLoading = !rewardActive && awaitingAssistantReply;

  const showQuickPhrases =
    helpQuickPhrases.length > 0 && (isDevUser || quickPhrasesUnlocked);
  const shortcutHintMode = isDevUser
    ? 'dev'
    : quickPhrasesUnlocked
      ? 'stuck'
      : false;

  const handleAcceptStuckHelp = () => {
    setShowStuckHelpModal(false);
    setQuickPhrasesUnlocked(true);
  };

  const handleDeclineStuckHelp = () => {
    setShowStuckHelpModal(false);
  };

  const handleRewardContinue = () => {
    if (rewardComplete) {
      dismissReward();
      return;
    }
    void send(t('scene.rewardContinue'));
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <BackgroundLayer imageKey={currentBeat?.backgroundImage || 's0_01_b5_corridor'} />
      <GrainOverlay />

      <View style={[styles.contentColumn, safeAreaBottom]}>
        <StoryModeTopBar />
        {currentBeat && !isSceneClear && !rewardActive ? (
          <SceneTopHud
            beat={currentBeat}
            beats={config.beats}
            contentTier={contentTier}
            onToggleTier={toggleTier}
            shortcutHintMode={shortcutHintMode}
            rewardHint={currentBeat.rewardEntry?.hintText}
          />
        ) : null}

        <View style={styles.uiLayer}>
          {currentBeat && !isSceneClear && !rewardActive && (
            <>
              <ChatLayer
                messages={state.messages}
                loading={showResponseLoading}
                loadingAgentId={respondingAgentId}
                turnProgress={showTurnProgress}
              />
              {showRewardHint && currentBeat.rewardEntry && (
                <RewardHint text={resolveLocalized(currentBeat.rewardEntry.hintText, lang)} />
              )}
              {showQuickPhrases ? (
                <QuickPhrases
                  phrases={isDevUser ? currentBeat.quickPhrases : helpQuickPhrases}
                  disabled={isGenerating || insertBlocking}
                  onSelect={(text) => handleSend(text)}
                  showLabel={!isDevUser}
                />
              ) : null}
              <ChatInputBar
                onSend={handleSend}
                disabled={isGenerating || insertBlocking}
                isGenerating={isGenerating}
                onInterrupt={interruptGeneration}
                placeholder={isGenerating ? t('scene.thinking') : t('input.placeholder')}
                recording={recording}
                asrLoading={asrLoading}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                variant="soviet"
              />
            </>
          )}
        </View>
      </View>

      <VisualInsertOverlay
        insert={activeInsert}
        onDismiss={chapterEndActive ? () => {} : dismissInsert}
        showProgress={awaitingAssistantReply || showTurnProgress}
      />

      <MatureGate
        visible={!!matureGateTarget && !state.matureGateShown}
        onSelect={handleMatureSelect}
      />

      <RewardPlayer
        visible={rewardActive}
        enter={rewardEnter}
        stage={rewardStage}
        isGenerating={isGenerating}
        isComplete={rewardComplete}
        onContinue={handleRewardContinue}
      />

      <BadEndPlayer
        badEnd={badEnd || config.badEnds[0]}
        matureEnabled={contentTier === 'mature'}
        visible={badEnd !== null}
        onRetry={() => void dismissBadEnd()}
      />

      <StorySceneTransitionCard
        visible={isSceneClear && hasNextScene}
        title={t('sceneClear.title')}
        hint={t('storyHome.parallelAutoAdvance')}
      />

      <SceneClearCard
        visible={showGenericClear}
        flags={state.flags}
        rewardSeen={state.rewardSeen}
        onRestart={() => void restart()}
      />

      <ProloguePaywall
        visible={showPaywall}
        rewardSeen={state.rewardSeen}
        chapterClear={sceneClearInfo?.chapter_clear}
      />

      {storyImageSource && !rewardActive ? (
        <Modal transparent visible animationType="fade" onRequestClose={dismissStoryImage}>
          <TouchableOpacity style={styles.imageOverlay} activeOpacity={1} onPress={dismissStoryImage}>
            <View style={styles.imageCard}>
              <Image source={storyImageSource} style={styles.storyImage} resizeMode="cover" />
              {storyImage?.caption ? (
                <Text style={styles.imageCaption}>{storyImage.caption}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}

      <StoryStuckHelpModal
        visible={showStuckHelpModal}
        onAccept={handleAcceptStuckHelp}
        onDecline={handleDeclineStuckHelp}
      />

      <MatureConfirmModal
        visible={confirmMatureTier}
        onCancel={() => setConfirmMatureTier(false)}
        onConfirm={() => {
          setConfirmMatureTier(false);
          setMature(true);
          void applySessionMatureTier('mature');
        }}
      />
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg.primary },
  contentColumn: {
    flex: 1,
    zIndex: 20,
  },
  uiLayer: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: Typo({ color: COLORS.text.secondary, textAlign: 'center', lineHeight: 22 }, 'sans', lang),
  loginBtn: {
    backgroundColor: COLORS.accent.gold,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  loginBtnText: Typo({ color: '#111', fontWeight: '700' }, 'sans', lang),
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 100,
  },
  imageCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.accent.gold,
    backgroundColor: '#14141c',
  },
  storyImage: { width: '100%', height: 200 },
  imageCaption: Typo({ color: COLORS.text.secondary, padding: 12, fontSize: 13 }, 'sans', lang),
});
};
