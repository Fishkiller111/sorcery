import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BadEndConfig } from '../../engine/types';
import { resolveImage } from '../../utils/assets';
import { resolveLocalized } from '../../i18n/utils';
import type { Lang } from '../../i18n/types';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { storyAudioPlayer } from '../../utils/storyAudioPlayer';
import { isStoryAudioKey } from '../../data/storyAudioRegistry';

function playStepSfx(key: string | undefined) {
  if (!key || !isStoryAudioKey(key)) return;
  storyAudioPlayer.playSfx(key, -8);
}

function getPlayableSteps(badEnd: BadEndConfig, matureEnabled: boolean, lang: Lang) {
  return badEnd.steps.filter((step) => {
    const text = step.text ? resolveLocalized(step.text, lang) : '';
    const stdImg = step.standardImage;
    const matImg = step.matureImage;
    const image = matureEnabled ? matImg || stdImg : stdImg || matImg;
    if (!matureEnabled && matImg && !stdImg && !text) return false;
    if (text && /场景失败|Scene Failed/i.test(text)) return false;
    return Boolean(text || image || step.insertImage);
  });
}

interface BadEndPlayerProps {
  badEnd: BadEndConfig;
  matureEnabled: boolean;
  visible: boolean;
  onRetry: () => void;
}

export function BadEndPlayer({ badEnd, matureEnabled, visible, onRetry }: BadEndPlayerProps) {
  const { lang, t } = useI18n();
  const playableSteps = useMemo(
    () => getPlayableSteps(badEnd, matureEnabled, lang),
    [badEnd.badEndId, badEnd.steps, matureEnabled, lang],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [showEndCard, setShowEndCard] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepDuration =
    playableSteps[stepIndex]?.durationMs && playableSteps[stepIndex]!.durationMs > 0
      ? playableSteps[stepIndex]!.durationMs
      : 3000;

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    setShowEndCard(false);
    setCanSkip(false);
    setElapsed(0);

    const minMs = badEnd.minSeconds * 1000;
    const skipTimer = setTimeout(() => setCanSkip(true), minMs);

    tickRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => {
      clearTimeout(skipTimer);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [visible, badEnd.badEndId, badEnd.minSeconds]);

  useEffect(() => {
    if (!visible || showEndCard) return;
    if (stepIndex >= playableSteps.length) {
      setShowEndCard(true);
      return;
    }

    const step = playableSteps[stepIndex];
    const sfxKey = matureEnabled ? step.matureSfx || step.sfx : step.sfx;
    playStepSfx(sfxKey);

    const timer = setTimeout(() => {
      if (stepIndex < playableSteps.length - 1) {
        setStepIndex((i) => i + 1);
      } else {
        setShowEndCard(true);
      }
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [stepIndex, visible, showEndCard, stepDuration, playableSteps.length, matureEnabled]);

  const currentStep = playableSteps[stepIndex];
  const imageUri = currentStep
    ? matureEnabled
      ? currentStep.matureImage || currentStep.standardImage
      : currentStep.standardImage || currentStep.matureImage
    : undefined;
  const insertUri = currentStep?.insertImage;
  const displayImage = imageUri || insertUri;
  const narration = currentStep?.text ? resolveLocalized(currentStep.text, lang) : '';

  const remainingSeconds = Math.max(0, badEnd.minSeconds - elapsed);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        {!showEndCard && displayImage ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.imageContainer}>
            <Image source={resolveImage(displayImage)} style={styles.image} contentFit="cover" />
          </Animated.View>
        ) : null}

        {!showEndCard && narration ? (
          <View style={styles.textOverlay}>
            <View style={styles.textPanel}>
              <Text style={styles.narration}>{narration}</Text>
            </View>
          </View>
        ) : null}

        {showEndCard ? (
          <View style={styles.endCard}>
            <Text style={styles.endTitle}>{t('badEnd.title')}</Text>
            <Text style={styles.hint}>{resolveLocalized(badEnd.retryHint, lang)}</Text>
            <TouchableOpacity
              style={[styles.retryButton, !canSkip && styles.retryDisabled]}
              onPress={onRetry}
              disabled={!canSkip}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>
                {canSkip ? t('badEnd.retry') : t('badEnd.cannotSkip').replace('{seconds}', String(remainingSeconds))}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  textOverlay: {
    position: 'absolute',
    bottom: 48,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  textPanel: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(10, 11, 15, 0.78)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(196, 30, 58, 0.35)',
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
    'sans',
  ),
  endCard: {
    marginHorizontal: 24,
    maxWidth: 520,
    width: '100%',
    backgroundColor: 'rgba(10, 11, 15, 0.94)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.accent.red,
    padding: 22,
    alignItems: 'center',
  },
  endTitle: Typo(
    {
      color: COLORS.accent.red,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    'display',
  ),
  hint: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 13,
      marginBottom: 16,
      textAlign: 'center',
    },
    'sans',
  ),
  retryButton: {
    backgroundColor: COLORS.accent.red,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryDisabled: {
    backgroundColor: 'rgba(196, 30, 58, 0.4)',
  },
  retryText: Typo(
    {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 14,
    },
    'display',
  ),
});
