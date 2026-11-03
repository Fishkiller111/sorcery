import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GLOW_RED = '#E23B3B';
const GLOW_BLUE = '#3B6AE8';
const BORDER_COLORS = [GLOW_RED, GLOW_BLUE, GLOW_RED] as const;
const BREATH_MS = 1600;

type VerifiedRealPersonGlowFrameProps = {
  active: boolean;
  /** 为 false 时仍保留渐变边框，但不跑呼吸动画（滚出视口）。 */
  pulse?: boolean;
  radius?: number;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * 真人分身边框：红→蓝对角渐变，外圈辉光随呼吸明暗。
 * 辉光放在 overflow:hidden 的卡片外侧，避免被裁切。
 */
export function VerifiedRealPersonGlowFrame({
  active,
  pulse = true,
  radius = 16,
  borderWidth = 2,
  style,
  children,
}: VerifiedRealPersonGlowFrameProps) {
  const breath = useRef(new Animated.Value(0.55)).current;
  const innerRadius = Math.max(8, radius - borderWidth);
  const shouldPulse = active && pulse;

  useEffect(() => {
    if (!shouldPulse) {
      breath.stopAnimation();
      breath.setValue(0.55);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [shouldPulse, breath]);

  if (!active) {
    return <View style={style}>{children}</View>;
  }

  const glowOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 1],
  });
  const glowSpread = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 18],
  });
  const webBoxShadow =
    Platform.OS === 'web'
      ? ({
          boxShadow: breath.interpolate({
            inputRange: [0, 1],
            outputRange: [
              `0 0 10px 1px rgba(226, 59, 59, 0.45), 0 0 16px 2px rgba(59, 106, 232, 0.35)`,
              `0 0 22px 3px rgba(226, 59, 59, 0.85), 0 0 28px 6px rgba(59, 106, 232, 0.7)`,
            ],
          }),
        } as object)
      : null;

  return (
    <View style={[styles.host, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            borderRadius: radius + 6,
            opacity: glowOpacity,
            shadowColor: GLOW_RED,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: glowSpread,
            ...webBoxShadow,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(226, 59, 59, 0.55)', 'rgba(59, 106, 232, 0.5)', 'rgba(226, 59, 59, 0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.glowFill, { borderRadius: radius + 6 }]}
        />
      </Animated.View>
      <LinearGradient
        colors={[...BORDER_COLORS]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.border, { borderRadius: radius, padding: borderWidth }]}
      >
        <View style={[styles.inner, { borderRadius: innerRadius }]}>{children}</View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    alignSelf: 'stretch',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -5,
    right: -5,
    bottom: -5,
    left: -5,
  },
  glowFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  border: {
    width: '100%',
    alignSelf: 'stretch',
  },
  inner: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
});
