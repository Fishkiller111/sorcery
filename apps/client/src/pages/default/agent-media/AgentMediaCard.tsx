import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../theme/typography';
import type { RoleMediaItem } from '../../../types/api';
import {
  isMatureMediaLocked,
  isMatureRated,
  isRRated,
  isRoleMediaSoftBlurred,
  isRoleMediaVideo,
  MATURE_LOCKED_REASON,
  needsMatureMediaRefresh,
  resolveRoleMediaFileUrl,
  resolveRoleMediaThumbUrl,
  softBlurRadius,
} from '../../../utils/mediaDisplay';
import {
  isSessionRevealed,
  markSessionRevealed,
  mediaRevealKey,
} from '../../../utils/mediaRevealSession';
import { AGENT_MEDIA } from './agentMediaTokens';
import { LazyVideo } from '../../../components/media/LazyVideo';
import { useInViewport } from '../../../hooks/useInViewport';
import {
  claimPreviewPlayback,
  releasePreviewPlayback,
  usePreviewPlaybackOwner,
} from '../../../utils/previewPlaybackGate';

const R_REVEAL_MS = 320;
const WEB_FILTER_BLUR = 12;

function formatDuration(ms?: number): string | null {
  if (!ms || ms <= 0) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type AgentMediaCardProps = {
  item: RoleMediaItem;
  width: number;
  unlockLabel: string;
  revealRLabel?: string;
  unlocking?: boolean;
  /** Viewer has Content Tier mature + VIP mature_mode. */
  canSeeMature?: boolean;
  onPress?: () => void;
  onUnlock?: () => void;
};

export function AgentMediaCard({
  item,
  width,
  unlockLabel,
  revealRLabel = 'Tap to view',
  unlocking,
  canSeeMature = false,
  onPress,
  onUnlock,
}: AgentMediaCardProps) {
  const height = Math.round(width * (16 / 9));
  const compact = width < 110;
  const revealKey = mediaRevealKey('media', item.media_id);
  const useWebFilterBlur = Platform.OS === 'web';
  const [rRevealed, setRRevealed] = useState(() => isSessionRevealed(revealKey));
  const [revealAnimating, setRevealAnimating] = useState(false);
  const initialSoft = isRoleMediaSoftBlurred(item, {
    canSeeMature,
    revealed: isSessionRevealed(revealKey),
  });
  const initialBlur = initialSoft ? (useWebFilterBlur ? WEB_FILTER_BLUR : 24) : 0;
  const blurAnim = useRef(new Animated.Value(initialBlur)).current;
  const [animBlur, setAnimBlur] = useState(initialBlur);
  const hintOpacity = useRef(new Animated.Value(initialSoft ? 1 : 0)).current;
  const prevSoftBlurred = useRef(initialSoft);

  useEffect(() => {
    setRRevealed(isSessionRevealed(revealKey));
    setRevealAnimating(false);
  }, [revealKey]);

  useEffect(() => {
    const id = blurAnim.addListener(({ value }) => setAnimBlur(value));
    return () => blurAnim.removeListener(id);
  }, [blurAnim]);

  const paidLocked = Boolean(item.locked) && item.locked_reason !== MATURE_LOCKED_REASON;
  const matureHardLocked = isMatureMediaLocked(item, canSeeMature);
  const matureNeedsRefresh = needsMatureMediaRefresh(item, canSeeMature);
  const softBlurred = isRoleMediaSoftBlurred(item, {
    canSeeMature,
    revealed: rRevealed,
  });
  // Mature mode on: never show hard Unlock for mature — soft-blur tap-to-reveal like R.
  const showLock = paidLocked || matureHardLocked;
  const showMatureBadge =
    matureHardLocked ||
    (canSeeMature &&
      (isMatureRated(item) || item.locked_reason === MATURE_LOCKED_REASON));
  const isVideo = isRoleMediaVideo(item);
  // Web 软遮罩：取清晰资源再叠 CSS blur（与图片媒体一致，便于揭开动画）
  const preferClearMedia = useWebFilterBlur && (softBlurred || revealAnimating);
  const clearThumb = resolveRoleMediaThumbUrl(item, {
    revealed: preferClearMedia ? true : rRevealed,
    canSeeMature,
  });
  // 无清晰封面时回退模糊资源，避免只剩空占位
  const cover =
    clearThumb ||
    (preferClearMedia
      ? resolveRoleMediaThumbUrl(item, { revealed: rRevealed, canSeeMature })
      : undefined);
  // 软遮罩 / 揭开动画中也解析清晰视频源，供无封面时叠 filter
  const videoUri =
    !showLock && isVideo
      ? resolveRoleMediaFileUrl(item, {
          revealed: softBlurred || revealAnimating ? true : rRevealed,
          canSeeMature,
        })
      : undefined;
  const duration = isVideo ? formatDuration(item.duration_ms) : null;
  const [hovered, setHovered] = useState(false);
  /** 有封面时：首次 hover 后保留 video 挂载 */
  const [videoKept, setVideoKept] = useState(false);
  /** 无封面：进入视口后保留挂载，滚出不卸 */
  const [inlineKept, setInlineKept] = useState(false);
  const cardRef = useRef<View>(null);
  const inView = useInViewport(cardRef);
  const ownsPlayback = usePreviewPlaybackOwner(item.media_id);

  useEffect(() => {
    if (inView) setInlineKept(true);
  }, [inView]);

  // 无封面：进入过视口后保留；有封面：首次 hover 后保留挂载
  const showInlineVideo = Boolean(
    videoUri &&
      (cover
        ? Platform.OS === 'web' &&
          videoKept &&
          !(softBlurred || revealAnimating)
        : inlineKept || inView),
  );
  // 软遮罩未揭开时不播放；揭开后仅 hover 播放
  const playInlineVideo = Boolean(
    showInlineVideo &&
      hovered &&
      ownsPlayback &&
      Platform.OS === 'web' &&
      !softBlurred &&
      !revealAnimating,
  );
  const mediaFilterStyle =
    useWebFilterBlur && animBlur > 0
      ? ({ filter: `blur(${animBlur}px)` } as object)
      : null;

  const targetSoftBlur = softBlurred
    ? useWebFilterBlur
      ? // 仅有预模糊资源时不再二次 filter；清晰图/无封面视频才叠 CSS blur
        !clearThumb && cover
          ? 0
          : WEB_FILTER_BLUR
      : softBlurRadius(Boolean(item.blur_url || item.blur_cover_url), softBlurred) ||
        (!item.blur_url && !item.blur_cover_url ? 24 : 0)
    : matureHardLocked && !item.blur_url && !item.blur_cover_url
      ? useWebFilterBlur
        ? WEB_FILTER_BLUR
        : 24
      : 0;

  useEffect(() => {
    const wasSoft = prevSoftBlurred.current;
    prevSoftBlurred.current = softBlurred;

    if (softBlurred) {
      blurAnim.stopAnimation();
      hintOpacity.stopAnimation();
      blurAnim.setValue(targetSoftBlur);
      setAnimBlur(targetSoftBlur);
      hintOpacity.setValue(1);
      setRevealAnimating(false);
      return;
    }

    // Soft-blur → clear: animate filter blur and hint out.
    if (wasSoft) {
      setRevealAnimating(true);
      Animated.parallel([
        Animated.timing(blurAnim, {
          toValue: 0,
          duration: R_REVEAL_MS,
          useNativeDriver: false,
        }),
        Animated.timing(hintOpacity, {
          toValue: 0,
          duration: R_REVEAL_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRevealAnimating(false);
      });
      return;
    }

    // Hard-lock client blur or idle — snap.
    blurAnim.setValue(targetSoftBlur);
    setAnimBlur(targetSoftBlur);
    hintOpacity.setValue(0);
  }, [softBlurred, targetSoftBlur, blurAnim, hintOpacity]);

  const handlePress = () => {
    // R / Mature (with Mature mode on): first tap clears blur; second opens preview.
    if (softBlurred) {
      markSessionRevealed(revealKey);
      setRevealAnimating(true);
      setRRevealed(true);
      // Stale redacted payload: refresh clear URLs in the same gesture.
      if (matureNeedsRefresh) {
        onUnlock?.();
      }
      return;
    }
    if (showLock) {
      onUnlock?.();
      return;
    }
    onPress?.();
  };

  const showRevealHint = softBlurred || revealAnimating;

  return (
    <View ref={cardRef} collapsable={false}>
    <Pressable
      onPress={handlePress}
      onHoverIn={() => {
        if (!videoUri) return;
        setVideoKept(true);
        claimPreviewPlayback(item.media_id);
        setHovered(true);
      }}
      onHoverOut={() => {
        releasePreviewPlayback(item.media_id);
        setHovered(false);
      }}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        { width, height },
        pressed && styles.pressed,
        hovered && styles.cardHovered,
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
      ]}
      accessibilityRole="button"
    >
      <LinearGradient colors={[...AGENT_MEDIA.cardGradient]} style={StyleSheet.absoluteFill} />
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={[StyleSheet.absoluteFill, mediaFilterStyle]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.media_id}
          transition={0}
          blurRadius={useWebFilterBlur ? 0 : animBlur}
        />
      ) : !showInlineVideo && isVideo ? (
        <View style={styles.videoPlaceholder} pointerEvents="none">
          <Ionicons name="videocam" size={compact ? 18 : 28} color="rgba(255,255,255,0.55)" />
        </View>
      ) : null}
      <LazyVideo
        active={Boolean(showInlineVideo && videoUri)}
        uri={videoUri || ''}
        style={[StyleSheet.absoluteFill, mediaFilterStyle]}
        contentFit="cover"
        muted
        loop
        autoPlay={playInlineVideo}
        resetOnPause
        nativeControls={false}
        interactive={false}
        preload="metadata"
      />

      {/* 原生端无 CSS filter：软遮罩且走视频首帧时补一层遮罩，避免清晰露出 */}
      {!useWebFilterBlur && showInlineVideo && softBlurred ? (
        <View style={styles.softBlurScrim} pointerEvents="none" />
      ) : null}

      {showLock ? <View style={styles.matureScrim} pointerEvents="none" /> : null}

      {duration ? (
        <View style={[styles.badge, compact && styles.badgeCompact]}>
          <Text style={[styles.badgeText, compact && styles.badgeTextCompact]}>{duration}</Text>
        </View>
      ) : isVideo ? (
        <View style={[styles.badge, compact && styles.badgeCompact]}>
          <Ionicons name="play" size={compact ? 10 : 12} color="#fff" />
        </View>
      ) : null}

      {showMatureBadge ? (
        <View style={[styles.matureTag, compact && styles.matureTagCompact]}>
          <Text style={[styles.matureTagText, compact && styles.matureTagTextCompact]}>M</Text>
        </View>
      ) : null}

      {showRevealHint && isRRated(item) ? (
        <Animated.View style={[styles.rTag, compact && styles.matureTagCompact, { opacity: hintOpacity }]}>
          <Text style={[styles.matureTagText, compact && styles.matureTagTextCompact]}>R</Text>
        </Animated.View>
      ) : null}

      {showRevealHint ? (
        <Animated.View
          style={[styles.lockOverlay, styles.lockOverlayClear, { opacity: hintOpacity }]}
          pointerEvents={softBlurred ? 'auto' : 'none'}
        >
          {!compact ? (
            <View style={styles.unlockBtn}>
              {unlocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.unlockText}>{revealRLabel}</Text>
              )}
            </View>
          ) : unlocking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : null}
        </Animated.View>
      ) : showLock ? (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={compact ? 14 : 22} color="#fff" />
          {paidLocked &&
          !compact &&
          (item.bundle_id
            ? (item.bundle_price_points || item.price_points || 0) > 0
            : item.price_points > 0) ? (
            <Text style={styles.lockPrice}>
              {item.bundle_id
                ? `${item.bundle_price_points || item.price_points} soul · Pack`
                : `${item.price_points} soul`}
            </Text>
          ) : null}
          {!compact ? (
            <View style={styles.unlockBtn}>
              {unlocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.unlockText}>{unlockLabel}</Text>
              )}
            </View>
          ) : unlocking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : null}
        </View>
      ) : null}
    </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AGENT_MEDIA.cardBorder,
    overflow: 'hidden',
    backgroundColor: '#101D37',
  },
  cardCompact: {
    borderRadius: 8,
  },
  cardHovered: {
    borderColor: 'rgba(255,255,255,0.28)',
  },
  pressed: {
    opacity: 0.92,
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101D37',
  },
  badgeCompact: {
    top: 4,
    left: 4,
    minWidth: 0,
    height: 18,
    paddingHorizontal: 6,
  },
  badgeTextCompact: Typo({ color: '#fff', fontSize: 9, fontWeight: '500' }, 'sans'),
  matureTagCompact: {
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  matureTagTextCompact: Typo({ color: '#fff', fontSize: 9, fontWeight: '700' }, 'sans'),
  matureScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 10, 16, 0.28)',
  },
  softBlurScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 10, 16, 0.55)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 28,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: Typo({ color: '#fff', fontSize: 11, fontWeight: '600' }, 'sans'),
  matureTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(160, 40, 90, 0.92)',
  },
  rTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(180, 60, 60, 0.92)',
  },
  matureTagText: Typo({ color: '#fff', fontSize: 11, fontWeight: '800' }, 'sans'),
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 10, 16, 0.28)',
  },
  lockOverlayClear: {
    backgroundColor: 'transparent',
  },
  lockPrice: Typo({ color: '#fff', fontSize: 12, fontWeight: '700' }, 'sans'),
  unlockBtn: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  unlockText: Typo({ color: '#fff', fontSize: 11, fontWeight: '600' }, 'sans'),
});
