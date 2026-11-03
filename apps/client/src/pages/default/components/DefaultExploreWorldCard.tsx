import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { resolveStaticUrl } from '../../../constants/config';
import { Typo } from '../../../theme/typography';
import { useI18n } from '../../../i18n/I18nContext';
import { AgentRatingCover } from '../../../components/agent/AgentRatingCover';
import {
  canUserSeeMature,
  contentRatingBadgeLabel,
  isAgentMatureLocked,
  isWorldRBlurred,
} from '../../../utils/agentRatingDisplay';
import {
  markSessionRevealed,
  mediaRevealKey,
  isSessionRevealed,
} from '../../../utils/mediaRevealSession';
import { useAuthStore } from '../../../stores/authStore';
import type { ExploreWorldItem } from '../../../api/exploreWorlds';
import { TOKENS } from '../theme/tokens';

type Props = {
  item: ExploreWorldItem;
  onPress: (item: ExploreWorldItem) => void;
  onMatureLocked?: (item: ExploreWorldItem) => void;
};

export function DefaultExploreWorldCard({ item, onPress, onMatureLocked }: Props) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const canSeeMature = canUserSeeMature(user);
  const revealId = item.simulator_id || item.world_id || item.code;
  const revealKey = mediaRevealKey(item.kind === 'simulator' ? 'simulator' : 'world', revealId);
  const [rRevealed, setRRevealed] = useState(() => isSessionRevealed(revealKey));

  useEffect(() => {
    setRRevealed(isSessionRevealed(revealKey));
  }, [revealKey]);

  const cover = item.cover_image ? (resolveStaticUrl(item.cover_image) ?? null) : null;
  const matureLocked = isAgentMatureLocked(item.content_rating, canSeeMature);
  const rBlurred = isWorldRBlurred(item.content_rating, revealId, rRevealed, canSeeMature);
  const badge = contentRatingBadgeLabel(item.content_rating);

  const handlePress = () => {
    if (rBlurred) {
      markSessionRevealed(revealKey);
      setRRevealed(true);
      return;
    }
    if (matureLocked) {
      onMatureLocked?.(item);
      return;
    }
    onPress(item);
  };

  const kind = item.kind === 'simulator' || item.simulator_id ? 'simulator' : 'world';
  const kindLabel =
    kind === 'simulator' ? t('explore.kind.simulator') : t('explore.kind.world');

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={styles.coverWrap}>
        <AgentRatingCover
          uri={cover}
          nameFallbackInitial={item.title.charAt(0).toUpperCase()}
          rBlurred={rBlurred}
          matureLocked={matureLocked}
          revealRLabel={t('agentMedia.revealR')}
          matureLockLabel={t('worldPlay.matureBlur')}
        />
        {badge ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{badge}</Text>
          </View>
        ) : null}
        <View
          style={[
            styles.kindTag,
            kind === 'simulator' ? styles.kindTagSimulator : styles.kindTagWorld,
          ]}
        >
          <Text style={styles.kindTagText}>{kindLabel}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.title}
        </Text>
        {item.tagline ? (
          <Text style={styles.summary} numberOfLines={2}>
            {item.tagline}
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
  kindTag: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    zIndex: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  kindTagWorld: {
    backgroundColor: 'rgba(186, 60, 71, 0.92)',
  },
  kindTagSimulator: {
    backgroundColor: 'rgba(47, 110, 196, 0.92)',
  },
  kindTagText: Typo({ color: '#fff', fontSize: 10, fontWeight: '700' }, 'sans'),
  body: { paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  name: Typo({ color: TOKENS.colors.text, fontSize: 14, fontWeight: '600' }, 'sans'),
  summary: Typo({ color: TOKENS.colors.textSecondary, fontSize: 12, lineHeight: 16 }, 'sans'),
});
