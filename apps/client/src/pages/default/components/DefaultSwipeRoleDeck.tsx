import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  PanResponder,
  Platform,
  useWindowDimensions,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { resolveStaticUrl } from '../../../constants/config';
import { Typo } from '../../../theme/typography';
import { useI18n } from '../../../i18n/I18nContext';
import { resolveRoleCategoryName } from '../../../utils/roleCategory';
import { AgentRatingCover } from '../../../components/agent/AgentRatingCover';
import {
  canUserSeeMature,
  contentRatingBadgeLabel,
  isAgentMatureLocked,
  isAgentRBlurred,
} from '../../../utils/agentRatingDisplay';
import {
  markSessionRevealed,
  mediaRevealKey,
  isSessionRevealed,
} from '../../../utils/mediaRevealSession';
import { useAuthStore } from '../../../stores/authStore';
import type { ExploreRoleItem } from '../../../types/api';
import { TOKENS } from '../theme/tokens';

const SWIPE_OUT_MS = 220;
const SPRING_BACK = { friction: 7, tension: 60 };
const PAN_CAPTURE_PX = 4;
/** 首次越过此位移时播 stamp 弹入动画 */
const STAMP_POP_TRIGGER_PX = 28;
/** 回到中心附近时允许再次弹入 */
const STAMP_POP_RESET_PX = 12;
const AVATAR_RING = TOKENS.colors.accent;
const AVATAR_SIZE = 72;
const DASH_COUNT = 7;
const STAMP_LIKE_COLOR = TOKENS.colors.accent;
const STAMP_NOPE_COLOR = '#E8D5B5';
const ACTION_BTN_SIZE = 48;
/** 进聊天浮层：两头像间波纹环数量 */
const ENTER_CHAT_RIPPLE_COUNT = 3;

type ActionFocus = 'like' | 'nope' | null;

/**
 * 右滑进聊天：两头像之间循环扩散的波纹环。
 */
function EnterChatRipples() {
  const ripples = useRef(
    Array.from({ length: ENTER_CHAT_RIPPLE_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const loops = ripples.map((progress, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 420),
          Animated.timing(progress, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(progress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    const composite = Animated.parallel(loops);
    composite.start();
    return () => {
      composite.stop();
      ripples.forEach((v) => {
        v.stopAnimation();
        v.setValue(0);
      });
    };
  }, [ripples]);

  return (
    <View style={styles.enterChatRippleHost} pointerEvents="none">
      {ripples.map((progress, i) => {
        const scale = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.25, 2.1],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.15, 0.7, 1],
          outputRange: [0, 0.55, 0.2, 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.enterChatRippleRing,
              { opacity, transform: [{ scale }] },
            ]}
          />
        );
      })}
    </View>
  );
}

type DefaultSwipeRoleDeckProps = {
  items: ExploreRoleItem[];
  nameFallback: string;
  onOpenDetail: (id: string) => void;
  /** 右滑达标后进入聊天。 */
  onLike: (id: string) => void;
  /** 返回 false 则取消右滑进聊天（如未登录）。 */
  onBeforeLike?: () => boolean;
  onMatureLocked?: (id: string) => void;
  /** 接近列表末尾时触发分页。 */
  onNearEnd?: () => void;
  /** 切换为网格列表。 */
  onToggleGrid?: () => void;
};

function formatCount(n?: number): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

type SwipeActionOrbProps = {
  kind: 'like' | 'nope';
  focused: boolean;
  fill: Animated.Value;
  colorScale: Animated.Value;
  whiteScale: Animated.Value;
  onPress?: () => void;
  accessibilityLabel: string;
};

/**
 * 底栏钮：未聚焦为静态彩标；聚焦时色底 fill → 彩 icon 放大 → 白 icon 弹出。
 * 三钮始终同排显示，动画只作用在 focused 那一颗。
 */
function SwipeActionOrb({
  kind,
  focused,
  fill,
  colorScale,
  whiteScale,
  onPress,
  accessibilityLabel,
}: SwipeActionOrbProps) {
  const accent = kind === 'like' ? STAMP_LIKE_COLOR : STAMP_NOPE_COLOR;
  const iconName = kind === 'like' ? 'heart' : 'heart-dislike';

  const fillScale = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0.01, 1],
  });
  const colorOpacity = fill.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        kind === 'like' ? styles.actionBtnLike : styles.actionBtnNope,
        focused && styles.actionBtnFocused,
        pressed && !focused && styles.actionBtnPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {focused ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.actionFillDisk,
              { backgroundColor: accent, transform: [{ scale: fillScale }] },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.actionIconLayer,
              { opacity: colorOpacity, transform: [{ scale: colorScale }] },
            ]}
          >
            <Ionicons name={iconName} size={22} color={accent} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.actionIconLayer, { transform: [{ scale: whiteScale }] }]}
          >
            <Ionicons name={iconName} size={22} color="#FFFFFF" />
          </Animated.View>
        </>
      ) : (
        <View style={styles.actionIconLayer} pointerEvents="none">
          <Ionicons name={iconName} size={22} color={accent} />
        </View>
      )}
    </Pressable>
  );
}

type SwipeCardFaceProps = {
  item: ExploreRoleItem;
  nameFallback: string;
  canSeeMature: boolean;
  /** 前卡门控揭示后同步，避免卡面仍显示 R 模糊。 */
  sessionRevealed?: boolean;
  /** 仅前卡：点「Tap to view」揭开 R 后通知父级。 */
  onRevealed?: () => void;
  /** 仅前卡：点 Mature 锁。 */
  onMatureLockedPress?: () => void;
  /** 仅前卡可点详情；底层预渲染卡传 undefined。 */
  onDetailPress?: () => void;
  /** 仅前卡：底部操作（跳过 / 网格 / 喜欢）。 */
  onPassPress?: () => void;
  onLikePress?: () => void;
  onToggleGridPress?: () => void;
  /** 底层卡：预留底栏高度但不显示；升为主卡后再播 scale 0→1 */
  reserveActionRow?: boolean;
  actionFocus?: ActionFocus;
  actionFill?: Animated.Value;
  actionColorScale?: Animated.Value;
  actionWhiteScale?: Animated.Value;
  style?: StyleProp<ViewStyle>;
};

/**
 * 叠层轮播的一「页」：完整封面 + 信息条（与前卡同结构）。
 * key 应由父级用 roleId 传入，便于下一张升为当前时复用。
 */
function SwipeCardFace({
  item,
  nameFallback,
  canSeeMature,
  sessionRevealed,
  onRevealed,
  onMatureLockedPress,
  onDetailPress,
  onPassPress,
  onLikePress,
  onToggleGridPress,
  reserveActionRow = false,
  actionFocus = null,
  actionFill,
  actionColorScale,
  actionWhiteScale,
  style,
}: SwipeCardFaceProps) {
  const { t, lang } = useI18n();
  const revealKey = mediaRevealKey('role', item.id);
  const [rRevealed, setRRevealed] = useState(() => isSessionRevealed(revealKey));
  /** 底栏入场：底层预留时为 0，升为主卡后弹到 1 */
  const actionRowScale = useRef(new Animated.Value(0)).current;
  const actionRowWasActiveRef = useRef(false);

  useEffect(() => {
    // 只读本卡 role 的 session；禁止把「前卡已揭示」粘成后卡永久去模糊
    setRRevealed(isSessionRevealed(revealKey));
  }, [revealKey, sessionRevealed]);

  const actionRowInteractive = !!(onPassPress || onLikePress || onToggleGridPress);
  const showActionSlot = actionRowInteractive || reserveActionRow;

  useEffect(() => {
    if (!actionRowInteractive) {
      actionRowWasActiveRef.current = false;
      actionRowScale.stopAnimation();
      actionRowScale.setValue(0);
      return;
    }
    if (actionRowWasActiveRef.current) return;
    actionRowWasActiveRef.current = true;
    actionRowScale.setValue(0);
    Animated.spring(actionRowScale, {
      toValue: 1,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [actionRowInteractive, actionRowScale]);

  const name = item.name || nameFallback;
  const coverUrl = item.figure_url || item.avatar_url;
  const cover = coverUrl ? resolveStaticUrl(coverUrl) || null : null;
  const matureLocked = isAgentMatureLocked(item.content_rating, canSeeMature, item);
  // 不得用 sessionRevealed 直接当 revealed：升页瞬间父级状态可能仍是上一张的 true
  const revealed = isSessionRevealed(revealKey) || rRevealed;
  const rBlurred = isAgentRBlurred(item.content_rating, item.id, revealed, canSeeMature);
  const ratingBadge = contentRatingBadgeLabel(item.content_rating);
  const primaryTag = item.has_chat_history
    ? t('explore.categoryHistory')
    : item.categories?.[0]
      ? resolveRoleCategoryName(item.categories[0].category_id, item.categories[0].name, t)
      : null;

  const handleRevealR = useCallback(() => {
    markSessionRevealed(revealKey);
    setRRevealed(true);
    onRevealed?.();
  }, [onRevealed, revealKey]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.coverWrap}>
        <AgentRatingCover
          uri={cover}
          nameFallbackInitial={name.charAt(0).toUpperCase()}
          rBlurred={rBlurred}
          matureLocked={matureLocked}
          revealRLabel={t('agentMedia.revealR')}
          matureLockLabel={t('agentMedia.matureLocked')}
          imageTransitionMs={0}
          onRevealPress={rBlurred && onRevealed ? handleRevealR : undefined}
          onLockedPress={matureLocked && onMatureLockedPress ? onMatureLockedPress : undefined}
        />

        <View style={[styles.infoBlock, styles.infoBlockBlur]}>
          {(primaryTag || ratingBadge) && (
            <View style={styles.tagRow}>
              {primaryTag ? (
                <View style={[styles.pill, item.has_chat_history && styles.pillHistory]}>
                  <Text
                    style={[
                      Typo(styles.pillText, 'sans', lang),
                      item.has_chat_history ? styles.pillHistoryText : null,
                    ]}
                    numberOfLines={1}
                  >
                    {primaryTag}
                  </Text>
                </View>
              ) : null}
              {ratingBadge ? (
                <View style={[styles.pill, styles.pillRating]}>
                  <Text style={Typo(styles.pillRatingText, 'sans', lang)}>{ratingBadge}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.nameRow}>
            <Text style={Typo(styles.name, 'serif', lang)} numberOfLines={1}>
              {name}
            </Text>
            {onDetailPress ? (
              <Pressable
                style={styles.detailBtn}
                onPress={onDetailPress}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Ionicons name="chevron-up" size={18} color="#fff" />
              </Pressable>
            ) : (
              <View style={styles.detailBtn} pointerEvents="none">
                <Ionicons name="chevron-up" size={18} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={Typo(styles.statText, 'sans', lang)}>{formatCount(item.view_count)}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={Typo(styles.statText, 'sans', lang)}>{formatCount(item.like_count)}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={Typo(styles.statText, 'sans', lang)}>{formatCount(item.comment_count)}</Text>
            </View>
          </View>

          {item.introduction ? (
            <Text style={Typo(styles.intro, 'sans', lang)} numberOfLines={2}>
              {item.introduction}
            </Text>
          ) : null}

          {showActionSlot ? (
            <Animated.View
              style={[
                styles.actionRow,
                {
                  opacity: actionRowInteractive ? 1 : 0,
                  transform: [{ scale: actionRowScale }],
                },
              ]}
              pointerEvents={actionRowInteractive ? 'box-none' : 'none'}
            >
              {actionRowInteractive && actionFill && actionColorScale && actionWhiteScale ? (
                <>
                  <SwipeActionOrb
                    kind="nope"
                    focused={actionFocus === 'nope'}
                    fill={actionFill}
                    colorScale={actionColorScale}
                    whiteScale={actionWhiteScale}
                    onPress={actionFocus ? undefined : onPassPress}
                    accessibilityLabel={t('explore.swipePass')}
                  />
                  {onToggleGridPress ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.actionBtnGrid,
                        pressed && styles.actionBtnPressed,
                      ]}
                      onPress={onToggleGridPress}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={t('explore.switchToGrid')}
                    >
                      <Ionicons name="grid-outline" size={20} color="#fff" />
                    </Pressable>
                  ) : null}
                  <SwipeActionOrb
                    kind="like"
                    focused={actionFocus === 'like'}
                    fill={actionFill}
                    colorScale={actionColorScale}
                    whiteScale={actionWhiteScale}
                    onPress={actionFocus ? undefined : onLikePress}
                    accessibilityLabel={t('explore.swipeLike')}
                  />
                </>
              ) : (
                <>
                  {/* 占位：与前卡同尺寸，保证叠层信息区高度一致 */}
                  <View style={[styles.actionBtn, styles.actionBtnNope]} />
                  <View style={[styles.actionBtn, styles.actionBtnGrid]} />
                  <View style={[styles.actionBtn, styles.actionBtnLike]} />
                </>
              )}
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * 叠层轮播：当前 + 下一张完整卡；兄弟节点 key=roleId 以便升页复用。
 * 换页时换新的 Animated.ValueXY，旧前卡带着屏外位移卸载——绝不能对共享 pan 做 setValue(0)，
 * 否则上一张会弹回正中闪一帧（用户看到「先闪旧内容再出新卡」）。
 */
export function DefaultSwipeRoleDeck({
  items,
  nameFallback,
  onOpenDetail,
  onLike,
  onBeforeLike,
  onMatureLocked,
  onNearEnd,
  onToggleGrid,
}: DefaultSwipeRoleDeckProps) {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const canSeeMature = canUserSeeMature(user);
  const { width: winW } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const animatingRef = useRef(false);
  /** 每次升页换新 Value，旧前卡卸载时仍停在屏外，不会被归零拉回 */
  const panRef = useRef(new Animated.ValueXY());
  const [panEpoch, setPanEpoch] = useState(0);
  const pan = panRef.current;
  const likeStampScale = useRef(new Animated.Value(1)).current;
  const nopeStampScale = useRef(new Animated.Value(1)).current;
  const likePoppedRef = useRef(false);
  const nopePoppedRef = useRef(false);
  const [actionFocus, setActionFocus] = useState<ActionFocus>(null);
  const actionFocusRef = useRef<ActionFocus>(null);
  const actionFill = useRef(new Animated.Value(0)).current;
  const actionColorScale = useRef(new Animated.Value(1)).current;
  const actionWhiteScale = useRef(new Animated.Value(0)).current;
  const actionFillPlayedRef = useRef(false);
  const shouldAdvanceOnFocusRef = useRef(false);
  /** 左滑升页后：屏幕中央心碎浮层 */
  const [passBurstVisible, setPassBurstVisible] = useState(false);
  const passBurstScale = useRef(new Animated.Value(0)).current;
  const passBurstOpacity = useRef(new Animated.Value(0)).current;
  /** 右滑进聊天过渡：用户头 ↔ Agent 头 */
  const [enteringChat, setEnteringChat] = useState<{
    agentUri: string | null;
    agentInitial: string;
  } | null>(null);

  const itemsKey = useMemo(() => items.map((i) => i.id).join('|'), [items]);
  const itemIdAtIndex = items[index]?.id;
  const currentItemIdRef = useRef<string | undefined>(itemIdAtIndex);
  if (itemIdAtIndex) currentItemIdRef.current = itemIdAtIndex;

  const resetStampPop = useCallback(() => {
    likePoppedRef.current = false;
    nopePoppedRef.current = false;
    likeStampScale.stopAnimation();
    nopeStampScale.stopAnimation();
    likeStampScale.setValue(1);
    nopeStampScale.setValue(1);
  }, [likeStampScale, nopeStampScale]);

  const resetActionFocus = useCallback(() => {
    actionFocusRef.current = null;
    setActionFocus(null);
    actionFillPlayedRef.current = false;
    actionFill.stopAnimation();
    actionColorScale.stopAnimation();
    actionWhiteScale.stopAnimation();
    actionFill.setValue(0);
    actionColorScale.setValue(1);
    actionWhiteScale.setValue(0);
  }, [actionColorScale, actionFill, actionWhiteScale]);

  const playActionFill = useCallback(() => {
    if (actionFillPlayedRef.current) return;
    actionFillPlayedRef.current = true;
    actionFill.stopAnimation();
    actionColorScale.stopAnimation();
    actionWhiteScale.stopAnimation();
    actionFill.setValue(0);
    actionColorScale.setValue(1);
    actionWhiteScale.setValue(0);
    // JS 驱动：前卡 pan 占用 native transform，否则填色要等回弹才看得见
    Animated.parallel([
      Animated.timing(actionFill, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(actionColorScale, {
        toValue: 1.35,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.delay(110),
        Animated.timing(actionWhiteScale, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [actionColorScale, actionFill, actionWhiteScale]);

  const lockActionFocus = useCallback(
    (kind: 'like' | 'nope') => {
      const switched = actionFocusRef.current !== kind;
      if (switched) {
        actionFillPlayedRef.current = false;
        actionFocusRef.current = kind;
        setActionFocus(kind);
      }
      playActionFill();
    },
    [playActionFill],
  );

  const playStampPop = useCallback(
    (kind: 'like' | 'nope') => {
      const scale = kind === 'like' ? likeStampScale : nopeStampScale;
      scale.stopAnimation();
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.25,
          duration: 120,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [likeStampScale, nopeStampScale],
  );

  const updateStampPopFromDx = useCallback(
    (dx: number) => {
      if (dx > STAMP_POP_TRIGGER_PX && !likePoppedRef.current) {
        likePoppedRef.current = true;
        playStampPop('like');
      } else if (dx < -STAMP_POP_TRIGGER_PX && !nopePoppedRef.current) {
        nopePoppedRef.current = true;
        playStampPop('nope');
      }

      // 一有左右位移就播对应按钮填色（底栏不隐藏）
      if (dx > PAN_CAPTURE_PX) {
        lockActionFocus('like');
      } else if (dx < -PAN_CAPTURE_PX) {
        lockActionFocus('nope');
      } else if (Math.abs(dx) < STAMP_POP_RESET_PX && !animatingRef.current) {
        if (likePoppedRef.current || nopePoppedRef.current) {
          resetStampPop();
        }
        if (actionFocusRef.current) {
          resetActionFocus();
        }
      }
    },
    [lockActionFocus, playStampPop, resetActionFocus, resetStampPop],
  );

  const resetPan = useCallback(() => {
    panRef.current = new Animated.ValueXY();
    setPanEpoch((n) => n + 1);
    resetStampPop();
    resetActionFocus();
    setPassBurstVisible(false);
    passBurstScale.stopAnimation();
    passBurstOpacity.stopAnimation();
    passBurstScale.setValue(0);
    passBurstOpacity.setValue(0);
  }, [passBurstOpacity, passBurstScale, resetActionFocus, resetStampPop]);

  /**
   * 列表变了（换分类 / 刷新 / 分页追加）时：
   * - 当前角色仍在 → 跟住其新下标（分页追加绝不能 reset 到 0）
   * - 已不在 → 回第一张
   */
  useEffect(() => {
    const keepId = currentItemIdRef.current;
    const nextIdx = keepId ? items.findIndex((i) => i.id === keepId) : -1;
    setIndex(nextIdx >= 0 ? nextIdx : 0);
    animatingRef.current = false;
    setEnteringChat(null);
    shouldAdvanceOnFocusRef.current = false;
    resetPan();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync to itemsKey identity only
  }, [itemsKey]);

  useFocusEffect(
    useCallback(() => {
      setEnteringChat(null);
      setPassBurstVisible(false);
      animatingRef.current = false;
      if (shouldAdvanceOnFocusRef.current) {
        shouldAdvanceOnFocusRef.current = false;
        panRef.current = new Animated.ValueXY();
        setPanEpoch((n) => n + 1);
        resetStampPop();
        resetActionFocus();
        setIndex((prev) => {
          if (prev >= items.length - 1) return prev;
          return prev + 1;
        });
      } else {
        panRef.current.setValue({ x: 0, y: 0 });
        resetStampPop();
        resetActionFocus();
      }
    }, [items.length, resetActionFocus, resetStampPop]),
  );

  useEffect(() => {
    if (items.length - index <= 3) onNearEnd?.();
  }, [index, items.length, onNearEnd]);

  const item = items[index] ?? null;
  const nextItem = items[index + 1] ?? null;

  const [, setFrontRevealTick] = useState(0);
  const frontRevealKey = item ? mediaRevealKey('role', item.id) : '';
  const frontRRevealed = frontRevealKey ? isSessionRevealed(frontRevealKey) : false;

  const swipeThreshold = Math.min(120, winW * 0.28);

  const userAvatarUri = user?.avatar_url ? resolveStaticUrl(user.avatar_url) || null : null;
  const userInitial = (user?.nickname || '?').charAt(0).toUpperCase();

  const playPassBurst = useCallback(() => {
    setPassBurstVisible(true);
    passBurstScale.stopAnimation();
    passBurstOpacity.stopAnimation();
    passBurstScale.setValue(0.35);
    passBurstOpacity.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(passBurstScale, {
          toValue: 1.2,
          duration: 220,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.spring(passBurstScale, {
          toValue: 1,
          friction: 5,
          tension: 160,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(passBurstOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.delay(280),
        Animated.timing(passBurstOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) setPassBurstVisible(false);
    });
  }, [passBurstOpacity, passBurstScale]);

  const advance = useCallback(
    (opts?: { passBurst?: boolean }) => {
      animatingRef.current = false;
      // 先换新 pan@0，再升页：旧前卡带着旧 pan（仍在屏外）卸载，不会弹回
      panRef.current = new Animated.ValueXY();
      setPanEpoch((n) => n + 1);
      resetStampPop();
      resetActionFocus();
      setIndex((prev) => {
        if (prev >= items.length - 1) return prev;
        return prev + 1;
      });
      if (opts?.passBurst) playPassBurst();
    },
    [items.length, playPassBurst, resetActionFocus, resetStampPop],
  );

  const flyOut = useCallback(
    (direction: 'left' | 'right', after?: () => void, opts?: { skipAdvance?: boolean }) => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      const activePan = panRef.current;
      const toX = direction === 'right' ? winW * 1.35 : -winW * 1.35;
      Animated.timing(activePan, {
        toValue: { x: toX, y: 0 },
        duration: SWIPE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          animatingRef.current = false;
          return;
        }
        after?.();
        if (!opts?.skipAdvance) advance({ passBurst: direction === 'left' });
        else animatingRef.current = false;
      });
    },
    [advance, winW],
  );

  const beginEnterChat = useCallback(
    (role: ExploreRoleItem) => {
      const agentUrl = role.avatar_url || role.figure_url;
      shouldAdvanceOnFocusRef.current = true;
      setEnteringChat({
        agentUri: agentUrl ? resolveStaticUrl(agentUrl) || null : null,
        agentInitial: (role.name || '?').charAt(0).toUpperCase(),
      });
      const roleId = role.id;
      flyOut('right', () => onLike(roleId), { skipAdvance: true });
    },
    [flyOut, onLike],
  );

  const tryRevealOrGate = useCallback(
    (role: ExploreRoleItem): 'ok' | 'revealed' | 'locked' => {
      const key = mediaRevealKey('role', role.id);
      const revealed = isSessionRevealed(key);
      const matureLocked = isAgentMatureLocked(role.content_rating, canSeeMature, role);
      const rBlurred = isAgentRBlurred(role.content_rating, role.id, revealed, canSeeMature);
      if (rBlurred) {
        markSessionRevealed(key);
        setFrontRevealTick((n) => n + 1);
        return 'revealed';
      }
      if (matureLocked) {
        onMatureLocked?.(role.id);
        return 'locked';
      }
      return 'ok';
    },
    [canSeeMature, onMatureLocked],
  );

  const springHome = useCallback(() => {
    resetActionFocus();
    Animated.spring(panRef.current, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      ...SPRING_BACK,
    }).start(({ finished }) => {
      if (finished) resetStampPop();
    });
  }, [resetActionFocus, resetStampPop]);

  const handleDetail = useCallback(() => {
    if (!item) return;
    const gate = tryRevealOrGate(item);
    if (gate === 'revealed' || gate === 'locked') return;
    onOpenDetail(item.id);
  }, [item, onOpenDetail, tryRevealOrGate]);

  const handlePassPress = useCallback(() => {
    if (animatingRef.current || enteringChat || !item) return;
    if (!nopePoppedRef.current) {
      nopePoppedRef.current = true;
      playStampPop('nope');
    }
    lockActionFocus('nope');
    flyOut('left');
  }, [enteringChat, flyOut, item, lockActionFocus, playStampPop]);

  const handleLikePress = useCallback(() => {
    if (animatingRef.current || enteringChat || !item) return;
    const gate = tryRevealOrGate(item);
    if (gate === 'revealed' || gate === 'locked') return;
    if (onBeforeLike && !onBeforeLike()) return;
    if (!likePoppedRef.current) {
      likePoppedRef.current = true;
      playStampPop('like');
    }
    lockActionFocus('like');
    beginEnterChat(item);
  }, [
    beginEnterChat,
    enteringChat,
    item,
    lockActionFocus,
    onBeforeLike,
    playStampPop,
    tryRevealOrGate,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_: GestureResponderEvent, g: PanResponderGestureState) =>
          !enteringChat &&
          !animatingRef.current &&
          (Math.abs(g.dx) > PAN_CAPTURE_PX || Math.abs(g.dy) > PAN_CAPTURE_PX),
        onMoveShouldSetPanResponderCapture: (_: GestureResponderEvent, g: PanResponderGestureState) =>
          !enteringChat &&
          !animatingRef.current &&
          (Math.abs(g.dx) > PAN_CAPTURE_PX || Math.abs(g.dy) > PAN_CAPTURE_PX),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => {
          if (enteringChat) return;
          panRef.current.setValue({ x: g.dx, y: g.dy });
          updateStampPopFromDx(g.dx);
        },
        onPanResponderRelease: (_e, g) => {
          if (animatingRef.current || enteringChat || !item) return;
          if (g.dx > swipeThreshold || g.vx > 0.85) {
            const gate = tryRevealOrGate(item);
            if (gate === 'revealed' || gate === 'locked') {
              springHome();
              return;
            }
            if (onBeforeLike && !onBeforeLike()) {
              springHome();
              return;
            }
            lockActionFocus('like');
            beginEnterChat(item);
            return;
          }
          if (g.dx < -swipeThreshold || g.vx < -0.85) {
            lockActionFocus('nope');
            flyOut('left');
            return;
          }
          springHome();
        },
        onPanResponderTerminate: () => {
          springHome();
        },
      }),
    // panEpoch：升页换新 pan 后重建手势，避免绑到已废弃的 Value
    [
      beginEnterChat,
      enteringChat,
      flyOut,
      item,
      lockActionFocus,
      onBeforeLike,
      panEpoch,
      springHome,
      swipeThreshold,
      tryRevealOrGate,
      updateStampPopFromDx,
    ],
  );

  const swipeFadeRange = Math.max(swipeThreshold, winW * 0.35);

  const rotate = pan.x.interpolate({
    inputRange: [-winW, 0, winW],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  /** 右滑 → 左上角心；左滑 → 右上角心碎；透明度跟位移 */
  const likeStampOpacity = pan.x.interpolate({
    inputRange: [0, swipeThreshold * 0.35, swipeThreshold],
    outputRange: [0, 0.45, 1],
    extrapolate: 'clamp',
  });
  const nopeStampOpacity = pan.x.interpolate({
    inputRange: [-swipeThreshold, -swipeThreshold * 0.35, 0],
    outputRange: [1, 0.45, 0],
    extrapolate: 'clamp',
  });

  const nextScale = pan.x.interpolate({
    inputRange: [-swipeFadeRange, 0, swipeFadeRange],
    outputRange: [1, 0.97, 1],
    extrapolate: 'clamp',
  });

  if (!item) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={Typo(styles.emptyText, 'sans', lang)}>{t('explore.empty')}</Text>
      </View>
    );
  }

  /**
   * 兄弟节点 key=roleId：B 从底层升前卡时复用实例（不重挂图）。
   * 前卡绑定「本代」pan；升页会换新 pan，旧 pan 带着 A 停在屏外一起卸载，绝不 setValue(0)。
   */
  return (
    <View style={styles.root}>
      {nextItem ? (
        <Animated.View
          key={nextItem.id}
          pointerEvents="none"
          style={[
            styles.stackSlot,
            styles.stackUnderZ,
            {
              transform: [{ scale: nextScale }],
            },
          ]}
        >
          <SwipeCardFace
            item={nextItem}
            nameFallback={nameFallback}
            canSeeMature={canSeeMature}
            reserveActionRow
          />
        </Animated.View>
      ) : (
        <View key="__deck-empty__" style={[styles.stackSlot, styles.stackEmpty]} pointerEvents="none" />
      )}

      <Animated.View
        key={item.id}
        style={[
          styles.stackSlot,
          styles.stackFrontZ,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <SwipeCardFace
          item={item}
          nameFallback={nameFallback}
          canSeeMature={canSeeMature}
          sessionRevealed={frontRRevealed}
          onRevealed={() => setFrontRevealTick((n) => n + 1)}
          onMatureLockedPress={
            onMatureLocked ? () => onMatureLocked(item.id) : undefined
          }
          onDetailPress={handleDetail}
          onPassPress={handlePassPress}
          onLikePress={handleLikePress}
          onToggleGridPress={onToggleGrid}
          actionFocus={actionFocus}
          actionFill={actionFill}
          actionColorScale={actionColorScale}
          actionWhiteScale={actionWhiteScale}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.stamp,
            styles.stampLike,
            {
              opacity: likeStampOpacity,
              transform: [{ scale: likeStampScale }, { rotate: '-14deg' }],
            },
          ]}
        >
          <View style={styles.stampBadge}>
            <Ionicons name="heart" size={28} color={STAMP_LIKE_COLOR} />
          </View>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.stamp,
            styles.stampNope,
            {
              opacity: nopeStampOpacity,
              transform: [{ scale: nopeStampScale }, { rotate: '14deg' }],
            },
          ]}
        >
          <View style={styles.stampBadge}>
            <Ionicons name="heart-dislike" size={28} color={STAMP_NOPE_COLOR} />
          </View>
        </Animated.View>
      </Animated.View>

      {passBurstVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.passBurstOverlay,
            {
              opacity: passBurstOpacity,
              transform: [{ scale: passBurstScale }],
            },
          ]}
        >
          <Ionicons name="heart-dislike" size={88} color={STAMP_NOPE_COLOR} />
        </Animated.View>
      ) : null}

      {enteringChat ? (
        <View style={styles.enterChatOverlay} pointerEvents="auto">
          <View style={styles.enterChatRow}>
            <EnterChatRipples />
            <View style={styles.avatarRing}>
              {userAvatarUri ? (
                <Image source={{ uri: userAvatarUri }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                </View>
              )}
            </View>

            <View style={styles.enterChatBridge}>
              <Text style={Typo(styles.enterChatLabel, 'sans', lang)} numberOfLines={1}>
                {t('explore.enteringChatRoom')}
              </Text>
              <View style={styles.dashRow}>
                {Array.from({ length: DASH_COUNT }, (_, i) => (
                  <View key={i} style={styles.dashSeg} />
                ))}
              </View>
            </View>

            <View style={styles.avatarRing}>
              {enteringChat.agentUri ? (
                <Image
                  source={{ uri: enteringChat.agentUri }}
                  style={styles.avatarImg}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{enteringChat.agentInitial}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  /** 叠层槽位：底层/前卡容器稳定，不在槽间搬 Animated.View key */
  stackSlot: {
    ...StyleSheet.absoluteFill,
  },
  stackUnderZ: {
    zIndex: 0,
  },
  stackFrontZ: {
    zIndex: 1,
  },
  stamp: {
    position: 'absolute',
    top: 18,
    zIndex: 4,
  },
  stampLike: {
    left: 16,
  },
  stampNope: {
    right: 16,
  },
  stampBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 左滑换卡后：屏幕正中心碎浮层（不挂在卡片底栏） */
  passBurstOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackEmpty: {
    borderRadius: 20,
    backgroundColor: TOKENS.colors.bgElevated,
  },
  card: {
    flex: 1,
    minHeight: 0,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.cardSolid,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  coverWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  infoBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.62)',
  },
  infoBlockBlur:
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
        } as object)
      : {},
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  pillHistory: {
    backgroundColor: 'rgba(186, 60, 71, 0.92)',
  },
  pillRating: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pillText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '600',
  },
  pillHistoryText: {
    color: '#fff',
  },
  pillRatingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    flex: 1,
    color: '#fff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  detailBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(80,80,80,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '500',
  },
  intro: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginTop: 6,
    paddingTop: 4,
  },
  actionBtn: {
    width: ACTION_BTN_SIZE,
    height: ACTION_BTN_SIZE,
    borderRadius: ACTION_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: 'rgba(8, 10, 15, 0.45)',
    overflow: 'hidden',
  },
  actionBtnFocused: {
    borderWidth: 0,
  },
  actionFillDisk: {
    ...StyleSheet.absoluteFill,
    borderRadius: ACTION_BTN_SIZE / 2,
  },
  actionIconLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnNope: {
    borderColor: 'rgba(232, 213, 181, 0.55)',
  },
  actionBtnLike: {
    borderColor: 'rgba(186, 60, 71, 0.75)',
  },
  actionBtnGrid: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  actionBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: TOKENS.colors.textSecondary,
    textAlign: 'center',
  },
  enterChatOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  enterChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    position: 'relative',
  },
  /** 两头像之间的波纹宿主：铺满整行，环从中心向外扩 */
  enterChatRippleHost: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  enterChatRippleRing: {
    position: 'absolute',
    width: AVATAR_SIZE * 1.15,
    height: AVATAR_SIZE * 1.15,
    borderRadius: (AVATAR_SIZE * 1.15) / 2,
    borderWidth: 2,
    borderColor: AVATAR_RING,
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2.5,
    borderColor: AVATAR_RING,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.bgElevated,
    zIndex: 1,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: TOKENS.colors.text,
    fontSize: 28,
    fontWeight: '600',
  },
  enterChatBridge: {
    flex: 1,
    maxWidth: 140,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  enterChatLabel: {
    color: AVATAR_RING,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
  },
  dashSeg: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: AVATAR_RING,
    opacity: 0.9,
  },
});
