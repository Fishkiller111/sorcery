import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

const LOGO = require('../../../assets/icon.png');

const MIN_SPLASH_MS = 2200;
const EXIT_MS = 480;
const LOGO_SIZE = 112;
const RING_SIZE = LOGO_SIZE + 36;
const GLOW_SIZE = LOGO_SIZE + 54;
const GLOW_INSET = (RING_SIZE - GLOW_SIZE) / 2;
const LOGO_INSET = (RING_SIZE - LOGO_SIZE) / 2;

const LOGO_GLOW_SHADOW = '0 0 28px 10px rgba(196, 30, 58, 0.75)';
const LOGO_DROP_SHADOW = '0 8px 18px rgba(0, 0, 0, 0.45)';

type AppLaunchSplashProps = {
  ready: boolean;
  onFinish: () => void;
};

function LaunchDot({ delayMs }: { delayMs: number }) {
  const opacity = useSharedValue(0.28);

  useEffect(() => {
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0.28, { duration: 420, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.85 + opacity.value * 0.15 }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function AppLaunchSplash({ ready, onFinish }: AppLaunchSplashProps) {
  const mountedAt = useRef(Date.now());
  const finishedRef = useRef(false);
  const rootOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.86);
  const logoOpacity = useSharedValue(0);
  const ringRotation = useSharedValue(0);
  const glowScale = useSharedValue(0.92);
  const glowOpacity = useSharedValue(0.35);
  const taglineShimmer = useSharedValue(0.72);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSequence(
      withTiming(1.04, { duration: 720, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
    );

    ringRotation.value = withRepeat(
      withTiming(360, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.62, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.28, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    taglineShimmer.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.72, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [glowOpacity, glowScale, logoOpacity, logoScale, ringRotation, taglineShimmer]);

  useEffect(() => {
    if (!ready || finishedRef.current) return;

    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);

    const timer = setTimeout(() => {
      finishedRef.current = true;
      rootOpacity.value = withTiming(0, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) runOnJS(onFinish)();
      });
    }, remaining);

    return () => clearTimeout(timer);
  }, [onFinish, ready, rootOpacity]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: rootOpacity.value,
  }));

  const logoMotionStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringMotionStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }],
  }));

  const glowMotionStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineShimmer.value,
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0a0b0f', '#0d0e14', '#0a0b0f']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(196, 30, 58, 0.16)', 'transparent', 'rgba(107, 127, 215, 0.08)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0.15 }}
        end={{ x: 0.85, y: 0.95 }}
      />

      <Animated.View style={[styles.fadeRoot, rootStyle]}>
        <View style={styles.content}>
          {/*
            Positioning uses plain View + explicit left/top.
            Reanimated Animated.View keeps only opacity/transform — on Android,
            absolute + animated transform on the same node was laying out as a column.
          */}
          <View collapsable={false} style={styles.logoStage}>
            <View style={styles.stageSpacer} />
            <View pointerEvents="none" collapsable={false} style={styles.glowSlot}>
              <Animated.View style={[styles.glowDisc, glowMotionStyle]} />
            </View>

            <View pointerEvents="none" collapsable={false} style={styles.ringSlot}>
              <Animated.View style={ringMotionStyle}>
                <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                  <Defs>
                    <SvgGradient id="threadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={COLORS.accent.red} stopOpacity="0.15" />
                      <Stop offset="42%" stopColor={COLORS.accent.red} stopOpacity="1" />
                      <Stop offset="78%" stopColor="#f4d0d8" stopOpacity="0.95" />
                      <Stop offset="100%" stopColor={COLORS.accent.red} stopOpacity="0.2" />
                    </SvgGradient>
                  </Defs>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={(RING_SIZE - 8) / 2}
                    stroke="url(#threadGradient)"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="92 240"
                  />
                </Svg>
              </Animated.View>
            </View>

            <View collapsable={false} style={styles.logoSlot}>
              <Animated.View style={[styles.logoWrap, logoMotionStyle]}>
                <Image source={LOGO} style={styles.logo} contentFit="cover" transition={0} />
              </Animated.View>
            </View>
          </View>

          <Animated.View entering={FadeInUp.delay(420).duration(620)} style={styles.copyBlock}>
            <Text style={styles.brand}>Soulthread</Text>
            <Animated.View style={taglineStyle}>
              <Text style={styles.tagline}>Characters that remember.</Text>
            </Animated.View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(760).duration(520)} style={styles.dotsRow}>
            <LaunchDot delayMs={0} />
            <LaunchDot delayMs={160} />
            <LaunchDot delayMs={320} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  fadeRoot: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoStage: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: 28,
  },
  stageSpacer: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  glowSlot: {
    position: 'absolute',
    left: GLOW_INSET,
    top: GLOW_INSET,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
  glowDisc: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: COLORS.accent.red,
    boxShadow: LOGO_GLOW_SHADOW,
  },
  ringSlot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RING_SIZE,
    height: RING_SIZE,
  },
  logoSlot: {
    position: 'absolute',
    left: LOGO_INSET,
    top: LOGO_INSET,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: LOGO_DROP_SHADOW,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 10,
  },
  brand: Typo(
    {
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: 2.4,
      color: COLORS.text.primary,
      textAlign: 'center',
    },
    'display',
  ),
  tagline: Typo(
    {
      fontSize: 16,
      lineHeight: 22,
      fontStyle: 'italic',
      letterSpacing: 0.3,
      color: COLORS.accent.gold,
      textAlign: 'center',
    },
    'sans',
  ),
  dotsRow: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent.red,
  },
});
