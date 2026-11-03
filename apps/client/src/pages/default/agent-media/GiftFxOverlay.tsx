import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { resolveStaticUrl } from '../../../constants/config';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import type { SendMediaResp } from '../../../types/api';
import { AgentMediaVideoView } from './AgentMediaVideoView';

type GiftFxOverlayProps = {
  visible: boolean;
  tier: number;
  giftImageUrl?: string;
  reward?: SendMediaResp | null;
  agentName?: string;
  onDone: () => void;
};

const TIER = {
  1: {
    duration: 1600,
    count: 10,
    icon: 78,
    glow: 16,
    colors: ['#FF8FAB', '#FF5C8A', '#FFFFFF'],
    veil: ['rgba(40, 8, 22, 0.42)', 'rgba(12, 6, 18, 0.78)'] as const,
  },
  2: {
    duration: 2200,
    count: 18,
    icon: 92,
    glow: 24,
    colors: ['#C44DFF', '#8B5CF6', '#FF6B9D', '#EDE4FF'],
    veil: ['rgba(28, 8, 42, 0.5)', 'rgba(10, 6, 22, 0.82)'] as const,
  },
  3: {
    duration: 2800,
    count: 28,
    icon: 108,
    glow: 34,
    colors: ['#FFD166', '#FF8FAB', '#C44DFF', '#FFF4C2'],
    veil: ['rgba(42, 18, 8, 0.52)', 'rgba(14, 6, 18, 0.86)'] as const,
  },
  4: {
    duration: 3600,
    count: 40,
    icon: 124,
    glow: 46,
    colors: ['#FFE08A', '#FFD166', '#FFB703', '#FFFFFF', '#FF6B9D'],
    veil: ['rgba(48, 28, 6, 0.55)', 'rgba(12, 6, 16, 0.9)'] as const,
  },
} as const;

function clampTier(tier: number): 1 | 2 | 3 | 4 {
  if (tier >= 4) return 4;
  if (tier <= 1) return 1;
  return tier as 2 | 3;
}

function hasRewardMedia(reward?: SendMediaResp | null): boolean {
  if (!reward) return false;
  return Boolean(reward.file_url || reward.image_url || reward.cover_url || reward.blur_url);
}

function GiftParticle({
  delay,
  x,
  size,
  color,
  duration,
  drift,
  rise,
}: {
  delay: number;
  x: number;
  size: number;
  color: string;
  duration: number;
  drift: number;
  rise: number;
}) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: Math.max(280, duration - delay - 220), easing: Easing.in(Easing.quad) }),
      ),
    );
    scale.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withTiming(-rise, { duration, easing: Easing.out(Easing.quad) }));
  }, [delay, duration, opacity, rise, scale, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: y.value },
      { translateX: drift * (y.value / -Math.max(rise, 1)) },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { left: x, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

function GiftRay({ index, total, color, delay }: { index: number; total: number; color: string; delay: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.72, { duration: 280 }),
        withTiming(0, { duration: 1400, easing: Easing.out(Easing.quad) }),
      ),
    );
    scale.value = withDelay(delay, withTiming(1.35, { duration: 1600, easing: Easing.out(Easing.cubic) }));
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${(360 / total) * index}deg` }, { scaleY: scale.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.rayWrap, style]}>
      <View style={[styles.ray, { backgroundColor: color }]} />
    </Animated.View>
  );
}

export function GiftFxOverlay({
  visible,
  tier,
  giftImageUrl,
  reward,
  agentName,
  onDone,
}: GiftFxOverlayProps) {
  const { t, tp } = useI18n();
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<'burst' | 'reward'>('burst');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const shake = useSharedValue(0);
  const iconScale = useSharedValue(0.55);
  const iconGlow = useSharedValue(0.35);

  const safeTier = clampTier(tier);
  const cfg = TIER[safeTier];
  const giftUri = giftImageUrl ? resolveStaticUrl(giftImageUrl) : undefined;
  const showReward = hasRewardMedia(reward);

  const particles = useMemo(() => {
    const items = [];
    for (let i = 0; i < cfg.count; i += 1) {
      const u = ((i * 9301 + 49297) % 233280) / 233280;
      const v = ((i * 7919 + 104729) % 233280) / 233280;
      items.push({
        id: i,
        delay: Math.round(u * 420),
        x: Math.round(width * 0.08 + v * width * 0.84),
        size: 6 + Math.round(u * (safeTier >= 3 ? 14 : 8)),
        color: cfg.colors[i % cfg.colors.length],
        drift: Math.round((u - 0.5) * 90),
        rise: Math.round(height * (0.42 + v * 0.28)),
      });
    }
    return items;
  }, [cfg.colors, cfg.count, height, safeTier, width]);

  useEffect(() => {
    if (!visible) return;
    setPhase('burst');
    iconScale.value = 0.55;
    iconGlow.value = 0.35;
    iconScale.value = withSequence(
      withTiming(1.12, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 280, easing: Easing.inOut(Easing.quad) }),
    );
    iconGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 520 }), withTiming(0.45, { duration: 520 })),
      -1,
      false,
    );
    if (safeTier >= 4) {
      shake.value = withRepeat(
        withSequence(
          withTiming(7, { duration: 40 }),
          withTiming(-7, { duration: 40 }),
          withTiming(0, { duration: 40 }),
        ),
        8,
        false,
      );
    } else {
      shake.value = 0;
    }

    const timer = setTimeout(() => {
      if (showReward) {
        setPhase('reward');
      } else {
        onDoneRef.current();
      }
    }, cfg.duration);
    return () => clearTimeout(timer);
  }, [cfg.duration, iconGlow, iconScale, safeTier, shake, showReward, visible]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: 0.85 + iconGlow.value * 0.15,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.28 + iconGlow.value * 0.45,
    transform: [{ scale: 0.9 + iconGlow.value * 0.18 }],
  }));

  if (!visible) return null;

  const fileUri = resolveStaticUrl(reward?.file_url || reward?.image_url);
  const coverUri = resolveStaticUrl(reward?.cover_url || reward?.blur_url);
  const isVideo = (reward?.media_type || '').toLowerCase() === 'video';
  const mediaUri = fileUri || coverUri;

  const skipBurst = () => {
    if (phase !== 'burst') return;
    if (showReward) setPhase('reward');
    else onDone();
  };

  return (
    <Modal visible transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={onDone}>
      <Pressable style={styles.root} onPress={phase === 'burst' ? skipBurst : onDone}>
        <LinearGradient colors={[...cfg.veil]} style={StyleSheet.absoluteFill} />

        {phase === 'burst' ? (
          <Animated.View style={[styles.burst, shakeStyle]} pointerEvents="none">
            {safeTier >= 3
              ? Array.from({ length: safeTier === 4 ? 12 : 8 }).map((_, i) => (
                  <GiftRay
                    key={`ray-${i}`}
                    index={i}
                    total={safeTier === 4 ? 12 : 8}
                    color={cfg.colors[i % cfg.colors.length]}
                    delay={40 * i}
                  />
                ))
              : null}
            {particles.map((p) => (
              <GiftParticle
                key={p.id}
                delay={p.delay}
                x={p.x}
                size={p.size}
                color={p.color}
                duration={cfg.duration}
                drift={p.drift}
                rise={p.rise}
              />
            ))}
            <Animated.View
              style={[
                styles.glow,
                {
                  width: cfg.icon + cfg.glow * 2,
                  height: cfg.icon + cfg.glow * 2,
                  borderRadius: (cfg.icon + cfg.glow * 2) / 2,
                  shadowRadius: cfg.glow,
                  backgroundColor: cfg.colors[0],
                },
                glowStyle,
              ]}
            />
            <Animated.View
              entering={FadeIn.duration(280)}
              style={[
                styles.iconWrap,
                {
                  width: cfg.icon,
                  height: cfg.icon,
                  borderRadius: cfg.icon / 2,
                },
                iconStyle,
              ]}
            >
              {giftUri ? (
                <Image source={{ uri: giftUri }} style={styles.icon} contentFit="cover" />
              ) : (
                <Ionicons name="gift" size={Math.round(cfg.icon * 0.42)} color="#fff" />
              )}
            </Animated.View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(360)} exiting={FadeOut.duration(180)} style={styles.rewardWrap}>
            <Text style={styles.rewardTitle}>
              {agentName
                ? tp('agentMedia.giftRewardFrom', { name: agentName })
                : t('agentMedia.giftRewardTitle')}
            </Text>
            <Pressable style={styles.rewardFrame} onPress={(e) => e.stopPropagation?.()}>
              {isVideo && fileUri ? (
                <AgentMediaVideoView
                  uri={fileUri}
                  style={styles.rewardMedia}
                  contentFit="contain"
                  muted
                  loop
                  autoPlay
                  nativeControls
                />
              ) : mediaUri ? (
                <Image source={{ uri: mediaUri }} style={styles.rewardMedia} contentFit="contain" />
              ) : null}
            </Pressable>
            <Text style={styles.rewardHint}>{t('agentMedia.giftRewardClose')}</Text>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(4, 2, 10, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    bottom: '28%',
    shadowColor: '#fff',
    shadowOpacity: 0.55,
    shadowRadius: 8,
  },
  rayWrap: {
    position: 'absolute',
    width: 8,
    height: 280,
    alignItems: 'center',
  },
  ray: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    opacity: 0.85,
  },
  glow: {
    position: 'absolute',
    shadowColor: '#FFD166',
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
  },
  iconWrap: {
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 12, 32, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  rewardWrap: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
  },
  rewardTitle: Typo(
    {
      color: '#FFF6E8',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    'sans',
  ),
  rewardFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 520,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0a0b0f',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.28)',
  },
  rewardMedia: {
    width: '100%',
    height: '100%',
  },
  rewardHint: Typo(
    {
      color: 'rgba(255,255,255,0.62)',
      fontSize: 13,
      textAlign: 'center',
    },
    'sans',
  ),
});
