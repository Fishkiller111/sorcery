import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function GrainOverlay() {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.6)']}
        locations={[0, 0.4, 1]}
        style={styles.vignette}
      />
      <View style={styles.noise} />
      <View style={styles.scanlines} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  vignette: {
    ...StyleSheet.absoluteFill,
  },
  noise: {
    ...StyleSheet.absoluteFill,
    opacity: 0.04,
    backgroundColor: '#ffffff',
  },
  scanlines: {
    ...StyleSheet.absoluteFill,
    opacity: 0.03,
    backgroundColor: '#000000',
  },
});
