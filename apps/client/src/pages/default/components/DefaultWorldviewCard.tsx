import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { resolveStaticUrl } from '../../../constants/config';
import { Typo } from '../../../theme/typography';
import type { WorldviewItem } from '../../../types/api';
import { TOKENS } from '../theme/tokens';

type DefaultWorldviewCardProps = {
  item: WorldviewItem;
  roleCountLabel: string;
  onPress: (item: WorldviewItem) => void;
};

export function DefaultWorldviewCard({
  item,
  roleCountLabel,
  onPress,
}: DefaultWorldviewCardProps) {
  const cover = item.cover_image ? resolveStaticUrl(item.cover_image) : null;

  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.coverWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" contentPosition="top" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverInitial}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {item.role_count > 0 ? (
          <View style={styles.roleBadge}>
            <Ionicons name="people-outline" size={11} color="#fff" />
            <Text style={styles.roleBadgeText}>{roleCountLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {item.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {item.summary}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 0,
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.cardSolid,
    overflow: 'hidden',
  },
  coverWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: TOKENS.colors.bgElevated,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInitial: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 28,
    },
    'serif',
  ),
  roleBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  roleBadgeText: Typo(
    {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    'sans',
  ),
  body: {
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 10,
    gap: 4,
  },
  name: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      lineHeight: 18,
    },
    'serif',
  ),
  summary: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    'sans',
  ),
});
