import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveStaticUrl } from '../../../constants/config';
import { Typo } from '../../../theme/typography';
import { useI18n } from '../../../i18n/I18nContext';
import { resolveRoleCategoryName } from '../../../utils/roleCategory';
import { AgentRatingCover } from '../../../components/agent/AgentRatingCover';
import { LazyVideo } from '../../../components/media/LazyVideo';
import { useInViewport } from '../../../hooks/useInViewport';
import { VerifiedRealPersonBadge } from '../../../components/agent/VerifiedRealPersonBadge';
import { VerifiedRealPersonGlowFrame } from '../../../components/agent/VerifiedRealPersonGlowFrame';
import { isVerifiedRealPerson } from '../../../utils/verifiedRealPerson';
import {
  canUserSeeMature,
  isAgentMatureLocked,
  isAgentRBlurred,
} from '../../../utils/agentRatingDisplay';
import {
  markSessionRevealed,
  mediaRevealKey,
  isSessionRevealed,
} from '../../../utils/mediaRevealSession';
import {
  claimPreviewPlayback,
  releasePreviewPlayback,
  usePreviewPlaybackOwner,
} from '../../../utils/previewPlaybackGate';
import { useAuthStore } from '../../../stores/authStore';
import type { ExploreRoleItem } from '../../../types/api';
import { TOKENS } from '../theme/tokens';
import { ABSOLUTE_FILL } from '../../../theme/absoluteFill';

/** 立绘淡出露出预览视频 */
const COVER_FADE_MS = 220;

type DefaultExploreRoleCardProps = {
  item: ExploreRoleItem;
  variant: 'grid' | 'list';
  onPress: (id: string) => void;
  onMatureLocked?: (id: string) => void;
  nameFallback: string;
  /** width/height for grid cover; defaults to 3/4 */
  coverAspectRatio?: number;
  /** Home R18 开关：开则播 mature 槽，关则播 r 槽 */
  maturePreview?: boolean;
};

function formatCount(n?: number): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

export function DefaultExploreRoleCard({
  item,
  variant,
  onPress,
  onMatureLocked,
  nameFallback,
  coverAspectRatio = 3 / 4,
  maturePreview = false,
}: DefaultExploreRoleCardProps) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const canSeeMature = canUserSeeMature(user);
  const revealKey = mediaRevealKey('role', item.id);
  const [rRevealed, setRRevealed] = useState(() => isSessionRevealed(revealKey));
  const [hovered, setHovered] = useState(false);
  /** 首次 hover 后保留挂载，离开 hover 只暂停不卸载 */
  const [videoKept, setVideoKept] = useState(false);
  const cardRef = useRef<View>(null);
  /** 仅用于辉光动画节流；封面始终立即解析，避免 iOS 网格列表空白 */
  const inView = useInViewport(cardRef);
  const ownsPlayback = usePreviewPlaybackOwner(item.id);
  // 立绘透明度：1 显示图，0 露出下层视频
  const coverOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setRRevealed(isSessionRevealed(revealKey));
  }, [revealKey]);

  const matureLocked = isAgentMatureLocked(item.content_rating, canSeeMature, item);
  const rBlurred = isAgentRBlurred(item.content_rating, item.id, rRevealed, canSeeMature);

  const name = item.name || nameFallback;
  const verified = isVerifiedRealPerson(item);
  const coverUrl = item.figure_url || item.avatar_url;
  const cover = coverUrl ? resolveStaticUrl(coverUrl) || null : null;
  // 按 R18 开关选槽；mature 槽为空时降级到 r 槽
  const previewVideoRaw = (
    maturePreview
      ? item.preview_video_url_mature?.trim() || item.preview_video_url_r?.trim()
      : item.preview_video_url_r?.trim()
  );
  const previewVideoUri =
    !matureLocked && !rBlurred && previewVideoRaw
      ? resolveStaticUrl(previewVideoRaw) || undefined
      : undefined;

  // URI 变化（如 R18 开关）时重新走「首次 hover 再挂载」
  useEffect(() => {
    setVideoKept(false);
  }, [previewVideoUri]);

  // Web：首次 hover 后保留挂载；播放仍受 hover + 播放权约束
  const mountPreviewVideo = Boolean(
    previewVideoUri && Platform.OS === 'web' && videoKept,
  );
  const playPreviewVideo = Boolean(mountPreviewVideo && hovered && ownsPlayback);

  useEffect(() => {
    if (!mountPreviewVideo) {
      coverOpacity.setValue(1);
      return;
    }
    Animated.timing(coverOpacity, {
      toValue: hovered ? 0 : 1,
      duration: COVER_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [hovered, mountPreviewVideo, coverOpacity]);

  const isList = variant === 'list';
  const tagLimit = isList ? 2 : 2;
  const categoryTags = item.categories?.slice(0, tagLimit) ?? [];
  const remainingTags = Math.max(0, (item.categories?.length ?? 0) - tagLimit);

  const coverNode = (
    <AgentRatingCover
      uri={cover}
      nameFallbackInitial={name.charAt(0).toUpperCase()}
      rBlurred={rBlurred}
      matureLocked={matureLocked}
      revealRLabel={t('agentMedia.revealR')}
      matureLockLabel={t('agentMedia.matureLocked')}
      imageTransitionMs={mountPreviewVideo ? COVER_FADE_MS : 0}
    />
  );

  const handlePress = () => {
    if (rBlurred) {
      markSessionRevealed(revealKey);
      setRRevealed(true);
      return;
    }
    if (matureLocked) {
      onMatureLocked?.(item.id);
      return;
    }
    onPress(item.id);
  };

  return (
    <View ref={cardRef} collapsable={false} style={!isList ? styles.cardGridHost : undefined}>
      <VerifiedRealPersonGlowFrame
        active={verified}
        pulse={isList || inView}
        radius={TOKENS.radius.cardLg}
        style={isList ? styles.glowList : undefined}
      >
      <Pressable
        onPress={handlePress}
        onHoverIn={() => {
          if (!previewVideoUri) return;
          setVideoKept(true);
          claimPreviewPlayback(item.id);
          setHovered(true);
        }}
        onHoverOut={() => {
          releasePreviewPlayback(item.id);
          setHovered(false);
        }}
        style={[
          styles.card,
          isList && styles.cardList,
          !isList && styles.cardGrid,
          verified && styles.cardInGlow,
        ]}
      >
        <View
          collapsable={false}
          style={[
            styles.coverWrap,
            !isList && { aspectRatio: coverAspectRatio },
            isList && styles.coverWrapList,
          ]}
        >
          {/* 底层：Web hover 预览视频；原生不走 Animated 包裹，避免 iOS 封面不渲染 */}
          <LazyVideo
            active={mountPreviewVideo}
            uri={previewVideoUri || ''}
            style={styles.previewVideo}
            contentFit="cover"
            contentPosition="top"
            muted
            loop
            autoPlay={playPreviewVideo}
            resetOnPause
            nativeControls={false}
            interactive={false}
            preload="metadata"
          />

          {mountPreviewVideo ? (
            <Animated.View
              style={[styles.coverLayer, { opacity: coverOpacity }]}
              pointerEvents="none"
            >
              {coverNode}
            </Animated.View>
          ) : (
            <View style={styles.coverLayer} pointerEvents="none">
              {coverNode}
            </View>
          )}

          <View style={[styles.statsRow, verified && styles.statsRowVerified]}>
            <View style={styles.statChip}>
              <Ionicons name="eye-outline" size={11} color="#fff" />
              <Text style={styles.statText}>{formatCount(item.view_count)}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="heart-outline" size={11} color="#fff" />
              <Text style={styles.statText}>{formatCount(item.like_count)}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="chatbubble-outline" size={11} color="#fff" />
              <Text style={styles.statText}>{formatCount(item.comment_count)}</Text>
            </View>
          </View>
          {verified ? (
            <VerifiedRealPersonBadge
              size={20}
              inset={8}
              label={t('agent.verifiedRealPersonLabel')}
              accessibilityLabel={t('agent.verifiedRealPersonLabel')}
            />
          ) : null}
        </View>

        <View style={[styles.body, isList && styles.bodyList, !isList && styles.bodyGrid]}>
          <Text style={styles.name} numberOfLines={isList ? 1 : 2}>
            {name}
          </Text>
          {item.introduction ? (
            <Text style={styles.intro} numberOfLines={isList ? 3 : 2}>
              {item.introduction}
            </Text>
          ) : null}
          {(categoryTags.length > 0 || remainingTags > 0 || item.has_chat_history) ? (
            <View style={[styles.tagRow, !isList && styles.tagRowGrid]}>
              {item.has_chat_history ? (
                <View style={[styles.tag, styles.tagHistory]}>
                  <Text style={[styles.tagText, styles.tagHistoryText]} numberOfLines={1}>
                    {t('explore.categoryHistory')}
                  </Text>
                </View>
              ) : null}
              {categoryTags.map((cat) => (
                <View key={cat.category_id} style={styles.tag}>
                  <Text style={styles.tagText} numberOfLines={1}>
                    {resolveRoleCategoryName(cat.category_id, cat.name, t)}
                  </Text>
                </View>
              ))}
              {remainingTags > 0 ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>+{remainingTags}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
      </VerifiedRealPersonGlowFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  cardGridHost: {
    width: '100%',
    minWidth: 0,
    overflow: 'visible',
  },
  glowList: {
    marginBottom: 12,
  },
  card: {
    width: '100%',
    minWidth: 0,
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.cardSolid,
    overflow: 'hidden',
  },
  cardInGlow: {
    borderWidth: 0,
    borderRadius: TOKENS.radius.cardLg - 2,
  },
  cardGrid: {
    flexDirection: 'column',
  },
  cardList: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 148,
  },
  coverWrap: {
    width: '100%',
    backgroundColor: TOKENS.colors.bgElevated,
    overflow: 'hidden',
    position: 'relative',
  },
  coverWrapList: {
    width: '38%',
    aspectRatio: undefined,
    minHeight: 148,
    flexShrink: 0,
  },
  previewVideo: {
    ...ABSOLUTE_FILL,
    zIndex: 0,
  },
  coverLayer: {
    ...ABSOLUTE_FILL,
    zIndex: 1,
    minHeight: 1,
  },
  statsRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    zIndex: 2,
  },
  statsRowVerified: {
    right: 8,
    maxWidth: '52%',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  statText: Typo(
    {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    'sans',
  ),
  body: {
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 10,
    gap: 4,
  },
  bodyGrid: {
    flex: 1,
  },
  bodyList: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      lineHeight: 18,
    },
    'serif',
  ),
  intro: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    'sans',
  ),
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tagRowGrid: {
    marginTop: 'auto',
  },
  tag: {
    maxWidth: '100%',
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tagHistory: {
    borderColor: 'rgba(186, 60, 71, 0.35)',
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  tagText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  tagHistoryText: {
    color: TOKENS.colors.accent,
  },
});
