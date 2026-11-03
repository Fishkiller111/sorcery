import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ImageBackground, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { SIDEBAR_WIDTH } from '../../constants/layout';
import { NavItem } from './BottomNav';
import { APP_NAV_ITEMS, isNavItemActive } from '../../constants/appNav';
import { useAuthStore } from '../../stores/authStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { resolveKeyPageFromRoute, trackKeyPageClick } from '../../utils/analytics';

const GOLD = '#c9a86c';
const GOLD_MUTED = '#a8894f';
const RED_ACCENT = '#9e1b1b';
const NAV_INDICATOR_INSET = 7;

interface SideNavProps {
  items?: NavItem[];
}

export function SideNav({ items = APP_NAV_ITEMS }: SideNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../assets/images/ui/shell/sidebar_bg.jpg')}
        style={[StyleSheet.absoluteFill, styles.containerBgClip]}
        imageStyle={styles.containerImage}
        resizeMode="cover"
      />

      <TouchableOpacity
        style={styles.header}
        onPress={() => router.replace('/')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('nav.home')}
      >
        <Image
          source={require('../../../assets/images/ui/shell/sidebar_logo_emblem.png')}
          style={styles.logoEmblem}
          resizeMode="contain"
        />
        <Text style={styles.logoWordmark}>SOULTHREAD</Text>
        <View style={styles.headerDivider} />
      </TouchableOpacity>

      <View style={styles.items}>
        {items.map((item, index) => {
          const active = isNavItemActive(pathname, item.route);
          return (
            <React.Fragment key={item.key}>
              {index > 0 ? <View style={styles.navDivider} /> : null}
              <View style={[styles.navSection, active && styles.navSectionActive]}>
                {active ? (
                  <View style={styles.activeIndicatorSlot}>
                    <Image
                      source={require('../../../assets/images/ui/shell/sidebar_active_indicator.png')}
                      style={styles.activeIndicatorImage}
                      resizeMode="stretch"
                    />
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => {
                    if (item.requireAuth && !requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) {
                      return;
                    }
                    const keyPage = resolveKeyPageFromRoute(item.route);
                    if (keyPage) {
                      trackKeyPageClick(keyPage, item.route, 'side_nav');
                    }
                    router.replace(item.route as never);
                  }}
                  activeOpacity={0.85}
                >
                  {item.icon ? (
                    <Image
                      source={active && item.activeIcon ? item.activeIcon : item.icon}
                      style={[styles.icon, active && styles.activeIcon]}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons
                      name={active ? item.activeIonicon ?? item.ionicon : item.ionicon}
                      size={26}
                      color={active ? RED_ACCENT : GOLD_MUTED}
                      style={styles.iconIon}
                    />
                  )}
                  <Text style={[styles.label, active && styles.activeLabel]} numberOfLines={1}>
                    {t(item.labelKey)}
                  </Text>
                </TouchableOpacity>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Image
          source={require('../../../assets/images/ui/shell/sidebar_footer_motto.png')}
          style={styles.footerMotto}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.bg.primary,
    borderRightWidth: 1,
    borderRightColor: 'rgba(216, 208, 192, 0.14)',
    paddingTop: 24,
    zIndex: 50,
  },
  containerBgClip: {
    overflow: 'hidden',
  },
  containerImage: {
    opacity: 0.92,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    zIndex: 1,
    paddingHorizontal: 22,
  },
  logoEmblem: {
    width: 96,
    aspectRatio: 96 / 172,
    marginBottom: 10,
  },
  logoWordmark: Typo(
    {
      color: GOLD,
      fontSize: 15,
      letterSpacing: 6,
      textTransform: 'uppercase',
      marginBottom: 14,
    },
    'display',
  ),
  headerDivider: {
    width: '90%',
    height: 1,
    backgroundColor: 'rgba(201, 168, 108, 0.22)',
  },
  items: {
    flex: 1,
    zIndex: 2,
    paddingTop: 2,
  },
  navDivider: {
    height: 1,
    marginHorizontal: 24,
    backgroundColor: 'rgba(201, 168, 108, 0.16)',
  },
  navSection: {
    position: 'relative',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  navSectionActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.4)' } as object)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 4,
        }),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 28,
    paddingRight: 18,
    minHeight: 48,
  },
  itemActive: {
    paddingLeft: 30,
  },
  activeIndicatorSlot: {
    position: 'absolute',
    left: NAV_INDICATOR_INSET,
    top: 0,
    bottom: -1,
    width: 8,
    zIndex: 3,
    overflow: 'hidden',
  },
  activeIndicatorImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  icon: {
    width: 44,
    height: 44,
    marginRight: 14,
    opacity: 0.88,
  },
  iconIon: {
    width: 44,
    marginRight: 14,
  },
  activeIcon: {
    opacity: 1,
  },
  label: Typo(
    {
      color: GOLD_MUTED,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    'sans',
  ),
  activeLabel: {
    color: RED_ACCENT,
  },
  footer: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 24,
    zIndex: 1,
  },
  footerMotto: {
    width: '100%',
    height: 88,
  },
});
