import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { QuickPhrase } from '../../engine/types';
import { useI18n } from '../../i18n/I18nContext';
import { resolveLocalized } from '../../i18n/utils';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

interface QuickPhrasesProps {
  phrases: QuickPhrase[];
  onSelect: (text: string, phrase?: QuickPhrase) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

export function QuickPhrases({ phrases, onSelect, disabled, showLabel }: QuickPhrasesProps) {
  const { lang, t } = useI18n();

  if (phrases.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.delay(150).duration(300)} style={styles.container}>
      {showLabel ? <Text style={styles.label}>{t('scene.quickPhrasesLabel')}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {phrases.map((phrase) => {
          const text = resolveLocalized(phrase.text, lang);
          return (
            <TouchableOpacity
              key={phrase.id}
              style={[
                styles.chip,
                phrase.rewardHint && styles.rewardChip,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => !disabled && onSelect(text, phrase)}
              activeOpacity={disabled ? 1 : 0.75}
              disabled={disabled}
            >
              <Text style={[styles.text, phrase.rewardHint && styles.rewardText]} numberOfLines={1}>
                {text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  label: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.4,
      paddingHorizontal: 12,
      marginBottom: 4,
    },
    'sans',
  ),
  scroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(20, 22, 28, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 260,
  },
  rewardChip: {
    borderColor: COLORS.accent.gold,
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  text: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 13,
    },
    'sans',
  ),
  rewardText: {
    color: COLORS.accent.gold,
  },
});
