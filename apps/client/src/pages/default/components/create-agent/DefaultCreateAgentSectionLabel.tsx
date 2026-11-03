import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { DefaultCreateAgentDiamond } from './DefaultCreateAgentDiamond';

type DefaultCreateAgentSectionLabelProps = {
  label: string;
};

export function DefaultCreateAgentSectionLabel({ label }: DefaultCreateAgentSectionLabelProps) {
  return (
    <View style={styles.row}>
      <DefaultCreateAgentDiamond size={7} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  label: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    'mono',
  ),
});
