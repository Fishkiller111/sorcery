import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { INTRO_MAX } from '../../utils/roleForm';

type IntroCharCounterProps = {
  length: number;
};

export function IntroCharCounter({ length }: IntroCharCounterProps) {

  const { t, lang } = useI18n();
  const overMax = length > INTRO_MAX;

  return (
    <Text style={[Typo(styles.counter, 'sans', lang), overMax && Typo(styles.counterError, 'sans', lang)]}>
      {t('createAgent.introCount')
        .replace('{count}', String(length))
        .replace('{max}', String(INTRO_MAX))}
    </Text>
  );
}

const styles = StyleSheet.create({
  counter: { color: COLORS.text.muted, fontSize: 11, marginTop: 4, marginBottom: 4 },
  counterError: { color: COLORS.accent.red },
});
