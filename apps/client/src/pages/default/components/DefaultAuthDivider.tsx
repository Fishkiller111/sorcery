import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultAuthDividerProps = {
  label: string;
};

export function DefaultAuthDivider({ label }: DefaultAuthDividerProps) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: TOKENS.colors.lineFaint,
  },
  label: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
    },
    'sans',
  ),
});
