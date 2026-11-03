import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { resolveImage } from '../../utils/assets';

interface BackgroundLayerProps {
  imageKey: string;
}

export function BackgroundLayer({ imageKey }: BackgroundLayerProps) {
  const source = resolveImage(`scenes/${imageKey}`);

  return (
    <View style={styles.container}>
      <Image
        source={source}
        style={styles.image}
        contentFit="cover"
        transition={400}
        cachePolicy="memory-disk"
      />
      <View style={styles.bottomFade} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0a0b0f',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 360,
    backgroundColor: 'rgba(10, 11, 15, 0.55)',
  },
});
