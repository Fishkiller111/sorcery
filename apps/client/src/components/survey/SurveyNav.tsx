import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

type SurveyNavProps = {
  isFirst: boolean;
  isLast: boolean;
  canProceed: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
};

export function SurveyNav({
  isFirst,
  isLast,
  canProceed,
  submitting,
  onBack,
  onNext,
  onSubmit,
}: SurveyNavProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);

  return (
    <View style={styles.row}>
      {!isFirst ? (
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onBack} disabled={submitting}>
          <Text style={Typo(styles.btnSecondaryText, 'sans', lang)}>{t('survey.back')}</Text>
        </Pressable>
      ) : null}

      {isLast ? (
        <Pressable
          style={[styles.btn, canProceed && !submitting ? styles.btnPrimary : styles.btnMuted]}
          onPress={onSubmit}
          disabled={!canProceed || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.agents.paleGold} />
          ) : (
            <Text style={[Typo(styles.btnText, 'display', lang), canProceed ? Typo(styles.btnTextPrimary, 'display', lang) : Typo(styles.btnTextMuted, 'display', lang)]}>
              {t('survey.submit')}
            </Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={[styles.btn, canProceed ? styles.btnPrimary : styles.btnMuted]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={[Typo(styles.btnText, 'display', lang), canProceed ? Typo(styles.btnTextPrimary, 'display', lang) : Typo(styles.btnTextMuted, 'display', lang)]}>
            {t('survey.next')}
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
    paddingTop: 8,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 140,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
  },
  btnPrimary: {
    backgroundColor: '#7a1e1e',
    borderColor: 'rgba(158, 27, 27, 0.6)',
  },
  btnMuted: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: COLORS.agents.border,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderColor: COLORS.agents.borderStrong,
  },
  btnText: { fontSize: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  btnTextPrimary: {
    color: COLORS.agents.paleGold,
  },
  btnTextMuted: {
    color: COLORS.agents.paleGoldMuted,
  },
  btnSecondaryText: { color: COLORS.agents.paleGoldMuted, fontSize: 14, fontWeight: '600' },
});
};
