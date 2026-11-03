import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultFilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  /**
   * - theme: blue action chip (Daily Tasks)
   * - accent: theme-red chip (All)
   * - history: warm gold chip (聊过) — 与红/蓝区分，突出历史筛选
   */
  variant?: 'default' | 'theme' | 'accent' | 'history';
};

export function DefaultFilterChip({
  label,
  active,
  onPress,
  variant = 'default',
}: DefaultFilterChipProps) {
  const isTheme = variant === 'theme';
  const isAccent = variant === 'accent';
  const isHistory = variant === 'history';
  const isSpecial = isAccent || isTheme || isHistory;
  return (
    <Pressable
      style={[
        styles.chip,
        active && !isSpecial && styles.chipActive,
        isTheme && styles.chipTheme,
        isAccent && (active ? styles.chipAccentActive : styles.chipAccent),
        isHistory && (active ? styles.chipHistoryActive : styles.chipHistory),
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.label,
          active && !isSpecial && styles.labelActive,
          isTheme && styles.labelTheme,
          isAccent && (active ? styles.labelAccentActive : styles.labelAccent),
          isHistory && (active ? styles.labelHistoryActive : styles.labelHistory),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Theme blue text — paired with #5B5F8E chip fill */
const THEME_BLUE_TEXT = '#C4C8E4';
/** Soft red text for inactive accent chip */
const ACCENT_TEXT = '#F0717A';
/** 淡金文字 — 聊过 chip，对齐档案风亮金 */
const HISTORY_GOLD_TEXT = '#E8D5B5';
const HISTORY_GOLD_TEXT_ACTIVE = '#F4D03F';

const styles = StyleSheet.create({
  chip: {
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8, 9, 13, 0.55)',
    minWidth: 72,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: TOKENS.colors.line,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  chipTheme: {
    borderColor: 'rgba(91, 95, 142, 0.85)',
    backgroundColor: 'rgba(91, 95, 142, 0.28)',
  },
  chipAccent: {
    borderColor: 'rgba(186, 60, 71, 0.55)',
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
  },
  chipAccentActive: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.32)',
  },
  /** 未选中：淡金描边 + 半透明金底 */
  chipHistory: {
    borderColor: 'rgba(232, 213, 181, 0.45)',
    backgroundColor: 'rgba(232, 213, 181, 0.12)',
  },
  /** 选中：亮金描边 + 更深金底，突出当前筛选 */
  chipHistoryActive: {
    borderColor: 'rgba(244, 208, 63, 0.75)',
    backgroundColor: 'rgba(244, 208, 63, 0.22)',
  },
  label: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  labelActive: {
    color: TOKENS.colors.text,
  },
  labelTheme: {
    color: THEME_BLUE_TEXT,
    fontWeight: '700',
  },
  labelAccent: {
    color: ACCENT_TEXT,
    fontWeight: '700',
  },
  labelAccentActive: {
    color: '#FFB4BA',
    fontWeight: '700',
  },
  labelHistory: {
    color: HISTORY_GOLD_TEXT,
    fontWeight: '700',
  },
  labelHistoryActive: {
    color: HISTORY_GOLD_TEXT_ACTIVE,
    fontWeight: '700',
  },
});
