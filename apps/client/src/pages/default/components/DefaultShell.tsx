import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { useMobileBottomNavPadding } from '../../../hooks/useMobileSafeAreaPadding';
import { useI18n } from '../../../i18n/I18nContext';
import { isNavItemActive } from '../../../constants/appNav';
import type { ModernNavItem } from '../../../constants/appNav';
import { DEFAULT_APP_NAV_ITEMS, DEFAULT_APP_NAV_ITEMS_MOBILE } from '../../../constants/defaultAppNav';
import { MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT } from '../../../constants/layout';
import { MARKETING_SITE_URL } from '../../../constants/social';
import { useAuthStore } from '../../../stores/authStore';
import { useAnnouncementUnreadStore } from '../../../stores/announcementUnreadStore';
import { requireLoginForAction } from '../../../utils/requireLogin';
import { Typo } from '../../../theme/typography';
import { themedScrollViewProps } from '../../../theme/webScrollbar';
import { SocialLinks } from '../../../components/common/SocialLinks';
import { DefaultSoulthreadLogo } from './DefaultSoulthreadLogo';
import { DefaultHomeBackground } from './DefaultHomeBackground';
import { DefaultSidebarNavItem } from './DefaultSidebarNavItem';
import { DefaultCreateEntryModal } from './DefaultCreateEntryModal';
import { TOKENS } from '../theme/tokens';

/** Below this viewport height, sidebar vertical spacing compresses so footer stays visible. */
const SIDEBAR_COMPACT_HEIGHT = 820;

/** Compact bottom nav — icons + Create FAB tuned to take less vertical space. */
const NAV_ICON_SIZE = 44;
/** Selected icon lifts above the nav top edge (home / world / social / profile share this). */
const NAV_ICON_ACTIVE_LIFT = -8;
/** Idle icons stay inside the bar, snug to the top border. */
const NAV_ICON_IDLE_TOP = 1;
/**
 * Create FAB — sits slightly above the nav top edge; lift tuned so
 * the disk sits closer to the "Create AGENT" label (less empty gap).
 */
const CREATE_FAB_SIZE = 56;
const CREATE_FAB_LIFT = -16;

type DefaultShellProps = {
  children: React.ReactNode;
  scrollable?: boolean;
};

function DefaultSidebarNav({
  items,
  onCreatePress,
}: {
  items: ModernNavItem[];
  onCreatePress: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < SIDEBAR_COMPACT_HEIGHT;
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const profileUnread = useAnnouncementUnreadStore((s) => s.unreadCount);

  const onNavPress = (item: ModernNavItem) => {
    if (item.key === 'create') {
      onCreatePress();
      return;
    }
    if (item.requireAuth && !requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) {
      return;
    }
    router.replace(item.route as never);
  };

  const openMarketingSite = useCallback(async () => {
    const supported = await Linking.canOpenURL(MARKETING_SITE_URL);
    if (supported) {
      await Linking.openURL(MARKETING_SITE_URL);
    }
  }, []);
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  return (
    <View style={styles.sidebar}>
      <ScrollView
        {...scrollWebProps}
        style={[styles.sidebarScroll, scrollWebProps.style]}
        contentContainerStyle={[styles.sidebarInner, compact && styles.sidebarInnerCompact]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity
          style={[styles.brand, compact && styles.brandCompact]}
          onPress={() => router.replace('/')}
          activeOpacity={0.85}
        >
          <DefaultSoulthreadLogo size={compact ? 72 : 104} />
        </TouchableOpacity>

        <View style={[styles.navList, compact && styles.navListCompact]}>
          {items.map((item) => {
            const active = isNavItemActive(pathname, item.route);
            const showUnread = item.key === 'profile' && profileUnread > 0;
            return (
              <DefaultSidebarNavItem
                key={item.key}
                label={t(item.labelKey)}
                active={active}
                showUnreadDot={showUnread}
                onPress={() => onNavPress(item)}
              />
            );
          })}
        </View>

        <View style={[styles.sidebarFooter, compact && styles.sidebarFooterCompact]}>
          <SocialLinks
            size={compact ? 18 : 20}
            color="rgba(255, 255, 255, 0.55)"
            style={styles.sidebarSocial}
          />
          {MARKETING_SITE_URL ? <Pressable
            onPress={openMarketingSite}
            accessibilityRole="link"
            accessibilityLabel={`${t('social.marketingSiteTitle')}. ${MARKETING_SITE_URL}`}
            style={({ pressed }) => [
              styles.marketingSiteLink,
              compact && styles.marketingSiteLinkCompact,
              pressed && styles.marketingSiteLinkPressed,
            ]}
          >
            <Text style={styles.marketingSiteTitle}>{t('social.marketingSiteTitle')}</Text>
            <Text style={styles.marketingSiteBody}>{t('social.marketingSiteBody')}</Text>
            <View style={styles.marketingSiteUrlRow}>
              <Text style={styles.marketingSiteUrl}>{MARKETING_SITE_URL}</Text>
              <Ionicons name="arrow-forward" size={12} color={TOKENS.colors.accent} />
            </View>
          </Pressable> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function DefaultBottomNav({
  items,
  onCreatePress,
}: {
  items: ModernNavItem[];
  onCreatePress: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const profileUnread = useAnnouncementUnreadStore((s) => s.unreadCount);
  const paddingBottom = useMobileBottomNavPadding(10);

  const onNavPress = (item: ModernNavItem) => {
    if (item.key === 'create') {
      onCreatePress();
      return;
    }
    if (item.requireAuth && !requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) {
      return;
    }
    router.replace(item.route as never);
  };

  return (
    <View style={[styles.bottomNav, { paddingBottom }]}>
      {/* Figma Vector nav bg: dual linear-gradient stack */}
      <LinearGradient
        colors={['rgba(115, 115, 115, 0.01)', 'rgba(91, 95, 142, 0.068)']}
        locations={[0.3029, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.05)']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {items.map((item) => {
        const active = isNavItemActive(pathname, item.route);
        const isCreate = item.key === 'create';
        const showUnread = item.key === 'profile' && profileUnread > 0;

        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.bottomNavItem,
              isCreate && styles.bottomNavItemCreate,
              active && !isCreate && styles.bottomNavItemActive,
            ]}
            onPress={() => onNavPress(item)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {isCreate ? (
              item.fabIcon ? (
                <Image
                  source={item.fabIcon}
                  style={styles.createFabImage}
                  contentFit="contain"
                  recyclingKey="nav-create-fab-v4"
                />
              ) : (
                <Ionicons name="add" size={28} color="#F3F4F7" style={styles.createFabImage} />
              )
            ) : (
              <View
                style={[
                  styles.navIconSlot,
                  active ? styles.navIconSlotActive : styles.navIconSlotIdle,
                ]}
              >
                {item.icon ? (
                  <Image
                    source={active && item.activeIcon ? item.activeIcon : item.icon}
                    style={styles.navIconImage}
                    contentFit="contain"
                    recyclingKey={`${item.key}-${active ? 'on' : 'off'}`}
                  />
                ) : (
                  <Ionicons
                    name={active ? item.activeIonicon : item.ionicon}
                    size={34}
                    color={active ? TOKENS.colors.text : '#676B76'}
                  />
                )}
                {showUnread ? <View style={styles.navUnreadDot} /> : null}
              </View>
            )}
            {/* FAB is absolute; spacer pushes label to same baseline as other tabs */}
            <View style={styles.navLabelSpacer} />
            <Text
              style={[
                styles.bottomNavLabel,
                active && styles.bottomNavLabelActive,
                isCreate && styles.bottomNavLabelCreate,
              ]}
              numberOfLines={1}
            >
              {t(item.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DefaultShell({ children, scrollable = true }: DefaultShellProps) {
  const isDesktop = useIsDesktop();
  const sidebarWidth = TOKENS.layout.sidebarWidth;
  /** Absolute glass nav overlays content — scroll pages need clearance to reach the end. */
  const scrollBottomClearance = useMobileBottomNavPadding(MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const { lang } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const refreshUnread = useAnnouncementUnreadStore((s) => s.refresh);
  const clearUnread = useAnnouncementUnreadStore((s) => s.clear);

  useEffect(() => {
    if (!isRestored) return;
    if (!isLoggedIn) {
      clearUnread();
      return;
    }
    void refreshUnread(lang);
  }, [isRestored, isLoggedIn, lang, refreshUnread, clearUnread]);

  useFocusEffect(
    useCallback(() => {
      if (!isRestored || !isLoggedIn) return;
      void refreshUnread(lang);
    }, [isRestored, isLoggedIn, lang, refreshUnread]),
  );

  const openCreateModal = () => {
    setCreateModalVisible(true);
  };
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  const body = scrollable ? (
    <ScrollView
      {...scrollWebProps}
      style={[styles.scroll, scrollWebProps.style]}
      contentContainerStyle={[
        styles.scrollContent,
        !isDesktop && { paddingBottom: scrollBottomClearance },
        isDesktop && { marginLeft: sidebarWidth },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.static, isDesktop && { marginLeft: sidebarWidth }]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <DefaultHomeBackground sidebarOverlayWidth={isDesktop ? sidebarWidth : 0} />
      {isDesktop ? <DefaultSidebarNav items={DEFAULT_APP_NAV_ITEMS} onCreatePress={openCreateModal} /> : null}
      {/* Mobile: body fills screen so art can extend under the glass nav (no opaque strip). */}
      <View style={[styles.body, !isDesktop && styles.bodyUnderNav]}>{body}</View>
      {!isDesktop ? (
        <DefaultBottomNav items={DEFAULT_APP_NAV_ITEMS_MOBILE} onCreatePress={openCreateModal} />
      ) : null}
      <DefaultCreateEntryModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.colors.bg,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  /** Full-bleed under floating bottom nav — avoids solid gap above the glass bar. */
  bodyUnderNav: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  static: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    ...(Platform.OS === 'web'
      ? ({
          display: 'flex',
          flexDirection: 'column',
        } as object)
      : {}),
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: TOKENS.layout.sidebarWidth,
    zIndex: 50,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarInner: {
    flexGrow: 1,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sidebarInnerCompact: {
    paddingTop: 28,
    paddingBottom: 16,
  },
  brand: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 52,
    paddingHorizontal: 4,
  },
  brandCompact: {
    marginBottom: 24,
  },
  navList: {
    gap: 24,
    paddingLeft: 10,
    alignSelf: 'stretch',
    flexGrow: 1,
  },
  navListCompact: {
    gap: 14,
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: 24,
    alignSelf: 'stretch',
    gap: 14,
    paddingLeft: 10,
  },
  sidebarFooterCompact: {
    paddingTop: 16,
    gap: 10,
  },
  sidebarSocial: {
    justifyContent: 'flex-start',
    gap: 16,
  },
  marketingSiteLink: {
    alignSelf: 'stretch',
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
    gap: 4,
  },
  marketingSiteLinkCompact: {
    paddingVertical: 10,
  },
  marketingSiteLinkPressed: {
    opacity: 0.85,
    backgroundColor: 'rgba(186, 60, 71, 0.16)',
    borderColor: 'rgba(186, 60, 71, 0.42)',
  },
  marketingSiteTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    'sans',
  ),
  marketingSiteBody: Typo(
    {
      color: TOKENS.colors.navTextInactive,
      fontSize: 11,
      lineHeight: 15,
    },
    'sans',
  ),
  marketingSiteUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  marketingSiteUrl: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    'sans',
  ),
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'stretch',
    /** Frosted glass over content — opaque enough that labels stay readable. */
    backgroundColor: 'rgba(8, 10, 15, 0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 0,
    paddingHorizontal: 2,
    zIndex: 50,
    overflow: 'visible',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as object)
      : {}),
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 52,
    paddingTop: 0,
    paddingBottom: 2,
    zIndex: 1,
    overflow: 'visible',
  },
  bottomNavItemActive: {
    zIndex: 2,
  },
  bottomNavItemCreate: {
    zIndex: 3,
    position: 'relative',
    overflow: 'visible',
  },
  navIconSlot: {
    width: NAV_ICON_SIZE + 4,
    height: NAV_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  /** Idle: fully inside bar, snug under the top border. */
  navIconSlotIdle: {
    marginTop: NAV_ICON_IDLE_TOP,
  },
  /** Active: lift past the top border for a slight “pop out”. */
  navIconSlotActive: {
    marginTop: NAV_ICON_ACTIVE_LIFT,
  },
  navIconImage: {
    width: NAV_ICON_SIZE,
    height: NAV_ICON_SIZE,
    backgroundColor: 'transparent',
  },
  navUnreadDot: {
    position: 'absolute',
    top: 2,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.accent,
    borderWidth: 1.5,
    borderColor: 'rgba(8, 10, 15, 0.92)',
  },
  navLabelSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 2,
  },
  createFabImage: {
    position: 'absolute',
    top: CREATE_FAB_LIFT,
    alignSelf: 'center',
    width: CREATE_FAB_SIZE,
    height: CREATE_FAB_SIZE,
    backgroundColor: 'transparent',
    zIndex: 4,
  },
  bottomNavLabel: Typo(
    {
      color: '#676B76',
      fontSize: 9,
      fontWeight: '500',
      letterSpacing: 0.15,
      textAlign: 'center',
      lineHeight: 11,
    },
    'sans',
  ),
  bottomNavLabelActive: {
    color: '#F3F4F7',
  },
  bottomNavLabelCreate: Typo(
    {
      /** Match other tab label metrics so baselines align */
      fontSize: 9,
      fontWeight: '500',
      letterSpacing: 0.15,
      color: '#777B86',
      lineHeight: 11,
    },
    'sans',
  ),
});
