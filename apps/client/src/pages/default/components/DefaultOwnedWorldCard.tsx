import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveStaticUrl } from '../../../constants/config';
import { Typo } from '../../../theme/typography';
import { useI18n } from '../../../i18n/I18nContext';
import { AgentRatingCover } from '../../../components/agent/AgentRatingCover';
import { contentRatingBadgeLabel } from '../../../utils/agentRatingDisplay';
import type { WorldEditorItem } from '../../../types/worldDocument';
import { TOKENS } from '../theme/tokens';

type Props = {
  item: WorldEditorItem;
  onPress: (item: WorldEditorItem) => void;
  onEdit: (item: WorldEditorItem) => void;
};

export function DefaultOwnedWorldCard({ item, onPress, onEdit }: Props) {
  const { t } = useI18n();
  const cover = item.cover_image ? (resolveStaticUrl(item.cover_image) ?? null) : null;
  const badge = contentRatingBadgeLabel(item.content_rating);
  const status = (item.status || '').trim();

  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.coverWrap}>
        <AgentRatingCover
          uri={cover}
          nameFallbackInitial={item.title.charAt(0).toUpperCase() || 'W'}
          rBlurred={false}
          matureLocked={false}
        />
        {badge ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{badge}</Text>
          </View>
        ) : null}
        {status ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
          onPress={() => onEdit(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('worldEditor.listEdit')}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.title}
        </Text>
        {item.tagline ? (
          <Text style={styles.summary} numberOfLines={2}>
            {item.tagline}
          </Text>
        ) : (
          <Text style={styles.summary} numberOfLines={1}>
            {item.code}
          </Text>
        )}
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
    aspectRatio: 9 / 16,
    backgroundColor: TOKENS.colors.bgElevated,
    overflow: 'hidden',
    position: 'relative',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  ratingText: Typo({ color: '#fff', fontSize: 10, fontWeight: '700' }, 'mono'),
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  statusText: Typo({ color: '#fff', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }, 'sans'),
  editBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    zIndex: 3,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  editBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  body: { paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  name: Typo({ color: TOKENS.colors.text, fontSize: 14, fontWeight: '600' }, 'sans'),
  summary: Typo({ color: TOKENS.colors.textSecondary, fontSize: 12, lineHeight: 16 }, 'sans'),
});
