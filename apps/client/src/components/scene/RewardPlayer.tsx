import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { resolveStoryImageSource } from '../../utils/assets';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import type { StoryRewardEnterPayload, StoryRewardStagePayload } from '../../types/story';

interface RewardPlayerProps {
  visible: boolean;
  enter: StoryRewardEnterPayload | null;
  stage: StoryRewardStagePayload | null;
  isGenerating: boolean;
  isComplete: boolean;
  onContinue: () => void;
}

export function RewardPlayer({
  visible,
  enter,
  stage,
  isGenerating,
  isComplete,
  onContinue,
}: RewardPlayerProps) {
  const { t } = useI18n();
  const imageSource = resolveStoryImageSource(stage?.image);
  const narration = stage?.text || '';
  const waitingForStage = visible && !stage && isGenerating;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        {imageSource ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.imageContainer}>
            <Image source={imageSource} style={styles.image} contentFit="cover" />
          </Animated.View>
        ) : null}

        <View style={styles.bottomStack}>
          <View style={styles.metaRow}>
            <Text style={styles.badge}>🟡 {enter?.reward_id || 'R02'}</Text>
            {stage ? (
              <Text style={styles.progress}>
                {stage.round} / {stage.total}
              </Text>
            ) : null}
          </View>

          {enter?.hint && !stage ? <Text style={styles.hint}>{enter.hint}</Text> : null}

          {narration ? (
            <View style={styles.textPanel}>
              <Text style={styles.narration}>{narration}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.continueButton, (isGenerating && !isComplete) && styles.continueDisabled]}
            onPress={onContinue}
            disabled={isGenerating && !isComplete}
            activeOpacity={0.85}
          >
            {waitingForStage ? (
              <ActivityIndicator color="#111" size="small" />
            ) : (
              <Text style={styles.continueText}>
                {isComplete ? t('scene.rewardReturn') : t('scene.rewardContinue')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
  },
  imageContainer: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomStack: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 24,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 12,
      fontWeight: '700',
    },
    'mono',
  ),
  progress: Typo(
    {
      color: COLORS.text.muted,
      fontSize: 11,
    },
    'mono',
  ),
  hint: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    'sans',
  ),
  textPanel: {
    width: '100%',
    backgroundColor: 'rgba(10, 11, 15, 0.82)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.4)',
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
  continueButton: {
    marginTop: 4,
    backgroundColor: COLORS.accent.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueDisabled: {
    opacity: 0.55,
  },
  continueText: Typo(
    {
      color: '#111111',
      fontWeight: '700',
      fontSize: 15,
    },
    'display',
  ),
});
