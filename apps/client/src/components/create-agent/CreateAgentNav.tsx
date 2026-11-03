import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { WIZARD_STEPS, type WizardStep } from './types';

const BTN_GLOW = Platform.select({
  web: { boxShadow: '0 0 14px rgba(139, 26, 26, 0.55)' } as object,
  default: {
    shadowColor: COLORS.agents.tabActive,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
});

type CreateAgentNavProps = {
  step: WizardStep;
  submitting: boolean;
  canProceed: boolean;
  canCreate: boolean;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
};

export function CreateAgentNav({
  step,
  submitting,
  canProceed,
  canCreate,
  onBack,
  onNext,
  onCreate,
}: CreateAgentNavProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isFirst = step === WIZARD_STEPS[0];
  const isLast = step === WIZARD_STEPS[WIZARD_STEPS.length - 1];

  return (
    <View style={styles.row}>
      {!isFirst ? (
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onBack} disabled={submitting}>
          <Text style={styles.btnSecondaryText}>{t('createAgent.wizard.back')}</Text>
        </Pressable>
      ) : null}

      {isLast ? (
        <Pressable
          style={[
            styles.btn,
            canCreate && !submitting ? styles.btnHighlight : styles.btnMuted,
            canCreate && !submitting && BTN_GLOW,
          ]}
          onPress={onCreate}
          disabled={!canCreate || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.agents.paleGold} />
          ) : (
            <Text
              style={[
                styles.btnText,
                canCreate ? styles.btnTextHighlight : styles.btnTextMuted,
              ]}
            >
              {t('createAgent.submit')}
            </Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={[
            styles.btn,
            canProceed ? styles.btnHighlight : styles.btnMuted,
            canProceed && BTN_GLOW,
          ]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text
            style={[styles.btnText, canProceed ? styles.btnTextHighlight : styles.btnTextMuted]}
          >
            {t('createAgent.wizard.next')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 140,
  },
  btnHighlight: {
    backgroundColor: COLORS.agents.tabActive,
    borderWidth: 1,
    borderColor: COLORS.accent.red,
  },
  btnMuted: {
    backgroundColor: 'rgba(139, 26, 26, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(196, 30, 58, 0.45)',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnText: Typo({ fontSize: 15, fontWeight: '600' }, 'display', lang),
  btnTextHighlight: Typo({ color: COLORS.agents.paleGold, fontSize: 15, fontWeight: '700' }, 'display', lang),
  btnTextMuted: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 15, fontWeight: '600' }, 'display', lang),
  btnSecondaryText: Typo({ color: COLORS.text.secondary, fontSize: 15 }, 'sans', lang),
});
};
