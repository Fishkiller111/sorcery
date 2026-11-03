import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import { resolveStaticUrl } from '../../constants/config';
import type { WorldviewItem } from '../../types/api';

interface WorldviewGridCardProps {
  item: WorldviewItem;
  roleCountLabel: string;
  onPress: (item: WorldviewItem) => void;
}

export function WorldviewGridCard({
  item,
  roleCountLabel,
  onPress,
}: WorldviewGridCardProps) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const imageUri = item.cover_image ? resolveStaticUrl(item.cover_image) : undefined;

  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.coverWrap}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.cover}
            contentFit="cover"
            contentPosition="top"
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={Typo(styles.coverInitial, 'display', lang)}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {item.role_count > 0 ? (
          <View style={styles.roleBadge}>
            <Ionicons name="people-outline" size={11} color="#fff" />
            <Text style={Typo(styles.roleBadgeText, 'mono', lang)}>{roleCountLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.summary ? (
          <Text style={Typo(styles.intro, 'sans', lang)} numberOfLines={2}>{item.summary}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 0,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    flexDirection: 'column',
  },
  coverWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  coverInitial: { color: COLORS.agents.paleGoldMuted, fontSize: 28, fontWeight: '700' },
  roleBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  roleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  body: {
    width: '100%',
    flexShrink: 0,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 3,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  name: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 18,
      letterSpacing: 0.5,
    },
    'display', lang
  ),
  intro: { color: COLORS.agents.paleGoldMuted, fontSize: 11, lineHeight: 16 },
});
};
