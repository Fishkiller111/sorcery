import type { Lang } from '../../i18n/types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { ParallelCutInConfig, ParallelPlaybackConfig, ParallelStepConfig } from '../../data/s0_02/parallel';
import { resolveImage } from '../../utils/assets';
import { resolveLocalized } from '../../i18n/utils';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { STORY_SCENE_AUTO_ADVANCE_MS } from '../../utils/storyNavigation';
import { isStoryAudioKey } from '../../data/storyAudioRegistry';
import { storyAudioPlayer } from '../../utils/storyAudioPlayer';

const END_CARD_AUTO_ADVANCE_MS = STORY_SCENE_AUTO_ADVANCE_MS;

function pickStepImage(step: ParallelStepConfig, matureEnabled: boolean): string | undefined {
  if (matureEnabled) {
    return step.mature_image || step.standard_image;
  }
  return step.standard_image || step.mature_image;
}

interface ParallelCutscenePlayerProps {
  playback: ParallelPlaybackConfig;
  matureEnabled: boolean;
  visible: boolean;
  onComplete: () => void;
  onHotspot?: (galleryId: string) => void;
}

export function ParallelCutscenePlayer({
  playback,
  matureEnabled,
  visible,
  onComplete,
  onHotspot,
}: ParallelCutscenePlayerProps) {
  const { lang, t } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const steps = useMemo(() => playback.steps.filter((s) => pickStepImage(s, matureEnabled) || s.text), [playback.steps, matureEnabled]);
  const [stepIndex, setStepIndex] = useState(0);
  const [showEndCard, setShowEndCard] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [autoAdvanceTriggered, setAutoAdvanceTriggered] = useState(false);
  const [activeCutIn, setActiveCutIn] = useState<ParallelCutInConfig | null>(null);
  const [blackHold, setBlackHold] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cutInTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stepIndexRef = useRef(0);
  const showEndCardRef = useRef(false);

  const minSeconds = playback.min_seconds > 0 ? playback.min_seconds : 5;

  stepIndexRef.current = stepIndex;
  showEndCardRef.current = showEndCard;

  const clearCutInTimers = useCallback(() => {
    cutInTimersRef.current.forEach((timer) => clearTimeout(timer));
    cutInTimersRef.current = [];
    setActiveCutIn(null);
    setBlackHold(false);
  }, []);

  const scheduleCutIns = useCallback((step: ParallelStepConfig | undefined) => {
    clearCutInTimers();
    if (!step?.cut_ins?.length) return;

    let lastEndMs = 0;
    for (const cutIn of step.cut_ins) {
      const startTimer = setTimeout(() => {
        setActiveCutIn(cutIn);
        if (cutIn.sfx && isStoryAudioKey(cutIn.sfx)) {
          storyAudioPlayer.playSfx(cutIn.sfx, -6);
        }
      }, cutIn.at_ms);
      cutInTimersRef.current.push(startTimer);

      const endMs = cutIn.at_ms + cutIn.duration_ms;
      lastEndMs = Math.max(lastEndMs, endMs);
      const endTimer = setTimeout(() => {
        setActiveCutIn((prev) => (prev?.id === cutIn.id ? null : prev));
      }, endMs);
      cutInTimersRef.current.push(endTimer);
    }

    if (step.black_hold_ms && step.black_hold_ms > 0) {
      const blackTimer = setTimeout(() => {
        setBlackHold(true);
        const releaseTimer = setTimeout(() => setBlackHold(false), step.black_hold_ms);
        cutInTimersRef.current.push(releaseTimer);
      }, lastEndMs);
      cutInTimersRef.current.push(blackTimer);
    }
  }, [clearCutInTimers]);

  const advanceStep = useCallback(() => {
    if (showEndCardRef.current) return;
    const idx = stepIndexRef.current;
    if (idx < steps.length - 1) {
      setStepIndex(idx + 1);
    } else {
      setShowEndCard(true);
    }
  }, [steps.length]);

  useEffect(() => {
    if (!visible) {
      clearCutInTimers();
      void storyAudioPlayer.stopAll();
      return;
    }
    setStepIndex(0);
    setShowEndCard(false);
    setCanSkip(false);
    setElapsed(0);
    setAutoAdvanceTriggered(false);
    clearCutInTimers();

    if (playback.ambience && isStoryAudioKey(playback.ambience)) {
      void storyAudioPlayer.setAmbience(playback.ambience);
    }

    const skipTimer = setTimeout(() => setCanSkip(true), minSeconds * 1000);
    tickRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => {
      clearTimeout(skipTimer);
      if (tickRef.current) clearInterval(tickRef.current);
      clearCutInTimers();
      void storyAudioPlayer.stopAll();
    };
  }, [visible, minSeconds, playback.ambience, clearCutInTimers]);

  useEffect(() => {
    if (!visible || showEndCard) return;
    scheduleCutIns(steps[stepIndex]);
    return () => clearCutInTimers();
  }, [visible, showEndCard, stepIndex, steps, scheduleCutIns, clearCutInTimers]);

  useEffect(() => {
    if (!visible || showEndCard || Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Tab' || event.key === 'Shift') return;
      event.preventDefault();
      advanceStep();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, showEndCard, advanceStep]);

  useEffect(() => {
    if (!visible || !showEndCard || !canSkip || autoAdvanceTriggered) return;
    const timer = setTimeout(() => {
      setAutoAdvanceTriggered(true);
      onComplete();
    }, END_CARD_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [visible, showEndCard, canSkip, autoAdvanceTriggered, onComplete]);

  const currentStep = steps[stepIndex];
  const imagePath = currentStep ? pickStepImage(currentStep, matureEnabled) : undefined;
  const imageUri = imagePath ? resolveImage(imagePath) : undefined;
  const cutInUri = activeCutIn?.image ? resolveImage(activeCutIn.image) : undefined;
  const narration = currentStep?.text ? resolveLocalized(currentStep.text, lang) : '';
  const hotspotLabel = currentStep?.hotspot?.label
    ? resolveLocalized(currentStep.hotspot.label, lang)
    : t('storyHome.parallelHotspot');

  const remainingSeconds = Math.max(0, minSeconds - elapsed);
  const stepCounter = steps.length > 0 ? `${stepIndex + 1}/${steps.length}` : '';
  const showMainImage = !showEndCard && imageUri && !blackHold && !cutInUri;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.container} onPress={advanceStep} accessibilityRole="button">
        {showMainImage ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.imageContainer} pointerEvents="none">
            <Image source={imageUri} style={styles.image} contentFit="cover" />
          </Animated.View>
        ) : null}

        {!showEndCard && cutInUri ? (
          <Animated.View entering={FadeIn.duration(activeCutIn?.fade_ms ?? 300)} exiting={FadeOut.duration(200)} style={styles.imageContainer} pointerEvents="none">
            <Image source={cutInUri} style={styles.image} contentFit="cover" />
          </Animated.View>
        ) : null}

        {!showEndCard && blackHold ? (
          <View style={styles.blackHold} pointerEvents="none" />
        ) : null}

        {!showEndCard && narration ? (
          <View style={styles.textOverlay} pointerEvents="none">
            <View style={styles.textPanel}>
              <Text style={styles.narration}>{narration}</Text>
            </View>
          </View>
        ) : null}

        {!showEndCard ? (
          <View style={styles.advanceHint} pointerEvents="none">
            <Text style={styles.advanceHintText}>{t('storyHome.parallelTapAdvance')}</Text>
            {stepCounter ? <Text style={styles.stepCounter}>{stepCounter}</Text> : null}
          </View>
        ) : null}

        {!showEndCard && currentStep?.hotspot?.action === 'open_gallery' ? (
          <TouchableOpacity
            style={styles.hotspot}
            activeOpacity={0.85}
            onPress={(e) => {
              e.stopPropagation?.();
              onHotspot?.(currentStep.hotspot!.gallery_id);
            }}
          >
            <Text style={Typo(styles.hotspotText, 'sans', lang)}>{hotspotLabel}</Text>
          </TouchableOpacity>
        ) : null}

        {showEndCard ? (
          <Pressable style={styles.endCardWrap} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.endCard}>
              <Text style={styles.endTitle}>{t('storyHome.parallelDone')}</Text>
              <Text style={styles.hint}>{t('storyHome.parallelEndHint')}</Text>
              <View style={[styles.continueButton, styles.continueDisabled]}>
                <Text style={styles.continueText}>
                  {canSkip
                    ? t('storyHome.parallelAutoAdvance')
                    : t('badEnd.cannotSkip').replace('{seconds}', String(remainingSeconds))}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  blackHold: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  textOverlay: {
    position: 'absolute',
    bottom: 96,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 2,
  },
  textPanel: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(10, 11, 15, 0.78)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.35)',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  narration: Typo(
    {
      color: '#f3efe6',
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
    },
    'sans', lang
  ),
  advanceHint: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  advanceHintText: Typo(
    {
      color: 'rgba(243, 239, 230, 0.72)',
      fontSize: 13,
      textAlign: 'center',
    },
    'sans', lang
  ),
  stepCounter: Typo(
    {
      color: 'rgba(201, 162, 39, 0.65)',
      fontSize: 11,
    },
    'mono', lang
  ),
  hotspot: {
    position: 'absolute',
    bottom: 72,
    right: 20,
    backgroundColor: 'rgba(201, 162, 39, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 3,
  },
  hotspotText: { color: '#111', fontWeight: '700', fontSize: 13 },
  endCardWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 4,
  },
  endCard: {
    marginHorizontal: 24,
    maxWidth: 520,
    width: '100%',
    backgroundColor: 'rgba(10, 11, 15, 0.94)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.accent.gold,
    padding: 22,
    alignItems: 'center',
  },
  endTitle: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    'display', lang
  ),
  hint: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 13,
      marginBottom: 16,
      textAlign: 'center',
    },
    'sans', lang
  ),
  continueButton: {
    backgroundColor: COLORS.accent.gold,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  continueDisabled: {
    opacity: 0.45,
  },
  continueText: Typo(
    {
      color: '#111',
      fontWeight: '700',
      fontSize: 14,
    },
    'display', lang
  ),
});
};
