import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const GLOW = '#5B8CFF';
const GLOW_SOFT = 'rgba(91, 140, 255, 0.55)';
const GLOW_CORE = '#7EB0FF';

type VoiceCallInputWaveProps = {
  /** 0..1 mic / activity level */
  level: number;
  size?: number;
  muted?: boolean;
  active?: boolean;
};

/**
 * Concentric glowing rings driven by mic input level — matches Soulthread dark/blue call UI.
 */
export function VoiceCallInputWave({
  level,
  size = 220,
  muted = false,
  active = true,
}: VoiceCallInputWaveProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const levelAnim = useRef(new Animated.Value(0)).current;
  const clamped = muted ? 0 : Math.max(0, Math.min(1, level));

  useEffect(() => {
    Animated.timing(levelAnim, {
      toValue: clamped,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [clamped, levelAnim]);

  useEffect(() => {
    if (!active || muted) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, muted, pulse]);

  const rings = useMemo(() => {
    const base = size * 0.22;
    return [0, 1, 2, 3, 4].map((i) => ({
      key: i,
      r: base + i * (size * 0.075),
      opacity: 0.12 + i * 0.06,
    }));
  }, [size]);

  const coreScale = levelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const ringBoost = levelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.28],
  });
  const glowOpacity = levelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.92],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.glowBlob,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size * 0.36,
            opacity: Animated.add(
              glowOpacity,
              pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
            ),
            transform: [{ scale: ringBoost }],
          },
        ]}
      />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={GLOW_CORE} stopOpacity="0.95" />
            <Stop offset="55%" stopColor={GLOW} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={GLOW} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {rings.map((ring, idx) => {
          const scale = 1 + clamped * (0.04 + idx * 0.035);
          return (
            <Circle
              key={ring.key}
              cx={size / 2}
              cy={size / 2}
              r={ring.r * scale}
              stroke={GLOW_SOFT}
              strokeWidth={1.2 + clamped * 1.4}
              fill="none"
              opacity={muted ? 0.08 : ring.opacity + clamped * 0.35}
            />
          );
        })}
        <Circle cx={size / 2} cy={size / 2} r={size * 0.16} fill="url(#coreGlow)" />
      </Svg>
      <Animated.View
        style={[
          styles.coreIcon,
          {
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            transform: [{ scale: coreScale }],
          },
        ]}
      >
        <Ionicons
          name={muted ? 'volume-mute' : 'volume-high'}
          size={Math.round(size * 0.12)}
          color="#F4F7FF"
        />
      </Animated.View>
      {Platform.OS === 'web' ? (
        <View style={styles.webHint} pointerEvents="none" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBlob: {
    position: 'absolute',
    backgroundColor: 'rgba(91, 140, 255, 0.22)',
    ...(Platform.OS === 'web' ? ({ filter: 'blur(28px)' } as object) : null),
  },
  coreIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 36, 72, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(126, 176, 255, 0.45)',
  },
  webHint: {
    ...StyleSheet.absoluteFill,
  },
});
