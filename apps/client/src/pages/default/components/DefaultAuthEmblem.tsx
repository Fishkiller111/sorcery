import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TOKENS } from '../theme/tokens';

export function DefaultAuthEmblem() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <View style={styles.diamond} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: TOKENS.colors.line,
  },
  diamond: {
    width: 10,
    height: 10,
    backgroundColor: TOKENS.colors.accent,
    transform: [{ rotate: '45deg' }],
  },
});
