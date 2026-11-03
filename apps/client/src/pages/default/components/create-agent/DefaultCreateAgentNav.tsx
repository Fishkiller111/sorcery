import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { WIZARD_STEPS, type WizardStep } from '../../../../components/create-agent/types';

type DefaultCreateAgentNavProps = {
  step: WizardStep;
  submitting: boolean;
  canProceed: boolean;
  canCreate: boolean;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
};

export function DefaultCreateAgentNav({
  step,
  submitting,
  canProceed,
  canCreate,
  onBack,
  onNext,
  onCreate,
}: DefaultCreateAgentNavProps) {
  const { t } = useI18n();
  const isFirst = step === WIZARD_STEPS[0];
  const isLast = step === WIZARD_STEPS[WIZARD_STEPS.length - 1];

  return (
    <View style={styles.row}>
      {!isFirst ? (
        <Pressable
          style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.btnPressed]}
          onPress={onBack}
          disabled={submitting}
        >
          <Text style={styles.btnGhostText}>{t('createAgent.wizard.back')}</Text>
        </Pressable>
      ) : null}

      {isLast ? (
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            canCreate && !submitting ? styles.btnPrimary : styles.btnMuted,
            pressed && canCreate && !submitting && styles.btnPressed,
          ]}
          onPress={onCreate}
          disabled={!canCreate || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={TOKENS.colors.text} />
          ) : (
            <Text style={[styles.btnPrimaryText, !canCreate && styles.btnMutedText]}>
              {t('createAgent.submit')}
            </Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            canProceed ? styles.btnPrimary : styles.btnMuted,
            pressed && canProceed && styles.btnPressed,
          ]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={[styles.btnPrimaryText, !canProceed && styles.btnMutedText]}>
            {t('createAgent.wizard.next')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 28,
    flexWrap: 'wrap',
  },
  btn: {
    borderRadius: TOKENS.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 140,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as object)
      : {}),
  },
  btnPrimary: {
    backgroundColor: TOKENS.colors.accent,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
  },
  btnMuted: {
    backgroundColor: 'rgba(186, 60, 71, 0.22)',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  btnPressed: {
    backgroundColor: TOKENS.colors.accentPressed,
    transform: [{ scale: 0.98 }],
  },
  btnPrimaryText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  btnMutedText: {
    color: TOKENS.colors.textMuted,
  },
  btnGhostText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
});
