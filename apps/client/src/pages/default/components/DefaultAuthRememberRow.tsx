import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultAuthRememberRowProps = {
  rememberLabel: string;
  forgotLabel: string;
  checked: boolean;
  onToggleRemember: () => void;
  onForgotPassword: () => void;
  disabled?: boolean;
};

export function DefaultAuthRememberRow({
  rememberLabel,
  forgotLabel,
  checked,
  onToggleRemember,
  onForgotPassword,
  disabled,
}: DefaultAuthRememberRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.rememberHit}
        onPress={onToggleRemember}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: !!disabled }}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <View style={styles.checkboxInner} /> : null}
        </View>
        <Text style={styles.rememberText}>{rememberLabel}</Text>
      </Pressable>

      <TouchableOpacity
        onPress={onForgotPassword}
        activeOpacity={0.7}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.forgotText}>{forgotLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  rememberHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: TOKENS.colors.accent,
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.accent,
  },
  rememberText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
    },
    'sans',
  ),
  forgotText: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 13,
      fontWeight: '500',
    },
    'sans',
  ),
});
