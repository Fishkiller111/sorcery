import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TOKENS } from '../theme/tokens';

type DefaultMainBackgroundProps = {
  /** Width of the left sidebar tint overlay; 0 hides it (mobile). */
  sidebarOverlayWidth?: number;
};

export function DefaultMainBackground({ sidebarOverlayWidth = 0 }: DefaultMainBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[
          TOKENS.colors.mainGradientStart,
          TOKENS.colors.mainGradientMid,
          TOKENS.colors.mainGradientEnd,
        ]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {sidebarOverlayWidth > 0 ? (
        <LinearGradient
          colors={[TOKENS.colors.sidebarGradientStart, TOKENS.colors.sidebarGradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.sidebarTint, { width: sidebarOverlayWidth }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
});
