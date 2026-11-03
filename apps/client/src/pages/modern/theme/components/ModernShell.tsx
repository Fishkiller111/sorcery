import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsDesktop } from '../../../../hooks/useIsDesktop';
import { useMobileBottomNavPadding } from '../../../../hooks/useMobileSafeAreaPadding';
import { useI18n } from '../../../../i18n/I18nContext';
import { SIDEBAR_WIDTH } from '../../../../constants/layout';
import { MODERN_APP_NAV_ITEMS, isNavItemActive, type ModernNavItem } from '../../../../constants/appNav';
import { useAuthStore } from '../../../../stores/authStore';
import { requireLoginForAction } from '../../../../utils/requireLogin';
import { resolveKeyPageFromRoute, trackKeyPageClick } from '../../../../utils/analytics';
import { typo } from '../typography';
import { TOKENS } from '../tokens';

export type { ModernNavItem };

function ModernNavBar({ items, vertical }: { items: ModernNavItem[]; vertical?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const bottomPadding = useMobileBottomNavPadding(22);

  return (
    <View style={[styles.nav, vertical && styles.navVertical, !vertical && { paddingBottom: bottomPadding }]}>
      {vertical ? (
        <TouchableOpacity
          style={styles.brand}
          onPress={() => router.replace('/')}
          activeOpacity={0.85}
        >
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>Soulthread</Text>
        </TouchableOpacity>
      ) : null}
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.route);
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, vertical && styles.navItemVertical, active && styles.navItemActive]}
            onPress={() => {
              if (item.requireAuth && !requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) {
                return;
              }
              const keyPage = resolveKeyPageFromRoute(item.route);
              if (keyPage) {
                trackKeyPageClick(keyPage, item.route, 'modern_nav');
              }
              router.replace(item.route as never);
            }}
            activeOpacity={0.75}
          >
            <Ionicons
              name={active ? item.activeIonicon : item.ionicon}
              size={vertical ? 22 : 18}
              color={active ? TOKENS.colors.accent : TOKENS.colors.textMuted}
            />
            <Text
              style={[styles.navLabel, vertical && styles.navLabelVertical, active && styles.navLabelActive]}
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

type ModernShellProps = {
  children: React.ReactNode;
  scrollable?: boolean;
};

export function ModernShell({ children, scrollable = true }: ModernShellProps) {
  const isDesktop = useIsDesktop();

  const body = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.static, isDesktop && styles.staticDesktop]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {isDesktop ? <ModernNavBar items={MODERN_APP_NAV_ITEMS} vertical /> : null}
      <View style={styles.body}>{body}</View>
      {!isDesktop ? <ModernNavBar items={MODERN_APP_NAV_ITEMS} /> : null}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentDesktop: {
    marginLeft: SIDEBAR_WIDTH,
    paddingBottom: 32,
  },
  static: {
    flex: 1,
  },
  staticDesktop: {
    marginLeft: SIDEBAR_WIDTH,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.navBg,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.navBorder,
    paddingTop: 6,
    paddingHorizontal: 4,
    zIndex: 50,
  },
  navVertical: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    borderTopWidth: 0,
    borderRightWidth: 1,
    borderRightColor: TOKENS.colors.navBorder,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 14,
    gap: 2,
    zIndex: 50,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.accent,
  },
  brandText: typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    'sans',
  ),
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 3,
    paddingHorizontal: 2,
  },
  navItemVertical: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: TOKENS.radius.md,
    minHeight: 46,
  },
  navItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  navLabel: typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 9,
      fontWeight: '500',
      textAlign: 'center',
    },
    'sans',
  ),
  navLabelVertical: {
    fontSize: 13,
    textAlign: 'left',
    flexShrink: 1,
  },
  navLabelActive: {
    color: TOKENS.colors.accent,
  },
});
