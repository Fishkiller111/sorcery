import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../../../i18n/I18nContext';
import { typo } from '../typography';
import { TOKENS } from '../tokens';

const LINKS = [
  { key: 'home', labelKey: 'nav.home', route: '/' },
  { key: 'profile', labelKey: 'nav.profile', route: '/profile' },
  { key: 'settings', labelKey: 'settings.title', route: '/settings' },
] as const;

function isActive(pathname: string, route: string): boolean {
  if (route === '/') return pathname === '/' || pathname === '';
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function ModernSubNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {LINKS.map((link) => {
        const active = isActive(pathname, link.route);
        return (
          <Pressable
            key={link.key}
            onPress={() => router.push(link.route as never)}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{t(link.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TOKENS.modePage.line,
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 40,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemPressed: {
    opacity: 0.7,
  },
  label: typo(
    {
      color: TOKENS.modePage.textSubtle,
      fontSize: 10,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  labelActive: {
    color: TOKENS.modePage.text,
  },
});
