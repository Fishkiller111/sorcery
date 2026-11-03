import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultProfileTileProps = {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  hideIcon?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  locked?: boolean;
  loading?: boolean;
  wide?: boolean;
  layout?: 'stack' | 'horizontal';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function DefaultProfileTile({
  title,
  subtitle,
  value,
  icon = 'ellipse-outline',
  iconColor,
  hideIcon = false,
  onPress,
  disabled = false,
  locked = false,
  loading = false,
  wide = false,
  layout = 'horizontal',
  style,
  children,
}: DefaultProfileTileProps) {
  const inactive = disabled || locked || !onPress;
  const isHorizontal = layout === 'horizontal';
  const renderedIcon = hideIcon ? null : (
    <View style={[styles.iconWrap, isHorizontal && styles.iconWrapHorizontal, { borderColor: `${iconColor}55` }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
  );

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive || loading}
      style={({ pressed }) => [
        styles.tile,
        wide && styles.tileWide,
        isHorizontal && styles.tileHorizontal,
        locked && styles.tileLocked,
        !inactive && pressed && styles.tilePressed,
        style,
      ]}
      accessibilityRole={inactive ? 'text' : 'button'}
      accessibilityState={{ disabled: inactive }}
    >
      {isHorizontal ? (
        <>
          {renderedIcon}
          <View style={styles.horizontalTextCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {value ? (
              <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {value}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {locked ? (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={12} color={TOKENS.colors.textMuted} />
            </View>
          ) : null}
          {loading ? <ActivityIndicator size="small" color={TOKENS.colors.accent} /> : null}
        </>
      ) : (
        <>
      <View style={styles.topRow}>
        {renderedIcon}
        {locked ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color={TOKENS.colors.textMuted} />
          </View>
        ) : null}
        {loading ? <ActivityIndicator size="small" color={TOKENS.colors.accent} /> : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      {value ? (
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {value}
        </Text>
      ) : null}

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}

      {children}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 132,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    gap: 8,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  tileWide: {
    minHeight: 108,
  },
  tileHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 108,
    paddingVertical: 14,
  },
  iconWrapHorizontal: {
    flexShrink: 0,
  },
  horizontalTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    alignItems: 'flex-start',
  },
  tileLocked: {
    opacity: 0.62,
  },
  tilePressed: {
    transform: [{ scale: 0.985 }],
    borderColor: TOKENS.colors.inputBorderFocus,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  lockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.lineFaint,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 10, 15, 0.55)',
  },
  title: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  value: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    'display',
  ),
  subtitle: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    'sans',
  ),
});
