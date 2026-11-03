import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Typo } from '../../../theme/typography';
import { DEFAULT_IMAGES } from '../theme/images';

type DefaultSoulthreadLogoProps = {
  size?: number;
  showWordmark?: boolean;
};

export function DefaultSoulthreadLogo({ size = 100, showWordmark = true }: DefaultSoulthreadLogoProps) {
  return (
    <View style={styles.wrap}>
      <Image
        source={DEFAULT_IMAGES.logo}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel="Soulthread"
      />
      {showWordmark ? <Text style={styles.wordmark}>Soulthread</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: Typo(
    {
      color: '#f4f4f5',
      fontSize: 18,
      letterSpacing: 0.5,
      ...(Platform.OS === 'web' ? { textAlign: 'center' as const } : {}),
    },
    'serif',
  ),
});
