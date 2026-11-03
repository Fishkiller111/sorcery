import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { DefaultCreateAgentDiamond } from './DefaultCreateAgentDiamond';
import { WIZARD_STEPS, type WizardStep } from '../../../../components/create-agent/types';

const STEP_META: Record<
  WizardStep,
  { labelKey: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  style: { labelKey: 'createAgent.wizard.stepStyle', icon: 'color-palette-outline' },
  basics: { labelKey: 'createAgent.wizard.stepBasics', icon: 'person-outline' },
  voice: { labelKey: 'createAgent.wizard.stepVoice', icon: 'musical-notes-outline' },
  personality: { labelKey: 'createAgent.wizard.stepPersonality', icon: 'heart-outline' },
  image: { labelKey: 'createAgent.wizard.stepImage', icon: 'image-outline' },
};

type DefaultCreateAgentStepBarProps = {
  current: WizardStep;
  maxReachedIndex: number;
  onSelect: (step: WizardStep) => void;
};

export function DefaultCreateAgentStepBar({
  current,
  maxReachedIndex,
  onSelect,
}: DefaultCreateAgentStepBarProps) {
  const { t } = useI18n();
  const currentIndex = WIZARD_STEPS.indexOf(current);
  const progress = (currentIndex + 1) / WIZARD_STEPS.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.emblemRow}>
        {WIZARD_STEPS.map((step, index) => (
          <View key={step} style={styles.emblemCell}>
            {index === currentIndex ? <DefaultCreateAgentDiamond size={9} /> : null}
          </View>
        ))}
        <View style={styles.emblemLine} pointerEvents="none" />
      </View>

      <View style={styles.segmentRow}>
        {WIZARD_STEPS.map((step, index) => {
          const meta = STEP_META[step];
          const active = index === currentIndex;
          const done = index < currentIndex;
          const reachable = index <= maxReachedIndex;
          const disabled = !reachable && !active;

          const iconColor = active
            ? '#FFFFFF'
            : done
              ? 'rgba(242, 242, 244, 0.88)'
              : TOKENS.colors.textSecondary;

          return (
            <Pressable
              key={step}
              style={[styles.segmentPress, disabled && styles.segmentDisabled]}
              onPress={() => reachable && onSelect(step)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t(meta.labelKey)}
              accessibilityState={{ selected: active, disabled }}
            >
              <View
                style={[
                  styles.segment,
                  done && styles.segmentDone,
                  active && styles.segmentActive,
                ]}
              >
                <Ionicons name={meta.icon} size={13} color={iconColor} />
                <Text
                  style={[
                    styles.segmentLabel,
                    active && styles.segmentLabelActive,
                    done && !active && styles.segmentLabelDone,
                    disabled && styles.segmentLabelDisabled,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {t(meta.labelKey)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const SEGMENT_HEIGHT = 40;
const SEGMENT_GAP = 4;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  emblemRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 14,
    marginBottom: 2,
  },
  emblemLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    height: 1,
    backgroundColor: TOKENS.colors.line,
    zIndex: 0,
  },
  emblemCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    minHeight: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: SEGMENT_GAP,
    width: '100%',
  },
  segmentPress: {
    flex: 1,
    minWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as object)
      : {}),
  },
  segmentDisabled: {
    opacity: 0.5,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'not-allowed',
        } as object)
      : {}),
  },
  segment: {
    minHeight: SEGMENT_HEIGHT,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 8,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  segmentDone: {
    backgroundColor: 'rgba(186, 60, 71, 0.32)',
    borderColor: TOKENS.colors.inviteBannerBorder,
  },
  segmentActive: {
    backgroundColor: TOKENS.colors.accent,
    borderColor: TOKENS.colors.accent,
  },
  segmentLabel: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
      flexShrink: 1,
      minWidth: 0,
    },
    'sans',
  ),
  segmentLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  segmentLabelDone: {
    color: 'rgba(242, 242, 244, 0.88)',
  },
  segmentLabelDisabled: {
    color: TOKENS.colors.textMuted,
  },
  track: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    marginTop: 2,
  },
  trackFill: {
    height: '100%',
    backgroundColor: TOKENS.colors.accent,
    borderRadius: 1,
  },
});
