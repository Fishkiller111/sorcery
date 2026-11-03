import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

type SurveyProgressBarProps = {
  current: number;
  total: number;
};

export function SurveyProgressBar({ current, total }: SurveyProgressBarProps) {
  const { t } = useI18n();
  const ratio = total > 0 ? Math.min(1, (current + 1) / total) : 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {t('survey.progress')
          .replace('{current}', String(Math.min(current + 1, total)))
          .replace('{total}', String(total))}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  track: {
    height: 4,
    backgroundColor: 'rgba(232,213,181,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.accent.redDark,
  },
});
