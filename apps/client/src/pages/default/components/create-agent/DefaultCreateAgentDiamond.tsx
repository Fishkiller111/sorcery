import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TOKENS } from '../../theme/tokens';

type DefaultCreateAgentDiamondProps = {
  size?: number;
  muted?: boolean;
};

export function DefaultCreateAgentDiamond({ size = 10, muted = false }: DefaultCreateAgentDiamondProps) {
  return (
    <View
      style={[
        styles.diamond,
        {
          width: size,
          height: size,
        },
        muted && styles.diamondMuted,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  diamond: {
    backgroundColor: TOKENS.colors.accent,
    transform: [{ rotate: '45deg' }],
  },
  diamondMuted: {
    backgroundColor: TOKENS.colors.textMuted,
    opacity: 0.45,
  },
});
