import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typo } from '../typography';
import { TOKENS } from '../tokens';

type ModernPageHeaderProps = {
  eyebrow?: string;
  title: string;
};

export function ModernPageHeader({ eyebrow, title }: ModernPageHeaderProps) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: 8,
  },
  eyebrow: typo(
    {
      color: TOKENS.modePage.textSubtle,
      fontSize: 10,
      letterSpacing: 2.4,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  title: typo(
    {
      color: TOKENS.modePage.text,
      fontSize: 42,
      letterSpacing: 2,
      textTransform: 'uppercase',
      lineHeight: 46,
    },
    'display',
  ),
  rule: {
    marginTop: 6,
    height: 1,
    width: '100%',
    maxWidth: 320,
    backgroundColor: TOKENS.modePage.line,
  },
});
