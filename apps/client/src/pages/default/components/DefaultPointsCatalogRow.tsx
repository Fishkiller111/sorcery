import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';
import type { PointsCatalogItem } from '../../../types/api';
import { resolveStaticUrl } from '../../../constants/config';

function categoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'story_unlock':
      return 'book-outline';
    case 'story_item':
      return 'sparkles-outline';
    default:
      return 'gift-outline';
  }
}

type DefaultPointsCatalogRowProps = {
  item: PointsCatalogItem;
  categoryLabel: string;
  pointsUnit: string;
  redeemLabel: string;
  ownedLabel: string;
  redeeming: boolean;
  onRedeem: () => void;
  isLast?: boolean;
};

export function DefaultPointsCatalogRow({
  item,
  categoryLabel,
  pointsUnit,
  redeemLabel,
  ownedLabel,
  redeeming,
  onRedeem,
  isLast = false,
}: DefaultPointsCatalogRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.iconWrap}>
        {item.image_url && resolveStaticUrl(item.image_url) ? (
          <Image
            source={{ uri: resolveStaticUrl(item.image_url) }}
            style={styles.iconImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name={categoryIcon(item.category)} size={20} color={TOKENS.colors.accent} />
        )}
      </View>

      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.meta}>
          {categoryLabel} · {item.cost_points} {pointsUnit}
        </Text>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>

      {item.owned ? (
        <View style={styles.ownedBadge}>
          <Text style={styles.ownedText}>{ownedLabel}</Text>
        </View>
      ) : (
        <Pressable
          onPress={onRedeem}
          disabled={redeeming}
          style={({ pressed }) => [
            styles.redeemBtn,
            redeeming && styles.redeemBtnDisabled,
            pressed && !redeeming && styles.redeemBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={redeemLabel}
        >
          {redeeming ? (
            <ActivityIndicator size="small" color={TOKENS.colors.text} />
          ) : (
            <Text style={styles.redeemText}>{redeemLabel}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  iconImage: {
    width: 44,
    height: 44,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    'sans',
  ),
  meta: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 11,
      letterSpacing: 0.3,
    },
    'mono',
  ),
  desc: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    'sans',
  ),
  ownedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    flexShrink: 0,
  },
  ownedText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    'mono',
  ),
  redeemBtn: {
    minWidth: 72,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as object)
      : {}),
  },
  redeemBtnDisabled: {
    opacity: 0.65,
  },
  redeemBtnPressed: {
    backgroundColor: TOKENS.colors.accentPressed,
    transform: [{ scale: 0.98 }],
  },
  redeemText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'mono',
  ),
});
