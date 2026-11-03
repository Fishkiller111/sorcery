import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Typo } from '../../theme/typography';
import { TOKENS } from '../../pages/default/theme/tokens';

const LABEL = '#8a8278';
const RED = '#c43e3e';

type DismissTodayCheckboxProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  variant?: 'soviet' | 'default';
};

export function DismissTodayCheckbox({
  label,
  checked,
  onToggle,
  variant = 'soviet',
}: DismissTodayCheckboxProps) {
  const isDefault = variant === 'default';

  return (
    <Pressable style={styles.checkRow} onPress={onToggle} accessibilityRole="checkbox">
      <View
        style={[
          styles.checkBox,
          isDefault && styles.checkBoxDefault,
          checked && (isDefault ? styles.checkBoxOnDefault : styles.checkBoxOn),
        ]}
      >
        {checked ? (
          isDefault ? (
            <View style={styles.checkBoxInnerDefault} />
          ) : (
            <Text style={styles.checkMark}>✓</Text>
          )
        ) : null}
      </View>
      <Text style={[styles.checkLabel, isDefault && styles.checkLabelDefault]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: LABEL,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    borderColor: RED,
    backgroundColor: 'rgba(196, 62, 62, 0.2)',
  },
  checkBoxDefault: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderColor: TOKENS.colors.textMuted,
  },
  checkBoxOnDefault: {
    borderColor: TOKENS.colors.accent,
  },
  checkBoxInnerDefault: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.accent,
  },
  checkMark: {
    color: RED,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  checkLabel: Typo(
    {
      color: LABEL,
      fontSize: 13,
      letterSpacing: 0.3,
    },
    'sans',
  ),
  checkLabelDefault: {
    color: TOKENS.colors.textSecondary,
  },
});
