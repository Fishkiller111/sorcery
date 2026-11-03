import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
  Image as RNImage,
  type LayoutChangeEvent,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FigureMediaView } from '../../components/create-agent/FigureMediaView';
import { isVideoFigureUrl } from '../../utils/figureMedia';
import { Typo } from '../../theme/typography';
import { TOKENS } from '../../pages/default/theme/tokens';
import { ABSOLUTE_FILL, COVER_IMAGE_FILL } from '../../theme/absoluteFill';

const BLUR_START = 28;
const REVEAL_MS = 320;
/** iOS 列表封面用 RN Image；web 继续 expo-image。 */
const USE_EXPO_STILL = Platform.OS === 'web';

type AgentRatingCoverProps = {
  uri: string | null;
  nameFallbackInitial: string;
  rBlurred: boolean;
  matureLocked: boolean;
  revealRLabel?: string;
  matureLockLabel?: string;
  /** Prefer expo-image for stills (web); native stills use RN Image. */
  useExpoImage?: boolean;
  /** expo-image 淡入时长；滑动叠卡请传 0，避免换层时再淡一次。 */
  imageTransitionMs?: number;
  /** R 软模糊时点击揭开（如「Tap to view」）。 */
  onRevealPress?: () => void;
  /** Mature 硬锁时点击（跳转设置等）。 */
  onLockedPress?: () => void;
};

/**
 * Cover with R soft-blur (animated unblur) and Mature hard lock overlay.
 * 原生列表必须给 Image 明确像素尺寸；勿用已删除的 StyleSheet.absoluteFill。
 */
export function AgentRatingCover({
  uri,
  nameFallbackInitial,
  rBlurred,
  matureLocked,
  revealRLabel = 'Tap to view',
  matureLockLabel = 'Mature',
  useExpoImage = USE_EXPO_STILL,
  imageTransitionMs = REVEAL_MS,
  onRevealPress,
  onLockedPress,
}: AgentRatingCoverProps) {
  const softBlur = rBlurred || matureLocked;
  const blurAnim = useRef(new Animated.Value(softBlur ? BLUR_START : 0)).current;
  const [blurRadius, setBlurRadius] = useState(softBlur ? BLUR_START : 0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const wasBlurred = useRef(softBlur);

  useEffect(() => {
    const id = blurAnim.addListener(({ value }) => setBlurRadius(value));
    return () => blurAnim.removeListener(id);
  }, [blurAnim]);

  useEffect(() => {
    setLoadFailed(false);
    setRetryToken(0);
  }, [uri]);

  useEffect(() => {
    if (!uri || Platform.OS === 'web' || isVideoFigureUrl(uri)) return;
    void RNImage.prefetch(uri).catch(() => undefined);
  }, [uri]);

  useEffect(() => {
    if (softBlur) {
      blurAnim.setValue(BLUR_START);
      setBlurRadius(BLUR_START);
      wasBlurred.current = true;
      return;
    }
    if (wasBlurred.current) {
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: REVEAL_MS,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) wasBlurred.current = false;
      });
    } else {
      blurAnim.setValue(0);
      setBlurRadius(0);
    }
  }, [softBlur, blurAnim]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setBox((prev) =>
      Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5
        ? prev
        : { w: width, h: height },
    );
  }, []);

  const onImageError = useCallback(() => {
    if (retryToken < 1) {
      setRetryToken((n) => n + 1);
      return;
    }
    setLoadFailed(true);
  }, [retryToken]);

  const isVideo = Boolean(uri && isVideoFigureUrl(uri));
  const showImage = Boolean(uri) && !loadFailed;
  const blurProp = blurRadius > 0 ? blurRadius : undefined;
  const sizedFill =
    box.w > 0 && box.h > 0
      ? ({ width: box.w, height: box.h } as const)
      : COVER_IMAGE_FILL;

  return (
    <View style={styles.wrap} collapsable={false} onLayout={onLayout}>
      {showImage ? (
        isVideo ? (
          <FigureMediaView
            uri={uri!}
            style={sizedFill}
            useExpoImage={useExpoImage}
            contentFit="cover"
            contentPosition="top"
            blurRadius={blurProp}
          />
        ) : useExpoImage ? (
          <ExpoImage
            key={`${uri}-${retryToken}`}
            source={{ uri: uri! }}
            style={sizedFill}
            contentFit="cover"
            contentPosition="top"
            transition={imageTransitionMs}
            blurRadius={blurProp}
            recyclingKey={`${uri}-${retryToken}`}
            cachePolicy="memory-disk"
            onError={onImageError}
          />
        ) : (
          <RNImage
            key={`${uri}-${retryToken}`}
            source={{ uri: uri! }}
            style={sizedFill}
            resizeMode="cover"
            blurRadius={blurProp}
            onError={onImageError}
          />
        )
      ) : (
        <View style={[sizedFill, styles.placeholder]}>
          <Text style={styles.initial}>{nameFallbackInitial}</Text>
        </View>
      )}

      {softBlur ? <View style={styles.scrim} pointerEvents="none" /> : null}

      {matureLocked ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>M</Text>
        </View>
      ) : null}
      {rBlurred ? (
        <View style={[styles.badge, styles.badgeR]}>
          <Text style={styles.badgeText}>R</Text>
        </View>
      ) : null}

      {rBlurred ? (
        onRevealPress ? (
          <Pressable
            style={styles.overlay}
            onPress={onRevealPress}
            accessibilityRole="button"
            accessibilityLabel={revealRLabel}
          >
            <View style={styles.hintBtn}>
              <Text style={styles.hintText}>{revealRLabel}</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.hintBtn}>
              <Text style={styles.hintText}>{revealRLabel}</Text>
            </View>
          </View>
        )
      ) : null}

      {matureLocked ? (
        onLockedPress ? (
          <Pressable
            style={styles.overlay}
            onPress={onLockedPress}
            accessibilityRole="button"
            accessibilityLabel={matureLockLabel}
          >
            <Ionicons name="lock-closed" size={22} color="#fff" />
            <View style={styles.hintBtn}>
              <Text style={styles.hintText}>{matureLockLabel}</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.overlay} pointerEvents="none">
            <Ionicons name="lock-closed" size={22} color="#fff" />
            <View style={styles.hintBtn}>
              <Text style={styles.hintText}>{matureLockLabel}</Text>
            </View>
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...ABSOLUTE_FILL,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.cardSolid,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  initial: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 28,
    },
    'serif',
  ),
  scrim: {
    ...ABSOLUTE_FILL,
    backgroundColor: 'rgba(8,6,12,0.28)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeR: {
    backgroundColor: 'rgba(120,70,20,0.75)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  overlay: {
    ...ABSOLUTE_FILL,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hintBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as object) : null),
  },
  hintText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
