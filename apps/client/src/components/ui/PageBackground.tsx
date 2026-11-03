import React from 'react';
import { View, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type PageBackgroundVariant = 'home' | 'modes' | 'prologue' | 'settings';

type PageBackgroundProps = {
  variant?: PageBackgroundVariant;
};

const BASE_GRADIENTS: Record<Exclude<PageBackgroundVariant, 'settings'>, readonly [string, string, string]> = {
  home: ['#1a1512', '#0e0d0b', '#0a0b0f'],
  modes: ['#18141a', '#100c0e', '#0a0b0f'],
  prologue: ['#222630', '#141820', '#0a0b0f'],
};

/**
 * Page background — gradient layers, or a dedicated image for modes.
 */
export function PageBackground({ variant = 'home' }: PageBackgroundProps) {
  const { height: windowHeight } = useWindowDimensions();

  return (
    <View style={styles.wrap} pointerEvents="none">
      {variant === 'modes' ? (
        <Image
          source={require('../../../assets/images/ui/mode-select/background.jpg')}
          style={[styles.modesBgImage, { height: windowHeight }]}
          resizeMode="cover"
        />
      ) : variant === 'settings' ? (
        <View style={styles.settingsBg} />
      ) : (
        <LinearGradient
          colors={[...BASE_GRADIENTS[variant]]}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      {variant === 'prologue' ? (
        <LinearGradient
          colors={['rgba(38, 44, 58, 0.72)', 'rgba(10, 11, 15, 0.15)', 'transparent']}
          locations={[0, 0.35, 0.72]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    overflow: 'hidden',
  },
  modesBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  settingsBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
});
