import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

const THREAD_BLUE = '#6B7FD7';

type DefaultModeCardProps = {
  title: string;
  tag: string;
  description: string;
  selected: boolean;
  locked?: boolean;
  lockedLabel?: string;
  tone: 'story' | 'freeChat';
  onPress: () => void;
};

export function DefaultModeCard({
  title,
  tag,
  description,
  selected,
  locked = false,
  lockedLabel,
  tone,
  onPress,
}: DefaultModeCardProps) {
  const [hovered, setHovered] = useState(false);
  const highlighted = selected || hovered;

  const hoverHandlers =
    Platform.OS === 'web' && !locked
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  const accentColor = tone === 'story' ? TOKENS.colors.accent : THREAD_BLUE;
  const gradientColors =
    tone === 'story'
      ? (['rgba(186, 60, 71, 0.22)', 'rgba(186, 60, 71, 0.04)', 'transparent'] as const)
      : (['rgba(107, 127, 215, 0.2)', 'rgba(107, 127, 215, 0.05)', 'transparent'] as const);

  const iconName = tone === 'story' ? 'book-outline' : 'chatbubbles-outline';

  return (
    <Pressable
      {...hoverHandlers}
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: locked }}
      style={({ pressed }) => [
        styles.cardOuter,
        selected && { borderColor: accentColor },
        highlighted && !selected && styles.cardOuterHover,
        locked && styles.cardOuterLocked,
        pressed && !locked && styles.cardOuterPressed,
      ]}
    >
      <LinearGradient colors={[...gradientColors]} style={styles.cardGlow} pointerEvents="none" />
      <View style={styles.cardInner}>
        <View style={[styles.iconWrap, selected && { borderColor: `${accentColor}66` }]}>
          <Ionicons name={iconName} size={22} color={highlighted ? accentColor : TOKENS.colors.textMuted} />
        </View>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, highlighted && { color: TOKENS.colors.text }]} numberOfLines={2}>
              {title}
            </Text>
            {selected ? (
              <View style={[styles.selectedMark, { backgroundColor: accentColor }]} />
            ) : null}
          </View>
          <Text style={[styles.tag, highlighted && { color: accentColor }]}>{tag}</Text>
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        </View>

        {locked ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed-outline" size={12} color={TOKENS.colors.textMuted} />
            {lockedLabel ? <Text style={styles.lockText}>{lockedLabel}</Text> : null}
          </View>
        ) : (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={highlighted ? accentColor : TOKENS.colors.textMuted}
            style={styles.chevron}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    minHeight: 156,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'border-color 0.2s ease, transform 0.2s ease',
        } as object)
      : {}),
  },
  cardOuterHover: {
    borderColor: TOKENS.colors.line,
    backgroundColor: 'rgba(12, 14, 20, 0.82)',
  },
  cardOuterPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  cardOuterLocked: {
    opacity: 0.58,
  },
  cardGlow: {
    ...StyleSheet.absoluteFill,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: Typo(
    {
      flex: 1,
      color: TOKENS.colors.textSecondary,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: 0.6,
    },
    'serif',
  ),
  selectedMark: {
    width: 7,
    height: 7,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
    marginTop: 10,
  },
  tag: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  description: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 2,
    },
    'sans',
  ),
  chevron: {
    marginTop: 14,
    opacity: 0.85,
  },
  lockBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    minWidth: 44,
  },
  lockText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 9,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'mono',
  ),
});
