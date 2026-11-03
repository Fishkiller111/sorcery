import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typo } from '../../theme/typography';
import { AUTH_RED } from './authTheme';

type AuthSocialDividerProps = {
  label: string;
};

export function AuthSocialDivider({ label }: AuthSocialDividerProps) {
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
    gap: 10,
    marginTop: 20,
    marginBottom: 14,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: AUTH_RED,
    opacity: 0.35,
  },
  label: Typo(
    {
      color: 'rgba(161, 161, 170, 0.9)',
      fontSize: 11,
      textAlign: 'center',
    },
    'sans',
  ),
});
