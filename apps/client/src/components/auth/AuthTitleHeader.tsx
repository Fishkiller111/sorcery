import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DividerStar } from '../ui/DividerStar';
import { Typo } from '../../theme/typography';
import { AUTH_OFF_WHITE, AUTH_RED } from './authTheme';

type AuthTitleHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthTitleHeader({ title, subtitle }: AuthTitleHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <View style={styles.line} />
        <DividerStar size={12} color={AUTH_RED} />
        <Text style={styles.title}>{title}</Text>
        <DividerStar size={12} color={AUTH_RED} />
        <View style={styles.line} />
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
    paddingTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: AUTH_RED,
    opacity: 0.45,
  },
  title: Typo(
    {
      color: AUTH_OFF_WHITE,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
      flexShrink: 1,
    },
    'display',
  ),
  subtitle: Typo(
    {
      color: 'rgba(161, 161, 170, 0.95)',
      fontSize: 13,
      textAlign: 'center',
    },
    'sans',
  ),
});
