import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { resolveStaticUrl } from '../../../constants/config';
import { Typo } from '../../../theme/typography';
import { useI18n } from '../../../i18n/I18nContext';
import { resolveRoleCategoryName } from '../../../utils/roleCategory';
import { AgentLangBadges } from '../../../components/agent/AgentLangBadges';
import { PublishStatusBadge } from '../../../components/agent/PublishStatusBadge';
import { AgentRatingCover } from '../../../components/agent/AgentRatingCover';
import {
  canUserSeeMature,
  isAgentMatureLocked,
  isAgentRBlurred,
} from '../../../utils/agentRatingDisplay';
import {
  isSessionRevealed,
  markSessionRevealed,
  mediaRevealKey,
} from '../../../utils/mediaRevealSession';
import { useAuthStore } from '../../../stores/authStore';
import type { RoleGridCardData } from '../../../components/agent/RoleGridCard';
import type { Lang } from '../../../i18n/types';
import { TOKENS } from '../theme/tokens';

type DefaultAgentRoleCardProps = {
  item: RoleGridCardData;
  uiLang: Lang;
  variant: 'grid' | 'list';
  onPress: (id: string) => void;
  onMatureLocked?: (id: string) => void;
  nameFallback: string;
};

export function DefaultAgentRoleCard({
  item,
  uiLang,
  variant,
  onPress,
  onMatureLocked,
  nameFallback,
}: DefaultAgentRoleCardProps) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const canSeeMature = canUserSeeMature(user);
  const revealKey = mediaRevealKey('role', item.id);
  const [rRevealed, setRRevealed] = useState(() => isSessionRevealed(revealKey));

  useEffect(() => {
    setRRevealed(isSessionRevealed(revealKey));
  }, [revealKey]);

  const matureLocked = isAgentMatureLocked(item.content_rating, canSeeMature, item);
  const rBlurred = isAgentRBlurred(item.content_rating, item.id, rRevealed, canSeeMature);

  const name = item.name || nameFallback;
  const coverUrl = item.figure_url || item.avatar_url;
  const cover = coverUrl ? resolveStaticUrl(coverUrl) || null : null;
  const isList = variant === 'list';
  const tagLimit = isList ? 2 : 2;
  const categoryTags = item.categories?.slice(0, tagLimit) ?? [];
  const remainingTags = Math.max(0, (item.categories?.length ?? 0) - tagLimit);

  const handlePress = () => {
    if (rBlurred) {
      markSessionRevealed(revealKey);
      setRRevealed(true);
      return;
    }
    if (matureLocked) {
      onMatureLocked?.(item.id);
      return;
    }
    onPress(item.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.card, isList && styles.cardList]}
    >
      <View style={[styles.coverWrap, isList && styles.coverWrapList]}>
        <AgentRatingCover
          uri={cover}
          nameFallbackInitial={name.charAt(0).toUpperCase()}
          rBlurred={rBlurred}
          matureLocked={matureLocked}
          revealRLabel={t('agentMedia.revealR')}
          matureLockLabel={t('agentMedia.matureLocked')}
        />
      </View>

      <View style={[styles.body, isList && styles.bodyList]}>
        <Text style={styles.name} numberOfLines={isList ? 1 : 2}>
          {name}
        </Text>
        {item.introduction ? (
          <Text style={styles.intro} numberOfLines={isList ? 3 : 2}>
            {item.introduction}
          </Text>
        ) : null}
        {(item.has_chat_history ||
          item.worldview_name ||
          categoryTags.length > 0 ||
          remainingTags > 0 ||
          (item.supported_langs?.length ?? 0) > 0) ? (
          <View style={styles.tagRow}>
            {item.has_chat_history ? (
              <View style={[styles.tag, styles.tagHistory]}>
                <Text style={[styles.tagText, styles.tagHistoryText]} numberOfLines={1}>
                  {t('freeChat.categoryHistory')}
                </Text>
              </View>
            ) : null}
            {item.worldview_name ? (
              <View style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {item.worldview_name}
                </Text>
              </View>
            ) : null}
            {categoryTags.map((cat) => (
              <View key={cat.category_id} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {resolveRoleCategoryName(cat.category_id, cat.name, t)}
                </Text>
              </View>
            ))}
            {remainingTags > 0 ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{remainingTags}</Text>
              </View>
            ) : null}
            {(item.supported_langs?.length ?? 0) > 0 ? (
              <AgentLangBadges langs={item.supported_langs} uiLang={uiLang} compact />
            ) : null}
          </View>
        ) : null}
        {item.is_owner ? <PublishStatusBadge status={item.publish_status} /> : null}
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
  cardList: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 148,
    marginBottom: 12,
  },
  coverWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: TOKENS.colors.bgElevated,
    overflow: 'hidden',
    position: 'relative',
  },
  coverWrapList: {
    width: '38%',
    aspectRatio: undefined,
    minHeight: 148,
    flexShrink: 0,
  },
  body: {
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 10,
    gap: 4,
  },
  bodyList: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      lineHeight: 18,
    },
    'serif',
  ),
  intro: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    'sans',
  ),
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    maxWidth: '100%',
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tagHistory: {
    borderColor: 'rgba(186, 60, 71, 0.35)',
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  tagText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  tagHistoryText: {
    color: TOKENS.colors.accent,
  },
});
