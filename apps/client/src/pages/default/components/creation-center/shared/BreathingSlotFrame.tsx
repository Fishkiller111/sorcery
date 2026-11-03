import React, { useEffect, useRef } from 'react';
import {
  View,
  Platform,
  Animated,
  Easing,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GLOW_PINK = '255, 105, 145';
const GLOW_DEEP = '186, 60, 71';

type BreathingSlotFrameProps = {
  active: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * 预设槽外层呼吸光框：避免卡片 overflow:hidden 裁切辉光。
 * 生图 / 生视频共用。
 */
export function BreathingSlotFrame({
  active,
  compact,
  style,
  children,
}: BreathingSlotFrameProps) {
  const breath = useRef(new Animated.Value(0)).current;
  const radius = compact ? 14 : 16;
  const innerRadius = Math.max(10, radius - 2);

  useEffect(() => {
    if (!active) {
      breath.stopAnimation();
      breath.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [active, breath]);

  const rimOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.95],
  });

  const outerGlowStyle = {
    borderColor: active
      ? breath.interpolate({
          inputRange: [0, 1],
          outputRange: [`rgba(${GLOW_PINK}, 0.55)`, `rgba(${GLOW_PINK}, 1)`],
        })
      : 'transparent',
    shadowOpacity: active
      ? breath.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 0.9],
        })
      : 0,
    shadowRadius: active
      ? breath.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 24],
        })
      : 0,
    ...(Platform.OS === 'web' && active
      ? ({
          boxShadow: breath.interpolate({
            inputRange: [0, 1],
            outputRange: [
              `0 0 0 1.5px rgba(${GLOW_PINK}, 0.55), 0 0 14px rgba(${GLOW_DEEP}, 0.35)`,
              `0 0 0 2px rgba(${GLOW_PINK}, 0.95), 0 0 30px rgba(${GLOW_PINK}, 0.65)`,
            ],
          }),
        } as object)
      : Platform.OS === 'web'
        ? ({ boxShadow: 'none' } as object)
        : {}),
  };

  const insetGlowStyle =
    Platform.OS === 'web' && active
      ? ({
          boxShadow: breath.interpolate({
            inputRange: [0, 1],
            outputRange: [
              `inset 0 0 16px rgba(${GLOW_PINK}, 0.35), inset 0 0 36px rgba(${GLOW_DEEP}, 0.22)`,
              `inset 0 0 28px rgba(${GLOW_PINK}, 0.7), inset 0 0 52px rgba(${GLOW_DEEP}, 0.42)`,
            ],
          }),
          borderColor: breath.interpolate({
            inputRange: [0, 1],
            outputRange: [`rgba(${GLOW_PINK}, 0.35)`, `rgba(${GLOW_PINK}, 0.85)`],
          }),
        } as object)
      : null;

  return (
    <Animated.View
      style={[
        {
          borderRadius: radius,
          borderWidth: 2,
          shadowColor: `rgb(${GLOW_PINK})`,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
        outerGlowStyle,
      ]}
    >
      <View style={{ flex: 1, borderRadius: innerRadius, overflow: 'hidden' }}>
        {children}
        {active ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: innerRadius,
                  borderWidth: 1.5,
                  borderColor: `rgba(${GLOW_PINK}, 0.55)`,
                },
                insetGlowStyle,
                Platform.OS !== 'web' ? { opacity: rimOpacity } : null,
              ]}
            />
            {Platform.OS !== 'web' ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: rimOpacity,
                }}
              >
                <LinearGradient
                  colors={[`rgba(${GLOW_PINK}, 0.55)`, 'transparent']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 36 }}
                />
                <LinearGradient
                  colors={['transparent', `rgba(${GLOW_PINK}, 0.55)`]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 36 }}
                />
                <LinearGradient
                  colors={[`rgba(${GLOW_PINK}, 0.4)`, 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 28 }}
                />
                <LinearGradient
                  colors={['transparent', `rgba(${GLOW_PINK}, 0.4)`]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 28 }}
                />
              </Animated.View>
            ) : null}
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** 供槽位尺寸样式复用 */
export const breathingSlotSizeStyles = StyleSheet.create({
  slotCardSize: {
    width: '48%',
    aspectRatio: 9 / 16,
  },
  slotCardCompact: {
    width: 112,
    aspectRatio: 9 / 16,
  },
});
