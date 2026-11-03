import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useMobileBottomNavPadding } from '../../hooks/useMobileSafeAreaPadding';
import { MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT } from '../../constants/layout';
import { SUPPORT_BOT_URL, SUPPORT_BOT_USERNAME } from '../../constants/social';
import { Typo } from '../../theme/typography';
import { openTelegramLink } from '../../utils/openTelegramLink';

export type ProfileSupportFabTone = 'default' | 'modern' | 'soviet';

const SIZE = 52;

export function ProfileSupportFab({ tone = 'default' }: { tone?: ProfileSupportFabTone }) {
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const navClearance = useMobileBottomNavPadding(MOBILE_BOTTOM_NAV_CLEARANCE_DEFAULT);
  const [hovered, setHovered] = useState(false);
  const bottom = isDesktop ? 28 : navClearance + 12;
  const palette = PALETTE[tone];

  // 未配置客服账号时不显示无效入口。
  if (!SUPPORT_BOT_URL) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        { bottom, right: isDesktop ? 24 : 16 },
        Platform.OS === 'web' ? styles.anchorFixed : null,
      ]}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('profile.openSupport')}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={() => {
          void openTelegramLink(SUPPORT_BOT_URL);
        }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: palette.bg, borderColor: palette.border },
          hovered && { backgroundColor: palette.bgHover, borderColor: palette.borderHover },
          hovered && !pressed && styles.fabHover,
          pressed && styles.fabPressed,
        ]}
      >
        {hovered ? (
          <Text style={[styles.handle, { color: palette.handle }]} numberOfLines={1}>
            @{SUPPORT_BOT_USERNAME}
          </Text>
        ) : null}
        <View
          style={[
            styles.iconDisk,
            { backgroundColor: palette.disk, borderColor: palette.diskBorder },
            hovered && { backgroundColor: palette.diskHover },
          ]}
        >
          <Ionicons name="headset-outline" size={22} color={palette.icon} />
        </View>
      </Pressable>
    </View>
  );
}

const PALETTE = {
  default: {
    bg: 'rgba(8, 10, 15, 0.72)',
    bgHover: 'rgba(186, 60, 71, 0.22)',
    border: 'rgba(255, 255, 255, 0.14)',
    borderHover: 'rgba(186, 60, 71, 0.55)',
    disk: 'rgba(186, 60, 71, 0.92)',
    diskHover: '#D14A55',
    diskBorder: 'rgba(255, 242, 242, 0.18)',
    icon: '#F7F2F0',
    handle: '#F2F2F4',
  },
  modern: {
    bg: 'rgba(10, 10, 10, 0.88)',
    bgHover: 'rgba(10, 10, 10, 0.96)',
    border: 'rgba(255, 255, 255, 0.16)',
    borderHover: 'rgba(255, 255, 255, 0.35)',
    disk: '#0a0a0a',
    diskHover: '#1a1a1a',
    diskBorder: 'rgba(255, 255, 255, 0.12)',
    icon: '#f5f5f3',
    handle: '#f5f5f3',
  },
  soviet: {
    bg: 'rgba(12, 10, 8, 0.82)',
    bgHover: 'rgba(196, 30, 58, 0.28)',
    border: 'rgba(232, 213, 181, 0.28)',
    borderHover: 'rgba(201, 162, 39, 0.55)',
    disk: '#8B1A1A',
    diskHover: '#c41e3a',
    diskBorder: 'rgba(232, 213, 181, 0.35)',
    icon: '#E8D5B5',
    handle: '#E8D5B5',
  },
} as const;

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 45,
    alignItems: 'flex-end',
  },
  anchorFixed: {
    position: 'fixed' as unknown as 'absolute',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: SIZE,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    gap: 8,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
          boxShadow: '0 8px 22px rgba(0, 0, 0, 0.28)',
        } as object)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.28,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }),
  },
  fabHover: {
    transform: [{ translateY: -3 }, { scale: 1.04 }],
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 12px 28px rgba(186, 60, 71, 0.38)',
        } as object)
      : {}),
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  iconDisk: {
    width: SIZE - 12,
    height: SIZE - 12,
    borderRadius: (SIZE - 12) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  handle: Typo(
    {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.2,
      paddingLeft: 10,
      paddingRight: 4,
    },
    'sans',
  ),
});
