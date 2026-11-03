import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { resolveStaticUrl } from '../../constants/config';
import { TOKENS } from '../../pages/default/theme/tokens';
import {
  followExploreRole,
  getExploreRoleDetail,
  likeExploreRole,
  listExploreRoleMedia,
  unfollowExploreRole,
  unlikeExploreRole,
} from '../../api/roles';
import { useAuthStore } from '../../stores/authStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { notifyError } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';
import { canUserSeeMature } from '../../utils/agentRatingDisplay';
import { resolveRoleMediaThumbUrl } from '../../utils/mediaDisplay';
import { MessageHost } from '../ui/Message';
import { DominanceSlider } from '../ui/DominanceSlider';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { type FreeChatUiVariant } from './freeChatUi';
import { BondProgressBar } from './BondProgressBar';
import { getChatAffection } from '../../api/chat';
import type { BondInfo, RoleCommunityStats, RoleDetailResp, RoleMediaItem } from '../../types/api';
import { useRouter } from 'expo-router';
import { AgentGiftButton } from '../../pages/default/agent-media/AgentGiftButton';
import { AgentGiftSheet } from '../../pages/default/agent-media/AgentGiftSheet';
import { RoleSafetyActionLinks } from '../agent/RoleSafetyActionLinks';
import { isVerifiedRealPerson } from '../../utils/verifiedRealPerson';
import { EroticKinksModal } from './EroticKinksModal';

interface CharacterInfoPanelProps {
  visible: boolean;
  role: RoleDetailResp | null;
  onClose: () => void;
  onNewChat?: () => void | Promise<void>;
  /** Dev-only entry for digital-human / video call. */
  onVideoCall?: () => void;
  videoCallDisabled?: boolean;
  variant?: FreeChatUiVariant;
  /** Seed from chat/state; panel refreshes via GET /chat/affection when opened. */
  bond?: BondInfo | null;
  dominance?: number;
  onDominanceChange?: (value: number) => void | Promise<void>;
  dominanceDisabled?: boolean;
  /**
   * modal：遮罩抽屉（移动端 / 手动打开）
   * docked：桌面右侧常驻栏（聊天列表收起时）
   */
  mode?: 'modal' | 'docked';
}

const PANEL = {
  bg: '#0B0D18',
  join: '#E84B6A',
  joinPressed: '#C93D58',
  link: '#4C7DFF',
  text: '#F7F8FC',
  textSecondary: '#AAB1C3',
  textMuted: '#7E879E',
  chatBorder: '#6B7CFF',
  line: 'rgba(255, 255, 255, 0.08)',
  likeActive: '#E84B6A',
} as const;

const MAX_MEDIA = 6;
/** Approximate chrome below/above hero (desktop dock). */
const PANEL_CHROME = 480;
/** Mobile: shorter hero budget so Bond / Interaction peek above the fold. */
const PANEL_CHROME_MOBILE = 420;
/** Portrait aspect: width / height */
const HERO_ASPECT = 9 / 16;

/** Fallback fill when API has no bond_progress yet (older session seed). */
function bondProgressFallback(state?: string): number {
  switch (state) {
    case 'bonded':
      return 0.9;
    case 'close':
      return 0.65;
    case 'warming':
      return 0.4;
    case 'distant':
    default:
      return 0.12;
  }
}

function parseAttributes(attrJson?: string): Record<string, unknown> | null {
  if (!attrJson) return null;
  try {
    return JSON.parse(attrJson);
  } catch {
    return null;
  }
}

function formatScalar(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function formatCount(n?: number): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

type MediaSlot = { id: string; uri: string };

export function CharacterInfoPanel({
  visible,
  role,
  onClose,
  onNewChat,
  onVideoCall,
  videoCallDisabled = false,
  variant = 'soviet',
  bond: bondProp,
  dominance = 50,
  onDominanceChange,
  dominanceDisabled = false,
  mode = 'modal',
}: CharacterInfoPanelProps) {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDefault = variant === 'default';
  const isDocked = mode === 'docked';
  const scrollWebProps = useMemo(
    () => themedScrollViewProps(isDefault ? 'default' : 'soviet'),
    [isDefault],
  );
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const authUser = useAuthStore((s) => s.user);
  const showVideoCall = authUser?.is_dev === true && typeof onVideoCall === 'function';
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Mobile: near full width. Desktop: right-docked — narrower so the left edge contracts.
  const panelWidth =
    screenWidth < 720
      ? Math.min(screenWidth, Math.max(320, Math.round(screenWidth * 0.94)))
      : Math.min(400, Math.max(340, Math.round(screenWidth * 0.3)));
  const contentWidth = panelWidth - 36;
  const isMobilePanel = screenWidth < 720;
  // Leave room for bond / interaction on first screen; rest scrolls.
  const maxHeroH = Math.max(
    180,
    Math.round(screenHeight - (isMobilePanel ? PANEL_CHROME_MOBILE : PANEL_CHROME)),
  );
  const idealHeight = Math.round(contentWidth / HERO_ASPECT);
  const heroHeight = Math.min(idealHeight, maxHeroH);
  const heroWidth = Math.min(contentWidth, Math.round(heroHeight * HERO_ASPECT));
  const scrollBottomPad = Math.max(20, insets.bottom + 12);

  const slideAnim = useRef(new Animated.Value(panelWidth)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const dockWidthAnim = useRef(new Animated.Value(visible && mode === 'docked' ? 1 : 0)).current;
  const carouselRef = useRef<FlatList<MediaSlot>>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stats, setStats] = useState<RoleCommunityStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [bond, setBond] = useState<BondInfo | null>(bondProp ?? null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [kinksOpen, setKinksOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<RoleMediaItem[]>([]);
  const [creatorUserId, setCreatorUserId] = useState<string | undefined>();
  /** docked 收起动画结束后再卸载 */
  const [dockMounted, setDockMounted] = useState(visible && mode === 'docked');
  const showKinks = isVerifiedRealPerson(role);

  useEffect(() => {
    if (isDocked) return;
    slideAnim.setValue(panelWidth);
  }, [panelWidth, slideAnim, isDocked]);

  useEffect(() => {
    // 侧栏模式：宽度 0↔panelWidth
    if (isDocked) {
      if (visible) {
        setDockMounted(true);
        Animated.timing(dockWidthAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: false,
        }).start();
      } else {
        Animated.timing(dockWidthAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) setDockMounted(false);
        });
      }
      return;
    }
    if (visible) {
      setActiveIndex(0);
      carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: panelWidth, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, panelWidth, slideAnim, backdropAnim, isDocked, dockWidthAnim]);

  useEffect(() => {
    if (bondProp) setBond(bondProp);
  }, [bondProp]);

  useEffect(() => {
    if (!visible || !role?.id) {
      setStats(null);
      setCreatorUserId(undefined);
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    void getExploreRoleDetail(role.id)
      .then((detail) => {
        if (!cancelled) {
          setStats(detail.stats);
          setCreatorUserId(detail.creator_user_id);
        }
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, role?.id]);

  useEffect(() => {
    if (!visible || !role?.id) {
      setGalleryItems([]);
      return;
    }
    let cancelled = false;
    void listExploreRoleMedia(role.id, 1, 12)
      .then((resp) => {
        if (!cancelled) setGalleryItems(resp.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setGalleryItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, role?.id]);

  useEffect(() => {
    if (!visible || !role?.id || !isLoggedIn) return;
    let cancelled = false;
    void getChatAffection({ roleId: role.id })
      .then((resp) => {
        if (!cancelled) setBond(resp.bond);
      })
      .catch(() => {
        /* keep seed / previous */
      });
    return () => {
      cancelled = true;
    };
  }, [visible, role?.id, isLoggedIn]);

  const attributes = useMemo(() => parseAttributes(role?.attributes), [role?.attributes]);
  const canSeeMature = canUserSeeMature(authUser);

  /**
   * Detail carousel: character art (立绘) + published media.
   * Never include chat background_url — that is only for the chat scene.
   */
  const media = useMemo<MediaSlot[]>(() => {
    const slots: MediaSlot[] = [];
    const seen = new Set<string>();
    const push = (id: string, url?: string | null) => {
      const uri = resolveStaticUrl(url || undefined);
      if (!uri || seen.has(uri)) return;
      seen.add(uri);
      slots.push({ id, uri });
    };

    push('figure', role?.figure_url);

    for (const item of galleryItems) {
      if (slots.length >= MAX_MEDIA) break;
      const uri = resolveRoleMediaThumbUrl(item, { canSeeMature });
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      slots.push({ id: `media-${item.media_id}`, uri });
    }

    // Last resort when there is no figure and no gallery yet.
    if (slots.length === 0) {
      push('avatar', role?.avatar_url);
    }
    return slots;
  }, [canSeeMature, galleryItems, role?.avatar_url, role?.figure_url]);

  useEffect(() => {
    setActiveIndex(0);
    carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [role?.id, media.length]);

  const title = role?.name?.trim() || t('chat.info');
  const authorHandle = useMemo(() => {
    if (!role?.is_owner) return null;
    const name = authUser?.nickname?.trim() || authUser?.email?.trim();
    if (!name) return null;
    return name.startsWith('@') ? name : `@${name}`;
  }, [authUser?.email, authUser?.nickname, role?.is_owner]);

  const likedByMe = Boolean(stats?.liked_by_me);
  const likeCount = stats?.like_count ?? 0;
  const followedByMe = Boolean(stats?.followed_by_me);

  const description =
    formatScalar(attributes?.background)
    || role?.scene_desc?.trim()
    || role?.scene_name?.trim()
    || t('chat.identityIntro');

  const canSwipe = media.length > 1;
  const pageLabel = `${activeIndex + 1} / ${media.length}`;

  const requireLogin = useCallback(
    () => requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing')),
    [isLoggedIn, router, t],
  );

  const handleNewChat = async () => {
    if (!onNewChat || actionLoading) return;
    setActionLoading(true);
    try {
      await onNewChat();
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!role?.id || likeBusy) return;
    if (!requireLogin()) return;
    setLikeBusy(true);
    try {
      const resp = likedByMe ? await unlikeExploreRole(role.id) : await likeExploreRole(role.id);
      setStats((prev) => ({
        view_detail_count: prev?.view_detail_count ?? 0,
        view_chat_count: prev?.view_chat_count ?? 0,
        view_count: prev?.view_count ?? 0,
        comment_count: prev?.comment_count ?? 0,
        ...prev,
        liked_by_me: resp.liked,
        like_count: resp.like_count,
      }));
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
    } finally {
      setLikeBusy(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!role?.id || followBusy) return;
    if (!requireLogin()) return;
    setFollowBusy(true);
    try {
      const resp = followedByMe
        ? await unfollowExploreRole(role.id)
        : await followExploreRole(role.id);
      setStats((prev) => ({
        view_detail_count: prev?.view_detail_count ?? 0,
        view_chat_count: prev?.view_chat_count ?? 0,
        view_count: prev?.view_count ?? 0,
        like_count: prev?.like_count ?? 0,
        comment_count: prev?.comment_count ?? 0,
        ...prev,
        followed_by_me: resp.followed,
        follower_count: resp.follower_count,
      }));
    } catch (err) {
      notifyError(t('system.error'), formatApiError(t, err));
    } finally {
      setFollowBusy(false);
    }
  };

  const onCarouselScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / Math.max(heroWidth, 1));
    setActiveIndex(Math.max(0, Math.min(media.length - 1, next)));
  };

  const onCarouselScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / Math.max(heroWidth, 1));
      const clamped = Math.max(0, Math.min(media.length - 1, next));
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));
    },
    [heroWidth, media.length],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (typeof idx === 'number' && idx >= 0) {
        setActiveIndex(idx);
      }
    },
  ).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
    minimumViewTime: 16,
  }).current;

  const joinColor = isDefault ? PANEL.join : COLORS.accent.red;
  const joinPressed = isDefault ? PANEL.joinPressed : COLORS.accent.redDark;
  const chatBorder = isDefault ? PANEL.chatBorder : 'rgba(232, 213, 181, 0.45)';
  const followLabel = followedByMe ? t('chat.following') : t('chat.follow');
  const bondProgress =
    typeof bond?.bond_progress === 'number'
      ? bond.bond_progress
      : bondProgressFallback(bond?.bond_state);

  const panelInner = (
    <View style={[styles.body, isDocked && styles.bodyDocked]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={PANEL.text} />
        </Pressable>
      </View>

      <ScrollView
        {...scrollWebProps}
        style={[styles.scroll, scrollWebProps.style]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        bounces
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.heroWrap, { width: heroWidth, height: heroHeight }]}>
          {media.length > 0 ? (
            <FlatList
              ref={carouselRef}
              data={media}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              scrollEnabled={canSwipe}
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              bounces={canSwipe}
              style={{ width: heroWidth, height: heroHeight }}
              snapToInterval={heroWidth}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              onScroll={onCarouselScroll}
              scrollEventThrottle={16}
              onMomentumScrollEnd={onCarouselScrollEnd}
              onScrollEndDrag={onCarouselScrollEnd}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({
                length: heroWidth,
                offset: heroWidth * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={{ width: heroWidth, height: heroHeight }}>
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.hero}
                    contentFit="cover"
                    contentPosition="top"
                  />
                </View>
              )}
            />
          ) : (
            <View style={[styles.hero, styles.heroEmpty]}>
              <Text style={styles.heroEmptyText}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {canSwipe ? (
            <View style={styles.pagePillWrap} pointerEvents="none">
              <View style={styles.pagePill}>
                <Text style={styles.pagePillText}>{pageLabel}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {role?.id && !role.is_owner ? (
              <RoleSafetyActionLinks
                roleId={role.id}
                creatorUserId={creatorUserId}
                onBlocked={onClose}
                variant="panel"
              />
            ) : null}
            <Pressable
              onPress={() => void handleToggleFollow()}
              disabled={followBusy || statsLoading}
              style={({ pressed }) => [
                styles.followBtn,
                followedByMe ? styles.followBtnOutline : null,
                {
                  backgroundColor: followedByMe
                    ? 'rgba(255, 255, 255, 0.08)'
                    : pressed
                      ? joinPressed
                      : joinColor,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={followLabel}
            >
              {followBusy ? (
                <ActivityIndicator size="small" color={PANEL.text} />
              ) : (
                <Text style={styles.followBtnText}>{followLabel}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            {authorHandle ? <Text style={styles.author}>by {authorHandle}</Text> : null}
            <Pressable
              onPress={() => void handleToggleLike()}
              disabled={likeBusy || statsLoading}
              style={({ pressed }) => [styles.likeBtn, pressed && styles.pressed]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Like"
            >
              {likeBusy ? (
                <ActivityIndicator size="small" color={PANEL.likeActive} />
              ) : (
                <Ionicons
                  name={likedByMe ? 'heart' : 'heart-outline'}
                  size={14}
                  color={likedByMe ? PANEL.likeActive : PANEL.textMuted}
                />
              )}
              <Text style={[styles.likes, likedByMe && styles.likesActive]}>
                {formatCount(likeCount)}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.desc} numberOfLines={3}>
            {description}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => void handleNewChat()}
              disabled={!onNewChat || actionLoading}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.chatBtn,
                { borderColor: chatBorder },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={PANEL.text} />
              ) : (
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={PANEL.text} />
              )}
              <Text style={styles.actionBtnText}>{t('chat.newConversation')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!role?.id) return;
                onClose();
                router.push(`/agent/${role.id}/media` as never);
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: pressed ? joinPressed : joinColor },
              ]}
              accessibilityRole="button"
            >
              <Ionicons name="images-outline" size={18} color={PANEL.text} />
              <Text style={styles.actionBtnText}>{t('agentMedia.viewMedia')}</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
              onClose();
              const referenceUrl = resolveStaticUrl(role?.figure_url || role?.avatar_url);
              router.push({
                pathname: '/creation-center/image',
                params: {
                  ...(referenceUrl ? { referenceUrl } : {}),
                  ...(role?.name?.trim() ? { roleName: role.name.trim() } : {}),
                },
              } as never);
            }}
            style={({ pressed }) => [
              styles.createImageBtn,
              { borderColor: chatBorder },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('agent.createImageForHer')}
          >
            <Ionicons name="color-wand-outline" size={18} color={PANEL.text} />
            <Text style={styles.actionBtnText}>{t('agent.createImageForHer')}</Text>
          </Pressable>

          {showVideoCall ? (
            <Pressable
              onPress={() => {
                if (videoCallDisabled) return;
                if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
                onVideoCall?.();
              }}
              disabled={videoCallDisabled}
              style={({ pressed }) => [
                styles.videoCallBtn,
                { borderColor: chatBorder },
                pressed && !videoCallDisabled && styles.pressed,
                videoCallDisabled && styles.videoCallBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('voiceCall.videoCall')}
            >
              <Ionicons
                name="videocam"
                size={20}
                color={videoCallDisabled ? PANEL.textMuted : PANEL.text}
              />
              <View style={styles.videoCallLabelCol}>
                <Text
                  style={[
                    styles.actionBtnText,
                    videoCallDisabled && styles.videoCallTextDisabled,
                  ]}
                >
                  {t('voiceCall.videoCall')}
                </Text>
                <Text style={styles.videoCallHint}>{t('voiceCall.videoCallHint')}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={videoCallDisabled ? PANEL.textMuted : PANEL.textSecondary}
              />
            </Pressable>
          ) : null}

          <AgentGiftButton
            compact
            onPress={() => {
              if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
              setGiftOpen(true);
            }}
          />

          <View style={styles.relationBlock}>
            <View style={styles.relationSection}>
              <Text style={styles.relationLabel}>{t('freeChat.affectionTitle')}</Text>
              <BondProgressBar progress={bondProgress} />
            </View>

            {showKinks && role?.id ? (
              <Pressable
                style={({ pressed }) => [styles.kinkRow, pressed && styles.pressed]}
                onPress={() => {
                  if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
                  setKinksOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('freeChat.kinkTitle')}
              >
                <Text style={styles.relationLabel}>{t('freeChat.kinkTitle')}</Text>
                <Ionicons name="chevron-forward" size={18} color={PANEL.textSecondary} />
              </Pressable>
            ) : null}

            {onDominanceChange ? (
              <View style={styles.relationSection}>
                <Text style={styles.relationLabel}>{t('freeChat.dominanceTitle')}</Text>
                <DominanceSlider
                  value={dominance}
                  onChange={(v) => void onDominanceChange(v)}
                  disabled={dominanceDisabled}
                  variant="default"
                  colorScheme={variant === 'default' ? 'default' : 'soviet'}
                />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const dockedWidthStyle = {
    width: dockWidthAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, panelWidth],
    }),
  };

  return (
    <>
      {isDocked ? (
        dockMounted ? (
          <Animated.View style={[styles.panelDocked, dockedWidthStyle]}>
            <View style={{ width: panelWidth, flex: 1 }}>{panelInner}</View>
          </Animated.View>
        ) : null
      ) : (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
              <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
            </Pressable>

            <Animated.View
              style={[
                styles.panel,
                { width: panelWidth, transform: [{ translateX: slideAnim }] },
              ]}
            >
              {panelInner}
            </Animated.View>
          </View>
        </Modal>
      )}
      {visible ? <MessageHost /> : null}
      {role?.id ? (
        <AgentGiftSheet
          visible={giftOpen}
          roleId={role.id}
          agentName={role.name?.trim()}
          onClose={() => setGiftOpen(false)}
          onSent={(pointsSpent) => {
            setStats((prev) =>
              prev
                ? {
                    ...prev,
                    gift_points_total: (prev.gift_points_total ?? 0) + pointsSpent,
                  }
                : prev,
            );
          }}
        />
      ) : null}
      {showKinks && role?.id ? (
        <EroticKinksModal
          visible={kinksOpen}
          roleId={role.id}
          onClose={() => setKinksOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PANEL.bg,
    borderLeftWidth: 1,
    borderLeftColor: PANEL.line,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 16,
  },
  /** 桌面右侧常驻：参与 flex 布局，宽度动画展开/收起 */
  panelDocked: {
    flexShrink: 0,
    height: '100%',
    backgroundColor: PANEL.bg,
    borderLeftWidth: 1,
    borderLeftColor: PANEL.line,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 48,
  },
  bodyDocked: {
    paddingTop: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 44,
    flexShrink: 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroWrap: {
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#12141F',
    flexShrink: 0,
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  heroEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1D2E',
  },
  heroEmptyText: Typo(
    {
      color: PANEL.textMuted,
      fontSize: 48,
      fontWeight: '600',
    },
    'serif',
  ),
  pagePillWrap: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pagePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  pagePillText: Typo(
    {
      color: PANEL.text,
      fontSize: 13,
      fontWeight: '500',
    },
    'sans',
  ),
  infoBlock: {
    flexShrink: 0,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: Typo(
    {
      flex: 1,
      minWidth: 0,
      color: PANEL.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700',
    },
    'display',
  ),
  followBtn: {
    flexShrink: 0,
    minWidth: 84,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: TOKENS.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  followBtnText: Typo(
    {
      color: PANEL.text,
      fontSize: 14,
      fontWeight: '700',
    },
    'sans',
  ),
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  author: Typo(
    {
      color: PANEL.textSecondary,
      fontSize: 14,
    },
    'sans',
  ),
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likes: Typo(
    {
      color: PANEL.textMuted,
      fontSize: 14,
    },
    'sans',
  ),
  likesActive: {
    color: PANEL.likeActive,
  },
  desc: Typo(
    {
      color: PANEL.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    'sans',
  ),
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatBtn: {
    backgroundColor: 'rgba(12, 14, 24, 0.9)',
    borderWidth: 1.5,
  },
  actionBtnText: Typo(
    {
      color: PANEL.text,
      fontSize: 14,
      fontWeight: '700',
    },
    'sans',
  ),
  createImageBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(12, 14, 24, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  videoCallBtn: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(12, 14, 24, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  videoCallBtnDisabled: {
    opacity: 0.45,
  },
  videoCallLabelCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  videoCallHint: Typo(
    {
      color: PANEL.textMuted,
      fontSize: 11,
      fontWeight: '500',
    },
    'sans',
  ),
  videoCallTextDisabled: {
    color: PANEL.textMuted,
  },
  relationBlock: {
    marginTop: 4,
    gap: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PANEL.line,
  },
  relationSection: {
    gap: 8,
  },
  kinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  relationLabel: Typo(
    {
      color: PANEL.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  pressed: {
    opacity: 0.82,
  },
});
