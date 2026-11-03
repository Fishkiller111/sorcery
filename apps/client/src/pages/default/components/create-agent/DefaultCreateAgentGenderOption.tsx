import React from 'react';
import { Pressable, Text, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';

type DefaultCreateAgentGenderOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function DefaultCreateAgentGenderOption({
  label,
  selected,
  onPress,
  style,
}: DefaultCreateAgentGenderOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        selected && styles.boxSelected,
        pressed && styles.boxPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const glassBase = Platform.OS === 'web'
  ? ({
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } as object)
  : {};

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minHeight: 52,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    ...glassBase,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as object)
      : {}),
  },
  boxSelected: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  boxPressed: {
    transform: [{ scale: 0.985 }],
  },
  label: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'mono',
  ),
  labelSelected: {
    color: TOKENS.colors.text,
  },
});
