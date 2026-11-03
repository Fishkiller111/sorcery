import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';

type OptionChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  emoji?: string;
  style?: ViewStyle;
};

export function OptionChip({ label, selected, onPress, emoji, style }: OptionChipProps) {
  const { lang } = useI18n();

  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected, style]}
      onPress={onPress}
    >
      {emoji ? <Text style={[Typo(styles.emoji, 'sans', lang), selected && Typo(styles.emojiSelected, 'sans', lang)]}>{emoji}</Text> : null}
      <Text style={[Typo(styles.label, 'sans', lang), selected && Typo(styles.labelSelected, 'sans', lang)]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  chipSelected: {
    backgroundColor: COLORS.agents.tabActive,
    borderColor: COLORS.agents.borderStrong,
  },
  emoji: { color: COLORS.agents.paleGoldMuted, fontSize: 14 },
  emojiSelected: { color: COLORS.agents.paleGold },
  label: { color: COLORS.agents.paleGoldMuted, fontSize: 13, fontWeight: '500' },
  labelSelected: { color: COLORS.agents.paleGold, fontSize: 13, fontWeight: '600' },
});
