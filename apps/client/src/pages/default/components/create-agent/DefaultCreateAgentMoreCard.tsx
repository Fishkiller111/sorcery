import React from 'react';
import { Pressable, Text, StyleSheet, View, Platform, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { OPTION_CARD_ASPECT } from '../../../../components/create-agent/options/optionAssets';

type DefaultCreateAgentMoreCardProps = {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function DefaultCreateAgentMoreCard({
  label,
  hint,
  selected,
  onPress,
  style,
}: DefaultCreateAgentMoreCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.wrap,
        selected && styles.wrapSelected,
        pressed && styles.wrapPressed,
        style,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="create-outline" size={22} color={TOKENS.colors.accent} />
        </View>
        <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={2}>
          {label.toUpperCase()}
        </Text>
        {hint ? (
          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
        {selected ? (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={12} color={TOKENS.colors.text} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const glass =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as object)
    : {};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: TOKENS.colors.inviteBannerBorder,
    overflow: 'hidden',
    backgroundColor: 'rgba(186, 60, 71, 0.08)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  wrapSelected: {
    borderStyle: 'solid',
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  wrapPressed: {
    transform: [{ scale: 0.985 }],
  },
  card: {
    width: '100%',
    aspectRatio: OPTION_CARD_ASPECT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 8,
    backgroundColor: TOKENS.colors.card,
    ...glass,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  label: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.6,
    },
    'mono',
  ),
  labelSelected: {
    color: TOKENS.colors.text,
  },
  hint: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      lineHeight: 14,
      textAlign: 'center',
    },
    'sans',
  ),
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
