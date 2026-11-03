import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Animated,
  Modal,
  PanResponder,
  type PanResponderGestureState,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { TOKENS } from '../../pages/default/theme/tokens';
import { resolveStaticUrl } from '../../constants/config';
import { deleteChatSession, listChatConversations } from '../../api/chat';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { notifyError, notifySuccess } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { type FreeChatUiVariant } from './freeChatUi';
import { VerifiedRealPersonBadge } from '../agent/VerifiedRealPersonBadge';
import type { BondInfo, ChatConversationListItem } from '../../types/api';
import { BondProgressBar, bondProgressValue } from './BondProgressBar';

/** 左栏固定宽度（桌面常驻） */
export const CHAT_AGENT_HISTORY_SIDEBAR_WIDTH = 300;
/** 窄于该宽度时默认折叠，避免挤占消息区 */
export const CHAT_AGENT_HISTORY_SIDEBAR_BREAKPOINT = 900;
/** 折叠态仅留展开按钮的窄宽 */
const COLLAPSED_WIDTH = 48;
const SIDEBAR_ANIM_MS = 280;
/** 移动端左滑露出的删除区宽度 */
const SWIPE_DELETE_WIDTH = 64;
/** 删除按钮配色：对齐 DefaultR18FilterChip */
const DELETE_RED = TOKENS.colors.accent;
const DELETE_ICON_RED = '#F0717A';

interface ChatAgentHistorySidebarProps {
  /** 当前打开的 role，用于高亮 */
  activeRoleId?: string | null;
  /** 当前会话 id（同角色下精确高亮；可选） */
  activeSessionId?: string | null;
  /** 父级在新建对话 / 发消息后递增，触发重新拉取 */
  refreshKey?: number;
  collapsed?: boolean;
  /**
   * 移动端：展开为悬浮抽屉（遮罩 + 滑入），不挤占聊天布局。
   * 桌面端保持 false，仍为内联侧栏。
   */
  overlay?: boolean;
  /**
   * sidebar：聊天室内嵌侧栏（默认）
   * page：独立「聊天」页全宽复用同一套 UI
   */
  layout?: 'sidebar' | 'page';
  onToggleCollapsed?: () => void;
  onSelectConversation: (item: ChatConversationListItem) => void;
  /** 删除的是当前打开的会话时，由父级切到新会话 / 重建 */
  onDeletedCurrent?: () => void | Promise<void>;
  variant?: FreeChatUiVariant;
  /** Current chat bond — compact bar to the right of search. */
  bond?: BondInfo | null;
}

function formatListTime(ts: number | undefined, t: (key: string) => string): string {
  if (!ts) return '';
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const diff = Date.now() - ms;
  if (diff < 0) return t('chat.relativeJustNow');
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('chat.relativeJustNow');
  if (minutes < 60) return t('chat.relativeMinutesAgo').replace('{n}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('chat.relativeHoursAgo').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t('chat.relativeDaysAgo').replace('{n}', String(days));
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type ConversationRowProps = {
  item: ChatConversationListItem;
  active: boolean;
  isDefault: boolean;
  deleting: boolean;
  /** 当前行是否为唯一打开的左滑项 */
  isSwipeOpen: boolean;
  /** 列表里是否有任意一行处于打开态（含自己） */
  hasOpenSwipe: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  /** 开始拖本行时：收回其它已打开行 */
  onSwipeGestureStart: () => void;
  onSelect: () => void;
  onRequestDelete: () => void;
  formatTime: (ts: number | undefined) => string;
  deleteLabel: string;
  affectionTitle: string;
  affectionFallback: string;
};

function conversationSwipeKey(item: ChatConversationListItem): string {
  return `${item.role_id}:${item.session_id}`;
}

/** 单行：PC 悬浮出删除；移动端左滑露出删除（互斥由父级 openSwipeKey 控制） */
function ConversationRow({
  item,
  active,
  isDefault,
  deleting,
  isSwipeOpen,
  hasOpenSwipe,
  onSwipeOpen,
  onSwipeClose,
  onSwipeGestureStart,
  onSelect,
  onRequestDelete,
  formatTime,
  deleteLabel,
  affectionTitle,
  affectionFallback,
}: ConversationRowProps) {
  const isDesktop = useIsDesktop();
  const [hovered, setHovered] = useState(false);
  const [wrapWidth, setWrapWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const gestureActiveRef = useRef(false);

  const animateTo = useCallback(
    (to: number) => {
      offsetRef.current = to;
      Animated.spring(translateX, {
        toValue: to,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
    },
    [translateX],
  );

  const closeSwipe = useCallback(() => {
    animateTo(0);
  }, [animateTo]);

  // 父级互斥 / 滚动等导致 isSwipeOpen 变化时，非手势跟手中则同步动画
  useEffect(() => {
    if (isDesktop) return;
    if (gestureActiveRef.current) return;
    if (isSwipeOpen) {
      animateTo(-SWIPE_DELETE_WIDTH);
    } else {
      closeSwipe();
    }
  }, [isSwipeOpen, isDesktop, animateTo, closeSwipe]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_: GestureResponderEvent, g: PanResponderGestureState) =>
          !isDesktop &&
          !deleting &&
          Math.abs(g.dx) > 8 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.25,
        onPanResponderGrant: () => {
          gestureActiveRef.current = true;
          onSwipeGestureStart();
          translateX.stopAnimation((v) => {
            offsetRef.current = typeof v === 'number' ? v : 0;
          });
        },
        onPanResponderMove: (_: GestureResponderEvent, g: PanResponderGestureState) => {
          const next = Math.min(0, Math.max(-SWIPE_DELETE_WIDTH, offsetRef.current + g.dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_: GestureResponderEvent, g: PanResponderGestureState) => {
          const projected = offsetRef.current + g.dx;
          const open = projected < -SWIPE_DELETE_WIDTH / 2 || g.vx < -0.45;
          const to = open ? -SWIPE_DELETE_WIDTH : 0;
          animateTo(to);
          gestureActiveRef.current = false;
          if (open) onSwipeOpen();
          else onSwipeClose();
        },
        onPanResponderTerminate: () => {
          gestureActiveRef.current = false;
          closeSwipe();
          onSwipeClose();
        },
      }),
    [
      animateTo,
      closeSwipe,
      deleting,
      isDesktop,
      onSwipeClose,
      onSwipeGestureStart,
      onSwipeOpen,
      translateX,
    ],
  );

  const hoverHandlers =
    isDesktop && Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  const avatarUri = item.avatar_url ? resolveStaticUrl(item.avatar_url) : null;
  const showHoverDelete = isDesktop && hovered;

  const rowInner = (
    <Pressable
      onPress={() => {
        if (!isDesktop) {
          // 本行已打开：先收回，不跳转（常见 App 行为）
          if (isSwipeOpen || offsetRef.current < -8) {
            onSwipeClose();
            return;
          }
          // 其它行打开：先收回再进入会话
          if (hasOpenSwipe) onSwipeClose();
        }
        onSelect();
      }}
      disabled={deleting}
      style={({ pressed }) => [
        styles.row,
        !isDesktop && styles.swipeRowFront,
        !isDesktop && wrapWidth > 0 ? { width: wrapWidth } : null,
        active && (isDefault ? styles.rowActiveDefault : styles.rowActiveSoviet),
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.avatar, isDefault ? styles.avatarDefault : styles.avatarSoviet]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
        ) : (
          <Text style={[styles.avatarFallback, isDefault && styles.avatarFallbackDefault]}>
            {(item.role_name || '?').slice(0, 1)}
          </Text>
        )}
        {item.verified_real_person ? <VerifiedRealPersonBadge size={12} /> : null}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text
            style={[styles.rowName, isDefault && styles.rowNameDefault]}
            numberOfLines={1}
          >
            {item.role_name}
          </Text>
          {/* 悬浮删除时隐藏时间，避免与右上角删除抢位 */}
          {showHoverDelete ? (
            <View style={styles.rowTimePlaceholder} />
          ) : (
            <Text
              style={[styles.rowTime, isDefault && styles.rowTimeDefault]}
              numberOfLines={1}
            >
              {formatTime(item.last_message_at)}
            </Text>
          )}
        </View>
        {item.bond ? (
          <View
            style={styles.rowBond}
            accessibilityRole="progressbar"
            accessibilityLabel={`${affectionTitle} ${item.bond.bond_label || affectionFallback}`}
          >
            <Ionicons name="heart" size={10} color="#E84B6A" />
            <Text
              style={[styles.rowBondLabel, isDefault && styles.rowBondLabelDefault]}
              numberOfLines={1}
            >
              {item.bond.bond_label || affectionFallback}
            </Text>
            <BondProgressBar
              compact
              progress={bondProgressValue(item.bond)}
              style={styles.rowBondBar}
            />
          </View>
        ) : null}
        <Text
          style={[styles.rowPreview, isDefault && styles.rowPreviewDefault]}
          numberOfLines={1}
        >
          {(item.preview || '').trim() || '—'}
        </Text>
      </View>

      {showHoverDelete ? (
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            if (deleting) return;
            onRequestDelete();
          }}
          hitSlop={8}
          disabled={deleting}
          style={({ pressed }) => [styles.hoverDeleteBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
        >
          {/* 配色对齐 R18 筛选芯片（未激活态） */}
          <Ionicons name="trash-outline" size={16} color={DELETE_ICON_RED} />
        </Pressable>
      ) : null}
    </Pressable>
  );

  if (isDesktop) {
    return <View {...hoverHandlers}>{rowInner}</View>;
  }

  // 方案 2：删除区排在行右侧，靠 overflow 裁剪；左滑整轨移入可视区
  return (
    <View
      style={styles.swipeWrap}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== wrapWidth) setWrapWidth(w);
      }}
    >
      <Animated.View
        style={[styles.swipeTrack, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {rowInner}
        {wrapWidth > 0 ? (
          <Pressable
            onPress={() => {
              if (deleting) return;
              onSwipeClose();
              onRequestDelete();
            }}
            disabled={deleting}
            style={({ pressed }) => [styles.swipeDeleteBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={deleteLabel}
          >
            {/* 配色对齐 R18 筛选芯片（激活态：红底白标） */}
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function ChatAgentHistorySidebar({
  activeRoleId,
  activeSessionId,
  refreshKey = 0,
  collapsed = false,
  overlay = false,
  layout = 'sidebar',
  onToggleCollapsed,
  onSelectConversation,
  onDeletedCurrent,
  variant = 'soviet',
  bond = null,
}: ChatAgentHistorySidebarProps) {
  const { t } = useI18n();
  const isDefault = variant === 'default';
  const isPage = layout === 'page';
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /** Modal 抽屉 / 独立页：顶栏避开刘海与状态栏时间 */
  const topSafePad =
    Platform.OS === 'web'
      ? isPage
        ? 20
        : 12
      : Math.max(insets.top, 12) + 4;

  const [items, setItems] = useState<ChatConversationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ChatConversationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** 移动端：同时只允许一行左滑打开 */
  const [openSwipeKey, setOpenSwipeKey] = useState<string | null>(null);

  const closeOpenSwipe = useCallback(() => {
    setOpenSwipeKey(null);
  }, []);

  const scrollWebProps = useMemo(
    () => themedScrollViewProps(isDefault ? 'default' : 'soviet'),
    [isDefault],
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const resp = await listChatConversations({ page: 1, limit: 50 });
      setItems(resp.data ?? []);
    } catch (err) {
      console.warn('Failed to list chat conversations:', err);
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    closeOpenSwipe();
    void fetchList();
  }, [fetchList, refreshKey, closeOpenSwipe]);

  // 搜索变化时收回已打开的左滑
  useEffect(() => {
    closeOpenSwipe();
  }, [query, closeOpenSwipe]);

  // 移动端抽屉收起时收回左滑
  useEffect(() => {
    if (overlay && collapsed) closeOpenSwipe();
  }, [overlay, collapsed, closeOpenSwipe]);

  // 本地搜索（后端支持 q 后可改为服务端过滤）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.role_name.toLowerCase().includes(q) ||
        (item.preview || '').toLowerCase().includes(q),
    );
  }, [items, query]);

  // 当前会话 bond 实时推送时，同步到对应列表行
  const listData = useMemo(() => {
    if (!bond || !activeRoleId) return filtered;
    return filtered.map((item) =>
      item.role_id === activeRoleId ? { ...item, bond } : item,
    );
  }, [filtered, bond, activeRoleId]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete?.session_id || deleting) return;
    const target = pendingDelete;
    const wasCurrent =
      target.role_id === activeRoleId &&
      (!activeSessionId || target.session_id === activeSessionId);
    setDeleting(true);
    try {
      await deleteChatSession(target.session_id);
      setPendingDelete(null);
      closeOpenSwipe();
      setItems((prev) =>
        prev.filter(
          (it) =>
            !(it.role_id === target.role_id && it.session_id === target.session_id),
        ),
      );
      notifySuccess(t('chat.deleteConversationSuccess'));
      if (wasCurrent && onDeletedCurrent) {
        await onDeletedCurrent();
      }
    } catch (err) {
      notifyError(formatApiError(t, err));
    } finally {
      setDeleting(false);
    }
  }, [
    pendingDelete,
    deleting,
    activeRoleId,
    activeSessionId,
    onDeletedCurrent,
    t,
    closeOpenSwipe,
  ]);

  const panelWidth = overlay
    ? Math.min(CHAT_AGENT_HISTORY_SIDEBAR_WIDTH, Math.max(280, Math.floor(screenWidth * 0.82)))
    : Math.min(
        CHAT_AGENT_HISTORY_SIDEBAR_WIDTH,
        Math.max(260, Math.floor(screenWidth * 0.28)),
      );

  // ─── 桌面内联：宽度伸缩动画 ───
  const widthAnim = useRef(new Animated.Value(collapsed ? COLLAPSED_WIDTH : panelWidth)).current;
  const contentOpacity = useRef(new Animated.Value(collapsed ? 0 : 1)).current;
  const expandBtnOpacity = useRef(new Animated.Value(collapsed ? 1 : 0)).current;
  const [panelInteractive, setPanelInteractive] = useState(!collapsed);

  // ─── 移动端悬浮：从左侧滑入 + 遮罩 ───
  const slideAnim = useRef(new Animated.Value(-panelWidth)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const overlayOpen = overlay && !collapsed;
  const [overlayMounted, setOverlayMounted] = useState(overlayOpen);

  useEffect(() => {
    if (isPage || overlay) return;
    if (!collapsed) setPanelInteractive(true);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: collapsed ? COLLAPSED_WIDTH : panelWidth,
        duration: SIDEBAR_ANIM_MS,
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: collapsed ? 0 : 1,
        duration: collapsed ? 160 : SIDEBAR_ANIM_MS,
        useNativeDriver: false,
      }),
      Animated.timing(expandBtnOpacity, {
        toValue: collapsed ? 1 : 0,
        duration: collapsed ? SIDEBAR_ANIM_MS : 140,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished && collapsed) setPanelInteractive(false);
    });
  }, [collapsed, panelWidth, widthAnim, contentOpacity, expandBtnOpacity, overlay, isPage]);

  useEffect(() => {
    if (isPage || !overlay) return;
    if (overlayOpen) {
      setOverlayMounted(true);
      // 屏外待命；真正滑入在 Modal.onShow，避免首帧闪现
      slideAnim.setValue(-panelWidth);
      backdropAnim.setValue(0);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -panelWidth, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setOverlayMounted(false);
      });
    }
  }, [isPage, overlay, overlayOpen, panelWidth, slideAnim, backdropAnim]);

  /** Modal 显示后：列表从左侧滑入 */
  const onOverlayModalShow = useCallback(() => {
    slideAnim.setValue(-panelWidth);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, backdropAnim, panelWidth]);

  // Web 上 Modal.onShow 可能不可靠，挂载后补一次滑入
  useEffect(() => {
    if (!overlay || !overlayMounted || !overlayOpen) return;
    const raf = requestAnimationFrame(() => onOverlayModalShow());
    return () => cancelAnimationFrame(raf);
  }, [overlay, overlayMounted, overlayOpen, onOverlayModalShow]);

  const { style: scrollStyle, ...scrollRest } = scrollWebProps as {
    style?: object;
    [key: string]: unknown;
  };

  const panelBody = (
    <>
      {/* 顶栏：折叠 + 标题（page 布局无折叠钮） */}
      <View style={[styles.headerRow, isPage && styles.headerRowPage]}>
        {isPage || !onToggleCollapsed ? null : (
          <Pressable
            onPress={onToggleCollapsed}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('chat.collapseSidebar')}
          >
            <Ionicons
              name="albums-outline"
              size={20}
              color={isDefault ? TOKENS.colors.text : COLORS.text.primary}
            />
          </Pressable>
        )}
        <Text
          style={[styles.title, isDefault ? styles.titleDefault : styles.titleSoviet]}
          numberOfLines={1}
        >
          {t('chat.sidebarTitle')}
        </Text>
      </View>

      {/* 搜索 + 当前会话亲密度 */}
      <View style={[styles.searchRow, isPage && styles.searchRowPage]}>
        <View
          style={[
            styles.searchWrap,
            isDefault ? styles.searchWrapDefault : styles.searchWrapSoviet,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={isDefault ? TOKENS.colors.textMuted : COLORS.text.muted}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={closeOpenSwipe}
            placeholder={t('chat.searchChats')}
            placeholderTextColor={isDefault ? TOKENS.colors.textMuted : COLORS.text.muted}
            style={[styles.searchInput, isDefault ? styles.searchInputDefault : styles.searchInputSoviet]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={16}
                color={isDefault ? TOKENS.colors.textMuted : COLORS.text.muted}
              />
            </Pressable>
          ) : null}
        </View>
        {bond && !isPage ? (
          <View
            style={styles.bondMini}
            accessibilityRole="progressbar"
            accessibilityLabel={`${t('freeChat.affectionTitle')} ${bond.bond_label || t('freeChat.affectionFallback')}`}
          >
            <Ionicons name="heart" size={11} color="#E84B6A" />
            <BondProgressBar compact progress={bondProgressValue(bond)} style={styles.bondMiniBar} />
          </View>
        ) : null}
      </View>

      {/* 列表 */}
      {loading && items.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator
            color={isDefault ? TOKENS.colors.accent : COLORS.accent.gold}
          />
        </View>
      ) : loadError ? (
        <View style={styles.centerBox}>
          <Text style={[styles.emptyText, isDefault && styles.emptyTextDefault]}>
            {t('chat.historyLoadFailed')}
          </Text>
          <Pressable onPress={() => void fetchList()} style={styles.retryBtn}>
            <Text style={[styles.retryText, isDefault && styles.retryTextDefault]}>
              {t('chat.retry')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => conversationSwipeKey(item)}
          {...scrollRest}
          style={[styles.list, scrollStyle]}
          contentContainerStyle={
            listData.length === 0 ? styles.listEmptyContent : styles.listContent
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, isDefault && styles.emptyTextDefault]}>
              {t('chat.sidebarEmpty')}
            </Text>
          }
          onScrollBeginDrag={closeOpenSwipe}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const rowKey = conversationSwipeKey(item);
            const active =
              item.role_id === activeRoleId &&
              (!activeSessionId || item.session_id === activeSessionId || !item.session_id);
            return (
              <ConversationRow
                item={item}
                active={active}
                isDefault={isDefault}
                deleting={deleting}
                isSwipeOpen={openSwipeKey === rowKey}
                hasOpenSwipe={openSwipeKey != null}
                onSwipeOpen={() => setOpenSwipeKey(rowKey)}
                onSwipeClose={closeOpenSwipe}
                onSwipeGestureStart={() => {
                  // 拖本行时收回其它已打开行（保留本行跟手）
                  setOpenSwipeKey((prev) => (prev && prev !== rowKey ? null : prev));
                }}
                onSelect={() => onSelectConversation(item)}
                onRequestDelete={() => {
                  if (!item.session_id || deleting) return;
                  setPendingDelete(item);
                }}
                formatTime={(ts) => formatListTime(ts, t)}
                deleteLabel={t('chat.deleteConversation')}
                affectionTitle={t('freeChat.affectionTitle')}
                affectionFallback={t('freeChat.affectionFallback')}
              />
            );
          }}
        />
      )}

      <ThemedGeneralConfirmModal
        visible={pendingDelete != null}
        icon="trash"
        title={t('chat.deleteConversation')}
        subtitle={t('chat.deleteConversationConfirm')}
        subtitleTone="warning"
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('chat.deleteConversation')}
        onCancel={() => {
          if (!deleting) {
            setPendingDelete(null);
            closeOpenSwipe();
          }
        }}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
      />
    </>
  );

  // 独立聊天页：全宽复用同一套列表 UI
  if (isPage) {
    return (
      <View
        style={[
          styles.pageRoot,
          { paddingTop: topSafePad },
          isDefault ? styles.panelDefault : styles.panelSoviet,
        ]}
      >
        {panelBody}
      </View>
    );
  }

  // 移动端：仅悬浮抽屉（展开入口在 FreeChatHeader，避免左侧窄轨挤占聊天区）
  if (overlay) {
    if (!overlayMounted) return null;
    return (
      <Modal
        visible={overlayMounted}
        transparent
        animationType="none"
        onRequestClose={onToggleCollapsed}
        onShow={onOverlayModalShow}
      >
        <View style={styles.overlayRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onToggleCollapsed}>
            <Animated.View style={[styles.overlayBackdrop, { opacity: backdropAnim }]} />
          </Pressable>
          <Animated.View
            style={[
              styles.overlayPanel,
              {
                width: panelWidth,
                paddingTop: topSafePad,
                paddingBottom: Math.max(insets.bottom, 8),
                transform: [{ translateX: slideAnim }],
              },
              isDefault ? styles.panelDefault : styles.panelSoviet,
            ]}
          >
            {panelBody}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // 桌面：内联侧栏 + 宽度动画
  return (
    <Animated.View style={[styles.shell, { width: widthAnim }]}>
      <Animated.View
        style={[
          styles.panel,
          { width: panelWidth, opacity: contentOpacity },
          isDefault ? styles.panelDefault : styles.panelSoviet,
        ]}
        pointerEvents={panelInteractive ? 'auto' : 'none'}
      >
        {panelBody}
      </Animated.View>

      <Animated.View
        style={[styles.collapsedRail, { opacity: expandBtnOpacity }]}
        pointerEvents={collapsed ? 'auto' : 'none'}
      >
        <Pressable
          onPress={onToggleCollapsed}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('chat.expandSidebar')}
        >
          <Ionicons
            name="albums-outline"
            size={22}
            color={isDefault ? TOKENS.colors.text : COLORS.text.primary}
          />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  panel: {
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingBottom: 8,
  },
  /** 独立 /chats 页：全宽复用侧栏内容，无右边线；paddingTop 由 safe inset 动态注入 */
  pageRoot: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 8,
    borderRightWidth: 0,
  },
  panelDefault: {
    backgroundColor: TOKENS.colors.navBg,
    borderRightColor: TOKENS.colors.navBorder,
  },
  panelSoviet: {
    backgroundColor: 'rgba(8, 9, 12, 0.96)',
    borderRightColor: 'rgba(232, 213, 181, 0.18)',
  },
  /** 折叠态仅留展开按钮的窄宽（桌面内联） */
  collapsedRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: COLLAPSED_WIDTH,
    alignItems: 'center',
    paddingTop: 14,
    backgroundColor: 'transparent',
  },
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  /** paddingTop / paddingBottom 由 safe inset 动态注入，避免与状态栏时间重叠 */
  overlayPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 3,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  headerRowPage: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  titleDefault: {
    color: TOKENS.colors.text,
  },
  titleSoviet: {
    color: COLORS.text.primary,
    letterSpacing: 1,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  searchRowPage: {
    marginHorizontal: 16,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 999,
    minWidth: 0,
  },
  searchWrapDefault: {
    backgroundColor: TOKENS.colors.inputBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
  },
  searchWrapSoviet: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 181, 0.22)',
  },
  bondMini: {
    width: 88,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 75, 106, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 75, 106, 0.22)',
  },
  bondMiniBar: {
    flex: 1,
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  searchInputDefault: {
    color: TOKENS.colors.text,
  },
  searchInputSoviet: {
    color: COLORS.text.primary,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.text.muted,
    lineHeight: 20,
  },
  emptyTextDefault: {
    color: TOKENS.colors.textMuted,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 13,
    color: COLORS.accent.gold,
    fontWeight: '600',
  },
  retryTextDefault: {
    color: TOKENS.colors.accent,
  },
  /** 裁剪容器：删除钮默认在可视区右侧之外 */
  swipeWrap: {
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 2,
  },
  /** 内容行 + 删除区横排；左滑整轨 */
  swipeTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  /** 前景行：宽度由 onLayout 像素值写入，flexShrink 防止被压缩 */
  swipeRowFront: {
    flexShrink: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  /** 左滑删除：对齐 R18 芯片激活态（实心 accent） */
  swipeDeleteBtn: {
    width: SWIPE_DELETE_WIDTH,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DELETE_RED,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
    position: 'relative',
  },
  rowActiveDefault: {
    backgroundColor: 'rgba(186, 60, 71, 0.16)',
  },
  rowActiveSoviet: {
    backgroundColor: 'rgba(232, 213, 181, 0.1)',
  },
  /** PC 悬浮删除：对齐 R18 芯片未激活态（浅红底 + 红描边） */
  hoverDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(186, 60, 71, 0.75)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'visible',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDefault: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarSoviet: {
    backgroundColor: 'rgba(232, 213, 181, 0.12)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarFallback: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  avatarFallbackDefault: {
    color: TOKENS.colors.text,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  rowNameDefault: {
    color: TOKENS.colors.text,
  },
  rowTime: {
    fontSize: 11,
    color: COLORS.text.muted,
  },
  rowTimeDefault: {
    color: TOKENS.colors.textMuted,
  },
  /** 悬浮删除时占位，避免布局跳动 */
  rowTimePlaceholder: {
    width: 28,
    height: 14,
  },
  rowBond: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 14,
  },
  rowBondLabel: {
    flexShrink: 1,
    maxWidth: '42%',
    fontSize: 11,
    fontWeight: '600',
    color: '#E84B6A',
  },
  rowBondLabelDefault: {
    color: '#E84B6A',
  },
  rowBondBar: {
    flex: 1,
    minWidth: 36,
  },
  rowPreview: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  rowPreviewDefault: {
    color: TOKENS.colors.textSecondary,
  },
});
