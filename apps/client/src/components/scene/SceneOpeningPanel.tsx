import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

interface Props {
  text: string;
}

/** Beat opening narration — institutional archive panel (styles skill). */
export function SceneOpeningPanel({ text }: Props) {
  if (!text.trim()) return null;

  return (
    <Animated.View key={text} entering={FadeIn.duration(360)} style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 12,
      lineHeight: 18,
      letterSpacing: 0.2,
    },
    'sans',
  ),
});
