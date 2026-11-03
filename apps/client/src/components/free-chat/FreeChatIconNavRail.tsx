import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  type ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { TOKENS } from '../../pages/default/theme/tokens';
import { DefaultSoulthreadLogo } from '../../pages/default/components/DefaultSoulthreadLogo';
import { DEFAULT_APP_NAV_ITEMS, DEFAULT_APP_NAV_ITEMS_MOBILE } from '../../constants/defaultAppNav';
import { APP_NAV_ITEMS, isNavItemActive, type ModernNavItem } from '../../constants/appNav';
import type { NavItem } from '../shell/BottomNav';
import { useAuthStore } from '../../stores/authStore';
import { useAnnouncementUnreadStore } from '../../stores/announcementUnreadStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import type { FreeChatUiVariant } from './freeChatUi';
import { useIsDesktop } from '../../hooks/useIsDesktop';

/** 免费聊天页左侧图标轨宽度（仅图标） */
export const FREE_CHAT_ICON_NAV_WIDTH = 64;
/** 展开文字标签后的轨宽 */
export const FREE_CHAT_ICON_NAV_EXPANDED_WIDTH = 148;

const ICON_SIZE = 26;
const RAIL_ANIM_MS = 260;

type RailItem = {
  key: string;
  labelKey: string;
  route: string;
  requireAuth?: boolean;
  icon?: ImageSourcePropType;
  activeIcon?: ImageSourcePropType;
  ionicon?: React.ComponentProps<typeof Ionicons>['name'];
  activeIonicon?: React.ComponentProps<typeof Ionicons>['name'];
};

/** 全局页签（不含创建 Agent）；移动端不带 Chat */
function toRailItems(variant: FreeChatUiVariant, isDesktop: boolean): RailItem[] {
  const source =
    variant === 'default'
      ? ((isDesktop ? DEFAULT_APP_NAV_ITEMS : DEFAULT_APP_NAV_ITEMS_MOBILE) as ModernNavItem[])
      : (APP_NAV_ITEMS as NavItem[]);

  return source
    .filter((item) => item.key !== 'create')
    .map((item) => ({
      key: item.key,
      labelKey: item.labelKey,
      route: item.route,
      requireAuth: item.requireAuth,
      icon: item.icon,
      activeIcon: 'activeIcon' in item ? item.activeIcon : undefined,
      ionicon: item.ionicon,
      activeIonicon: item.activeIonicon,
    }));
}

type FreeChatIconNavRailProps = {
  variant?: FreeChatUiVariant;
  /** 是否展开显示导航文字标签 */
  railExpanded?: boolean;
  /** 展开 / 收起导航文字 */
  onToggleRailExpanded?: () => void;
};

export function FreeChatIconNavRail({
  variant = 'default',
  railExpanded = false,
  onToggleRailExpanded,
}: FreeChatIconNavRailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const isDefault = variant === 'default';
  const isDesktop = useIsDesktop();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const profileUnread = useAnnouncementUnreadStore((s) => s.unreadCount);
  const items = toRailItems(variant, isDesktop);

  const accent = isDefault ? TOKENS.colors.accent : COLORS.soviet.stainLight;
  const idleColor = isDefault ? TOKENS.colors.navTextInactive : COLORS.text.muted;
  const iconColor = isDefault ? TOKENS.colors.text : COLORS.text.primary;

  // 宽度 + 文字透明度动画
  const widthAnim = useRef(
    new Animated.Value(railExpanded ? FREE_CHAT_ICON_NAV_EXPANDED_WIDTH : FREE_CHAT_ICON_NAV_WIDTH),
  ).current;
  const labelOpacity = useRef(new Animated.Value(railExpanded ? 1 : 0)).current;
  const [layoutExpanded, setLayoutExpanded] = useState(railExpanded);

  useEffect(() => {
    if (railExpanded) setLayoutExpanded(true);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: railExpanded ? FREE_CHAT_ICON_NAV_EXPANDED_WIDTH : FREE_CHAT_ICON_NAV_WIDTH,
        duration: RAIL_ANIM_MS,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: railExpanded ? 1 : 0,
        duration: railExpanded ? RAIL_ANIM_MS : 160,
        // 与宽度动画同驱，避免 parallel 混用 native/js driver
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished && !railExpanded) setLayoutExpanded(false);
    });
  }, [railExpanded, widthAnim, labelOpacity]);

  const onNavPress = (item: RailItem) => {
    if (item.requireAuth && !requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) {
      return;
    }
    router.replace(item.route as never);
  };

  return (
    <Animated.View
      style={[
        styles.rail,
        { width: widthAnim },
        isDefault ? styles.railDefault : styles.railSoviet,
      ]}
    >
      {/* 顶部品牌 */}
      <Pressable
        style={styles.brand}
        onPress={() => router.replace('/')}
        accessibilityRole="button"
        accessibilityLabel={t('nav.home')}
      >
        {isDefault ? (
          <DefaultSoulthreadLogo size={36} showWordmark={false} />
        ) : (
          <Ionicons name="diamond-outline" size={22} color={accent} />
        )}
      </Pressable>

      <View style={styles.navList}>
        {/* 展开 / 收起导航文字（与聊天列表互斥，由父级协调） */}
        {onToggleRailExpanded ? (
          <RailActionItem
            label={railExpanded ? t('chat.collapseNavRail') : t('chat.expandNavRail')}
            active={railExpanded}
            accent={accent}
            isDefault={isDefault}
            expanded={layoutExpanded}
            labelOpacity={labelOpacity}
            onPress={onToggleRailExpanded}
          >
            <Ionicons
              name={railExpanded ? 'chevron-back-outline' : 'menu-outline'}
              size={ICON_SIZE}
              color={railExpanded ? accent : iconColor}
            />
          </RailActionItem>
        ) : null}

        {/* 其余全局导航（无创建） */}
        {items.map((item) => {
          const active = isNavItemActive(pathname, item.route);
          const showUnread = item.key === 'profile' && profileUnread > 0;
          return (
            <RailNavItem
              key={item.key}
              label={t(item.labelKey)}
              active={active}
              showUnreadDot={showUnread}
              icon={item.icon}
              activeIcon={item.activeIcon}
              ionicon={item.ionicon}
              activeIonicon={item.activeIonicon}
              accent={accent}
              idleColor={idleColor}
              isDefault={isDefault}
              expanded={layoutExpanded}
              labelOpacity={labelOpacity}
              onPress={() => onNavPress(item)}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

type RailActionItemProps = {
  label: string;
  active: boolean;
  accent: string;
  isDefault: boolean;
  expanded: boolean;
  labelOpacity: Animated.Value;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

function RailActionItem({
  label,
  active,
  accent,
  isDefault,
  expanded,
  labelOpacity,
  onPress,
  disabled,
  children,
}: RailActionItemProps) {
  const [hovered, setHovered] = useState(false);
  const hoverHandlers =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  return (
    <Pressable
      {...hoverHandlers}
      style={[
        styles.navItem,
        expanded && styles.navItemExpanded,
        active && (isDefault ? styles.navItemActiveDefault : styles.navItemActiveSoviet),
        (hovered || disabled) && styles.navItemDim,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {/* 展开/收起导航：不加左侧方点，避免与文字抢视觉 */}
      <View style={styles.iconSlot}>{children}</View>
      {expanded ? (
        <Animated.Text
          style={[
            styles.navLabel,
            isDefault ? styles.navLabelDefault : styles.navLabelSoviet,
            active && { color: accent },
            { opacity: labelOpacity },
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

type RailNavItemProps = {
  label: string;
  active: boolean;
  showUnreadDot: boolean;
  icon?: ImageSourcePropType;
  activeIcon?: ImageSourcePropType;
  ionicon?: React.ComponentProps<typeof Ionicons>['name'];
  activeIonicon?: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  idleColor: string;
  isDefault: boolean;
  expanded: boolean;
  labelOpacity: Animated.Value;
  onPress: () => void;
};

function RailNavItem({
  label,
  active,
  showUnreadDot,
  icon,
  activeIcon,
  ionicon,
  activeIonicon,
  accent,
  idleColor,
  isDefault,
  expanded,
  labelOpacity,
  onPress,
}: RailNavItemProps) {
  const [hovered, setHovered] = useState(false);
  const highlighted = active || hovered;

  const hoverHandlers =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  return (
    <Pressable
      {...hoverHandlers}
      style={[
        styles.navItem,
        expanded && styles.navItemExpanded,
        active && (isDefault ? styles.navItemActiveDefault : styles.navItemActiveSoviet),
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {active ? <View style={[styles.activeDiamond, { backgroundColor: accent }]} /> : null}
      <View style={styles.iconSlot}>
        {icon ? (
          <Image
            source={active && activeIcon ? activeIcon : icon}
            style={[styles.iconImage, highlighted && styles.iconImageOn]}
            contentFit="contain"
            recyclingKey={`free-chat-nav-${label}-${active ? 'on' : 'off'}`}
          />
        ) : (
          <Ionicons
            name={active ? activeIonicon ?? ionicon : ionicon}
            size={ICON_SIZE}
            color={highlighted ? accent : idleColor}
          />
        )}
        {showUnreadDot ? (
          <View style={[styles.unreadDot, { backgroundColor: accent }]} />
        ) : null}
      </View>
      {expanded ? (
        <Animated.Text
          style={[
            styles.navLabel,
            isDefault ? styles.navLabelDefault : styles.navLabelSoviet,
            highlighted && { color: accent },
            { opacity: labelOpacity },
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexShrink: 0,
    height: '100%',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  railDefault: {
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
    borderRightColor: TOKENS.colors.navBorder,
  },
  railSoviet: {
    backgroundColor: 'rgba(10, 11, 15, 0.88)',
    borderRightColor: 'rgba(232, 213, 181, 0.18)',
  },
  brand: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  navList: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
    gap: 4,
  },
  navItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 8,
    position: 'relative',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  navItemExpanded: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    gap: 10,
  },
  navItemDim: {
    opacity: 0.85,
  },
  navItemActiveDefault: {
    backgroundColor: 'rgba(186, 60, 71, 0.12)',
  },
  navItemActiveSoviet: {
    backgroundColor: 'rgba(158, 27, 27, 0.18)',
  },
  activeDiamond: {
    position: 'absolute',
    left: 6,
    width: 6,
    height: 6,
    transform: [{ rotate: '45deg' }],
  },
  iconSlot: {
    width: ICON_SIZE + 10,
    height: ICON_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconImage: {
    width: ICON_SIZE + 4,
    height: ICON_SIZE + 4,
    opacity: 0.72,
  },
  iconImageOn: {
    opacity: 1,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 0,
  },
  navLabelDefault: {
    color: TOKENS.colors.text,
  },
  navLabelSoviet: {
    color: COLORS.text.primary,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.bg,
  },
});
