import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LazyImage } from '../../../components/media/LazyImage';
import { Ionicons } from '@expo/vector-icons';
import { resolveStaticUrl } from '../../../constants/config';
import {
  isMatureRated,
  isPostImageHardLocked,
  isPostImageSoftBlurred,
  MATURE_LOCKED_REASON,
  needsMaturePostImageRefresh,
  PAID_LOCKED_REASON,
  resolvePostImageDisplayUrl,
  softBlurRadius,
} from '../../../utils/mediaDisplay';
import {
  isSessionRevealed,
  markSessionRevealed,
  mediaRevealKey,
} from '../../../utils/mediaRevealSession';
import { Typo } from '../../../theme/typography';
import type { PostImageView, PostItem } from '../../../types/api';
import { SOCIAL_IMAGES } from '../theme/images';
import { SOCIAL } from './socialTokens';
import { VerifiedRealPersonBadge } from '../../../components/agent/VerifiedRealPersonBadge';
import { PostCommentsSheet } from './PostCommentsSheet';

function formatCount(n?: number): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function handleFromName(name?: string): string {
  const raw = (name || 'agent').replace(/\s+/g, '');
  return `@${raw}`;
}

/** Fit image to card width while preserving aspect ratio; cap height so feed cards stay compact. */
function computeMediaFrame(
  imgW: number | undefined,
  imgH: number | undefined,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio =
    imgW && imgH && imgW > 0 && imgH > 0
      ? imgW / imgH
      : 4 / 3;
  let width = Math.max(1, maxWidth);
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

type SocialPostCardProps = {
  item: PostItem;
  showDivider?: boolean;
  followedByMe?: boolean;
  followBusy?: boolean;
  onPressAuthor: (roleId: string) => void;
  onToggleLike: (item: PostItem) => void;
  onToggleFollow: (item: PostItem) => void;
  onSharePost: (item: PostItem) => void;
  onReportPost?: (item: PostItem) => void;
  onBlockAuthor?: (item: PostItem) => void;
  /** Unlock paid media / enable mature for locked post images. */
  onUnlockMedia?: (item: PostItem, image: PostImageView) => void;
  /** Viewer has Content Tier mature + VIP mature_mode. */
  canSeeMature?: boolean;
  unlockBusy?: boolean;
  unlockLabel?: string;
  unlockMatureLabel?: string;
  revealRLabel?: string;
  likeBusy?: boolean;
  followLabel: string;
  followingLabel: string;
  shareLabel: string;
  reportLabel?: string;
  blockLabel?: string;
  requireLogin?: () => boolean;
  currentUserId?: string;
  commentsTitle?: string;
  commentPlaceholder?: string;
  commentSendLabel?: string;
  commentsEmptyLabel?: string;
  enableCommentLikes?: boolean;
};

export function SocialPostCard({
  item,
  showDivider = true,
  followedByMe = false,
  followBusy,
  onPressAuthor,
  onToggleLike,
  onToggleFollow,
  onSharePost,
  onReportPost,
  onBlockAuthor,
  onUnlockMedia,
  canSeeMature = false,
  unlockBusy,
  unlockLabel = 'Unlock',
  unlockMatureLabel = 'Enable Mature',
  revealRLabel = 'Tap to view',
  likeBusy,
  followLabel,
  followingLabel,
  shareLabel,
  reportLabel = 'Report',
  blockLabel = 'Block user',
  requireLogin,
  currentUserId,
  commentsTitle,
  commentPlaceholder,
  commentSendLabel,
  commentsEmptyLabel,
  enableCommentLikes = false,
}: SocialPostCardProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const moreRef = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 12 });
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(item.comment_count ?? 0);
  const [contentWidth, setContentWidth] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const media = item.images?.[0];
  const mediaRevealId = media?.media_id || `${item.post_id}:0`;
  const mediaRevealSessionKey = mediaRevealKey('post', mediaRevealId);
  const [rRevealed, setRRevealed] = useState(() => isSessionRevealed(mediaRevealSessionKey));

  useEffect(() => {
    setCommentCount(item.comment_count ?? 0);
  }, [item.comment_count, item.post_id]);

  useEffect(() => {
    setRRevealed(isSessionRevealed(mediaRevealSessionKey));
  }, [mediaRevealSessionKey]);

  useEffect(() => {
    if (media?.width && media?.height && media.width > 0 && media.height > 0) {
      setNaturalSize({ w: media.width, h: media.height });
      return;
    }
    setNaturalSize(null);
  }, [media?.width, media?.height, media?.media_id, media?.image_url, item.post_id]);

  const isPersonal = item.author_kind === 'user' || !item.role_id;
  const avatarUri = item.role_avatar ? resolveStaticUrl(item.role_avatar) : undefined;
  const mediaSoftBlurred = Boolean(
    media &&
      isPostImageSoftBlurred(media, item.post_id, {
        canSeeMature,
        revealed: rRevealed,
      }),
  );
  const mediaUri = media
    ? resolvePostImageDisplayUrl(media, {
        postId: item.post_id,
        revealed: rRevealed,
        canSeeMature,
      })
    : undefined;
  const displayName = item.role_name?.trim() || (isPersonal ? 'User' : 'Agent');
  const mediaLocked = Boolean(media && isPostImageHardLocked(media, canSeeMature));
  const mediaMatureLocked = Boolean(
    media && media.locked_reason === MATURE_LOCKED_REASON && !canSeeMature,
  );
  const mediaPaidLocked = Boolean(
    media && (media.locked_reason === PAID_LOCKED_REASON || (media.locked && !mediaMatureLocked)),
  );
  const lockPrice =
    mediaPaidLocked && media
      ? media.bundle_price_points || media.price_points || 0
      : 0;
  const matureNeedsRefresh = Boolean(
    media && needsMaturePostImageRefresh(media, canSeeMature),
  );

  const revealRMedia = useCallback(() => {
    markSessionRevealed(mediaRevealSessionKey);
    setRRevealed(true);
  }, [mediaRevealSessionKey]);

  const mediaMaxWidth = contentWidth > 0 ? contentWidth : Math.max(1, windowWidth - 56);
  const mediaMaxHeight = Math.min(300, Math.round(windowHeight * 0.4));
  const mediaFrame = computeMediaFrame(
    naturalSize?.w ?? media?.width,
    naturalSize?.h ?? media?.height,
    mediaMaxWidth,
    mediaMaxHeight,
  );

  const openMenu = useCallback(() => {
    const node = moreRef.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      setMenuPos({ top: 72, right: 24 });
      setMenuOpen(true);
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      const menuWidth = 168;
      const right = Math.max(12, windowWidth - (x + w));
      const top = Math.min(windowHeight - 120, y + h + 6);
      setMenuPos({
        top,
        right: Math.min(right, windowWidth - menuWidth - 12),
      });
      setMenuOpen(true);
    });
  }, [windowHeight, windowWidth]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <View style={styles.wrap}>
      <View
        style={styles.cell}
        onLayout={(e) => {
          // cell onLayout includes padding; media sits in the content box.
          const w = Math.round(e.nativeEvent.layout.width) - 44;
          if (w > 0 && w !== contentWidth) setContentWidth(w);
        }}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.authorRow}
            disabled={isPersonal}
            onPress={() => {
              if (!isPersonal && item.role_id) onPressAuthor(item.role_id);
            }}
          >
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={item.role_id ? `post-avatar-${item.role_id}` : undefined}
                />
              ) : (
                <Image
                  source={SOCIAL_IMAGES.avatarFallback}
                  style={styles.avatar}
                  contentFit="cover"
                />
              )}
              {!isPersonal && item.verified_real_person ? (
                <VerifiedRealPersonBadge size={14} />
              ) : null}
            </View>
            <View style={styles.authorText}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.handle} numberOfLines={1}>
                  {handleFromName(displayName)}
                </Text>
              </View>
            </View>
          </Pressable>
          <View ref={moreRef} collapsable={false}>
            <Pressable
              onPress={openMenu}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="More"
              style={styles.moreBtn}
            >
              {/* Ionicons: Figma more.svg used CSS vars that native SVG fills drop on iOS. */}
              <Ionicons name="ellipsis-horizontal" size={20} color={SOCIAL.action} />
            </Pressable>
          </View>
        </View>

        {item.content?.trim() ? <Text style={styles.body}>{item.content.trim()}</Text> : null}

        {mediaUri || mediaLocked || mediaSoftBlurred ? (
          <Pressable
            style={[
              styles.mediaWrap,
              {
                width: mediaFrame.width,
                height: mediaFrame.height,
                alignSelf: 'flex-start',
              },
            ]}
            disabled={
              !(
                (mediaLocked && onUnlockMedia && media) ||
                mediaSoftBlurred
              )
            }
            onPress={() => {
              if (mediaSoftBlurred) {
                revealRMedia();
                if (matureNeedsRefresh && media && onUnlockMedia) {
                  onUnlockMedia(item, media);
                }
                return;
              }
              if (mediaLocked && media && onUnlockMedia) onUnlockMedia(item, media);
            }}
          >
            {mediaUri ? (
              <LazyImage
                uri={mediaUri}
                style={styles.media}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={media?.image_url || mediaUri}
                onLoad={(ev) => {
                  if (media?.width && media?.height) return;
                  const w = ev.source?.width;
                  const h = ev.source?.height;
                  if (w && h && w > 0 && h > 0) {
                    setNaturalSize({ w, h });
                  }
                }}
                blurRadius={
                  softBlurRadius(Boolean(media?.blur_url), mediaSoftBlurred) ||
                  (mediaLocked && !media?.blur_url ? 28 : 0)
                }
                transition={320}
              />
            ) : (
              <View style={[styles.media, styles.mediaMatureFallback]} />
            )}
            {mediaSoftBlurred ? (
              <View style={styles.mediaLockOverlay}>
                <View style={styles.rBadge}>
                  <Text style={styles.rBadgeText}>
                    {media &&
                    (isMatureRated(media) || media.locked_reason === MATURE_LOCKED_REASON)
                      ? 'M'
                      : 'R'}
                  </Text>
                </View>
                <View style={styles.unlockChip}>
                  <Text style={styles.unlockChipText}>{revealRLabel}</Text>
                </View>
              </View>
            ) : mediaLocked ? (
              <View style={styles.mediaLockOverlay}>
                {unlockBusy ? (
                  <Text style={styles.lockPriceText}>…</Text>
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={20} color="#fff" />
                    {mediaPaidLocked && lockPrice > 0 ? (
                      <Text style={styles.lockPriceText}>{lockPrice} soul</Text>
                    ) : null}
                    <View style={styles.unlockChip}>
                      <Text style={styles.unlockChipText}>
                        {mediaMatureLocked ? unlockMatureLabel : unlockLabel}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => setCommentsOpen(true)} hitSlop={6}>
            <Image source={SOCIAL_IMAGES.comment} style={styles.actionIcon} contentFit="contain" />
            <Text style={styles.actionCount}>{formatCount(commentCount)}</Text>
          </Pressable>
          <View style={styles.action}>
            <Text style={styles.repostGlyph}>↻</Text>
            <Text style={styles.actionCount}>0</Text>
          </View>
          <Pressable
            style={styles.action}
            disabled={likeBusy}
            onPress={() => onToggleLike(item)}
            hitSlop={6}
          >
            <Text style={[styles.likeGlyph, item.liked_by_me && styles.likeGlyphActive]}>
              {item.liked_by_me ? '♥' : '♡'}
            </Text>
            <Text style={[styles.actionCount, item.liked_by_me && styles.actionCountLiked]}>
              {formatCount(item.like_count)}
            </Text>
          </Pressable>
          <Pressable
            style={styles.action}
            onPress={() => onSharePost(item)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={shareLabel}
          >
            {Platform.OS === 'web' ? (
              <Image
                source={SOCIAL_IMAGES.share}
                style={styles.actionIconShare}
                contentFit="contain"
                pointerEvents="none"
              />
            ) : (
              <View pointerEvents="none">
                <Ionicons name="share-outline" size={22} color={SOCIAL.action} />
              </View>
            )}
          </Pressable>
        </View>
      </View>
      {showDivider ? <View style={styles.divider} /> : null}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.menuRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          <View style={[styles.menuCard, { top: menuPos.top, right: menuPos.right }]}>
            {!isPersonal ? (
              <>
                <Pressable
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  disabled={followBusy}
                  onPress={() => {
                    closeMenu();
                    onToggleFollow(item);
                  }}
                >
                  <Ionicons
                    name={followedByMe ? 'person' : 'person-add-outline'}
                    size={16}
                    color={SOCIAL.name}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuItemText}>
                    {followedByMe ? followingLabel : followLabel}
                  </Text>
                </Pressable>
                <View style={styles.menuDivider} />
              </>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => {
                closeMenu();
                // iOS：等菜单 Modal 卸掉再调起系统分享，否则 Share 面板会被挡住/无响应
                setTimeout(() => onSharePost(item), Platform.OS === 'ios' ? 320 : 0);
              }}
            >
              <Ionicons
                name="share-outline"
                size={16}
                color={SOCIAL.name}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemText}>{shareLabel}</Text>
            </Pressable>
            {onReportPost ? (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  onPress={() => {
                    closeMenu();
                    if (requireLogin && !requireLogin()) return;
                    onReportPost(item);
                  }}
                >
                  <Ionicons
                    name="flag-outline"
                    size={16}
                    color={SOCIAL.name}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuItemText}>{reportLabel}</Text>
                </Pressable>
              </>
            ) : null}
            {onBlockAuthor && (item.author_user_id || (item.role_id && item.author_kind !== 'user')) ? (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  onPress={() => {
                    closeMenu();
                    if (requireLogin && !requireLogin()) return;
                    onBlockAuthor(item);
                  }}
                >
                  <Ionicons
                    name="hand-left-outline"
                    size={16}
                    color="#c45c5c"
                    style={styles.menuIcon}
                  />
                  <Text style={[styles.menuItemText, { color: '#c45c5c' }]}>{blockLabel}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <PostCommentsSheet
        visible={commentsOpen}
        postId={item.post_id}
        currentUserId={currentUserId}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
        requireLogin={requireLogin}
        title={commentsTitle}
        placeholder={commentPlaceholder}
        sendLabel={commentSendLabel}
        emptyLabel={commentsEmptyLabel}
        enableCommentLikes={enableCommentLikes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginHorizontal: 4,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
        } as object)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }),
  },
  cell: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 14,
    borderRadius: 12,
    backgroundColor: SOCIAL.postCellBg,
    gap: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
    marginTop: 8,
    backgroundColor: SOCIAL.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 2,
  },
  authorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'visible',
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  authorText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 10,
  },
  name: Typo(
    {
      color: SOCIAL.name,
      fontSize: 16,
      fontWeight: '700',
    },
    'sans',
  ),
  handle: Typo(
    {
      color: SOCIAL.handle,
      fontSize: 14,
      fontWeight: '400',
    },
    'sans',
  ),
  moreBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: Typo(
    {
      color: SOCIAL.body,
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 22,
    },
    'sans',
  ),
  mediaWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F1A39',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaMatureFallback: {
    backgroundColor: '#121722',
  },
  mediaLockOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 10, 16, 0.42)',
    gap: 6,
  },
  rBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(180, 60, 60, 0.9)',
    paddingHorizontal: 8,
  },
  rBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  lockPriceText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  unlockChip: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  unlockChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingHorizontal: 4,
    maxWidth: 420,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 56,
  },
  actionIcon: {
    width: 20,
    height: 20,
  },
  actionIconShare: {
    width: 22,
    height: 22,
  },
  repostGlyph: Typo(
    {
      color: SOCIAL.action,
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 20,
    },
    'sans',
  ),
  likeGlyph: Typo(
    {
      color: SOCIAL.action,
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 20,
    },
    'sans',
  ),
  likeGlyphActive: {
    color: SOCIAL.postBtn,
  },
  actionCount: Typo(
    {
      color: SOCIAL.action,
      fontSize: 14,
      fontWeight: '400',
    },
    'sans',
  ),
  actionCountLiked: {
    color: SOCIAL.postBtn,
  },
  menuRoot: {
    flex: 1,
  },
  menuCard: {
    position: 'absolute',
    minWidth: 168,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#151922',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.45)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  menuIcon: {
    width: 18,
  },
  menuItemText: Typo(
    {
      color: SOCIAL.name,
      fontSize: 14,
      fontWeight: '500',
    },
    'sans',
  ),
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 42,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
