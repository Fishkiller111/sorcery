import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultAuthPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function DefaultAuthPrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: DefaultAuthPrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.btn, isDisabled && styles.btnDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={TOKENS.colors.text} />
      ) : (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    minHeight: 52,
    borderRadius: TOKENS.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: TOKENS.colors.accent,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  label: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    'sans',
  ),
});
