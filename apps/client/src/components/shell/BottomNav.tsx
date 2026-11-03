import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { isNavItemActive } from '../../constants/appNav';
import { useAuthStore } from '../../stores/authStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { resolveKeyPageFromRoute, trackKeyPageClick } from '../../utils/analytics';
import { useMobileBottomNavPadding } from '../../hooks/useMobileSafeAreaPadding';

export interface NavItem {
  key: string;
  labelKey: string;
  route: string;
  icon?: ImageSourcePropType;
  activeIcon?: ImageSourcePropType;
  ionicon?: React.ComponentProps<typeof Ionicons>['name'];
  activeIonicon?: React.ComponentProps<typeof Ionicons>['name'];
  replace?: boolean;
  requireAuth?: boolean;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const paddingBottom = useMobileBottomNavPadding(22);

  return (
    <View style={[styles.container, { paddingBottom }]}>
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.route);
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.item}
            onPress={() => {
              if (item.requireAuth && !requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) {
                return;
              }
              const keyPage = resolveKeyPageFromRoute(item.route);
              if (keyPage) {
                trackKeyPageClick(keyPage, item.route, 'bottom_nav');
              }
              // Tab-style switch: replace + no stack slide (see Stack.Screen animation: 'none').
              router.replace(item.route as never);
            }}
            activeOpacity={0.7}
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
                size={20}
                color={active ? COLORS.soviet.stainLight : COLORS.text.muted}
              />
            )}
            <Text style={[styles.label, active && styles.activeLabel]} numberOfLines={1}>
              {t(item.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 11, 15, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(216, 208, 192, 0.12)',
    paddingTop: 6,
    paddingHorizontal: 4,
    zIndex: 50,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 2,
  },
  icon: {
    width: 26,
    height: 26,
    opacity: 0.55,
  },
  activeIcon: {
    opacity: 1,
    shadowColor: COLORS.soviet.stainLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  label: Typo(
    {
      color: COLORS.text.muted,
      fontSize: 9,
      marginTop: 3,
      fontWeight: '500',
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    'sans',
  ),
  activeLabel: {
    color: COLORS.soviet.stainLight,
  },
});
