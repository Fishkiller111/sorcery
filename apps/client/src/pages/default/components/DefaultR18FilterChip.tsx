import React from 'react';
import { Pressable, Text, View, StyleSheet, Platform } from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultR18FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

/** Home mature filter — red, high-contrast 18+ badge (not a plain category chip). */
export function DefaultR18FilterChip({ label, active, onPress }: DefaultR18FilterChipProps) {
  return (
    <Pressable
      style={[styles.chip, active ? styles.chipOn : styles.chipOff]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={[styles.logo, active ? styles.logoOn : styles.logoOff]}>
        <Text style={[styles.logoText, active ? styles.logoTextOn : styles.logoTextOff]}>18+</Text>
      </View>
      <Text style={[styles.label, active ? styles.labelOn : styles.labelOff]}>{label}</Text>
    </Pressable>
  );
}

const RED = TOKENS.colors.accent;
const RED_DEEP = TOKENS.colors.accentPressed;

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: TOKENS.radius.pill,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    minHeight: 36,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: `0 0 12px rgba(186, 60, 71, 0.35)`,
        } as object)
      : {
          shadowColor: RED,
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 3,
        }),
  },
  chipOff: {
    borderColor: 'rgba(186, 60, 71, 0.75)',
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
  },
  chipOn: {
    borderColor: RED,
    backgroundColor: RED,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  logoOff: {
    borderColor: RED,
    backgroundColor: 'rgba(8, 9, 13, 0.85)',
  },
  logoOn: {
    borderColor: '#fff',
    backgroundColor: RED_DEEP,
  },
  logoText: Typo(
    {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    'sans',
  ),
  logoTextOff: {
    color: RED,
  },
  logoTextOn: {
    color: '#fff',
  },
  label: Typo(
    {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  labelOff: {
    color: '#F0717A',
  },
  labelOn: {
    color: '#fff',
  },
});
