import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

function NavDiamond({ active, hovered }: { active: boolean; hovered: boolean }) {
  if (!active && !hovered) {
    return <View style={styles.navDiamondSpacer} />;
  }
  return (
    <View
      style={[
        styles.navDiamond,
        active && styles.navDiamondActive,
        hovered && !active && styles.navDiamondHover,
      ]}
    />
  );
}

type DefaultSidebarNavItemProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  showUnreadDot?: boolean;
};

export function DefaultSidebarNavItem({
  label,
  active,
  onPress,
  showUnreadDot = false,
}: DefaultSidebarNavItemProps) {
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
      style={styles.navItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <NavDiamond active={active} hovered={hovered} />
      <View style={styles.navLabelWrap}>
        <Text
          style={[
            styles.navLabel,
            highlighted && styles.navLabelHighlighted,
            active && styles.navLabelActive,
            hovered && !active && styles.navLabelHover,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
        {showUnreadDot ? <View style={styles.unreadDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 32,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as object)
      : {}),
  },
  navDiamondSpacer: {
    width: 8,
    height: 8,
  },
  navDiamond: {
    width: 8,
    height: 8,
    backgroundColor: TOKENS.colors.textMuted,
    transform: [{ rotate: '45deg' }],
    opacity: 0.35,
  },
  navDiamondActive: {
    backgroundColor: TOKENS.colors.accent,
    opacity: 1,
  },
  navDiamondHover: {
    backgroundColor: TOKENS.colors.accent,
    opacity: 0.7,
  },
  navLabel: Typo(
    {
      color: TOKENS.colors.navTextInactive,
      fontSize: 15,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'serif',
  ),
  navLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.accent,
    flexShrink: 0,
  },
  navLabelHighlighted: {
    color: TOKENS.colors.text,
  },
  navLabelActive: {
    color: TOKENS.colors.accent,
    fontSize: 16,
    letterSpacing: 1.1,
  },
  navLabelHover: {
    fontSize: 16.5,
    letterSpacing: 1.15,
    color: TOKENS.colors.text,
    ...(Platform.OS === 'web'
      ? ({
          transition: 'color 0.2s ease, font-size 0.2s ease, letter-spacing 0.2s ease',
        } as object)
      : {}),
  },
});
