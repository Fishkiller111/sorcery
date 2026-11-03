import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { resolveStaticUrl } from '../../constants/config';
import { AgentLangBadges } from './AgentLangBadges';
import { VerifiedRealPersonBadge } from './VerifiedRealPersonBadge';
import { VerifiedRealPersonGlowFrame } from './VerifiedRealPersonGlowFrame';
import { isVerifiedRealPerson } from '../../utils/verifiedRealPerson';
import { PublishStatusBadge } from './PublishStatusBadge';
import { useI18n } from '../../i18n/I18nContext';
import { resolveRoleCategoryName } from '../../utils/roleCategory';
import type { ExploreRoleCategory } from '../../types/api';
import type { Lang } from '../../i18n/types';

export type RoleGridCardVariant = 'grid' | 'list';

export interface RoleGridCardData {
  id: string;
  name: string;
  avatar_url?: string;
  figure_url?: string;
  introduction?: string;
  supported_langs?: string[];
  categories?: ExploreRoleCategory[];
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  publish_status?: string;
  is_owner?: boolean;
  worldview_name?: string;
  has_chat_history?: boolean;
  content_rating?: string;
  official_subtype?: string;
  verified_real_person?: boolean;
  source?: string;
}

function formatCount(n?: number): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

interface RoleGridCardProps {
  item: RoleGridCardData;
  uiLang: Lang;
  variant?: RoleGridCardVariant;
  onPress: (id: string) => void;
  onSettingsPress?: (id: string) => void;
  showCommunityStats?: boolean;
  /** @deprecated use showCommunityStats */
  showViewCount?: boolean;
  showPublishBadge?: boolean;
}

export function RoleGridCard({
  item,
  uiLang,
  variant = 'grid',
  onPress,
  onSettingsPress,
  showCommunityStats = false,
  showViewCount = false,
  showPublishBadge = false,
}: RoleGridCardProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isList = variant === 'list';
  const showStats = showCommunityStats || showViewCount;
  const coverUrl = item.figure_url || item.avatar_url;
  const imageUri = coverUrl ? resolveStaticUrl(coverUrl) : undefined;
  const tagLimit = isList ? 1 : 2;
  const categoryTags = item.categories?.slice(0, tagLimit) ?? [];
  const remainingTags = Math.max(0, (item.categories?.length ?? 0) - tagLimit);
  const langCount = item.supported_langs?.length ?? 0;
  const showSettings = item.is_owner && onSettingsPress;
  const initial = item.name.charAt(0).toUpperCase();
  const verified = isVerifiedRealPerson(item);

  return (
    <VerifiedRealPersonGlowFrame active={verified} radius={4}>
    <Pressable
      style={[styles.card, isList ? styles.cardList : styles.cardGrid, verified && styles.cardInGlow]}
      onPress={() => onPress(item.id)}
    >
      <View style={isList ? styles.coverWrapList : styles.coverWrapGrid}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.cover}
            contentFit="cover"
            contentPosition="top"
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverInitial}>{initial}</Text>
          </View>
        )}
        {showStats ? (
          <View style={[styles.statsBadge, verified && styles.statsBadgeVerified]}>
            <View style={styles.statChip}>
              <Ionicons name="eye-outline" size={11} color="#fff" />
              <Text style={styles.viewBadgeText}>{formatCount(item.view_count)}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="heart-outline" size={11} color="#fff" />
              <Text style={styles.viewBadgeText}>{formatCount(item.like_count)}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="chatbubble-outline" size={11} color="#fff" />
              <Text style={styles.viewBadgeText}>{formatCount(item.comment_count)}</Text>
            </View>
          </View>
        ) : null}
        {!isList && showSettings ? (
          <Pressable
            style={styles.settingsBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onSettingsPress(item.id);
            }}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={16} color="#fff" />
          </Pressable>
        ) : null}
        {verified ? (
          <VerifiedRealPersonBadge
            size={18}
            inset={6}
            label={t('agent.verifiedRealPersonLabel')}
            accessibilityLabel={t('agent.verifiedRealPersonLabel')}
          />
        ) : null}
      </View>

      <View style={isList ? styles.bodyList : styles.bodyGrid}>
        <View style={isList ? styles.nameRowList : undefined}>
          <Text
            style={[styles.name, isList && styles.nameList]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {isList && showSettings ? (
            <Pressable
              style={styles.settingsBtnList}
              onPress={(e) => {
                e.stopPropagation?.();
                onSettingsPress(item.id);
              }}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={16} color={COLORS.agents.paleGoldMuted} />
            </Pressable>
          ) : null}
        </View>
        {item.introduction ? (
          <Text style={styles.intro} numberOfLines={isList ? 3 : 2}>
            {item.introduction}
          </Text>
        ) : null}

        <View style={styles.tagRow}>
          {item.has_chat_history ? (
            <View style={[styles.tag, styles.historyTag]}>
              <Text style={[styles.tagText, styles.historyTagText]} numberOfLines={1}>
                {t('freeChat.categoryHistory')}
              </Text>
            </View>
          ) : null}
          {item.worldview_name ? (
            <View style={styles.worldviewTag}>
              <Text style={styles.worldviewTagText} numberOfLines={1}>{item.worldview_name}</Text>
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
          {langCount > 0 ? (
            <AgentLangBadges langs={item.supported_langs} uiLang={uiLang} compact tone="gold" />
          ) : null}
        </View>

        {showPublishBadge && item.is_owner ? (
          <PublishStatusBadge status={item.publish_status} />
        ) : null}
      </View>
    </Pressable>
    </VerifiedRealPersonGlowFrame>
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
  },
  cardInGlow: {
    borderWidth: 0,
  },
  cardGrid: {
    flexDirection: 'column',
    aspectRatio: 10 / 16,
  },
  cardList: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  coverWrapGrid: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  coverWrapList: {
    width: '42%',
    height: 156,
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  coverInitial: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 28, fontWeight: '700' }, 'display', lang),
  viewBadge: {
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
  statsBadge: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statsBadgeVerified: {
    maxWidth: '52%',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  viewBadgeText: Typo({ color: '#fff', fontSize: 11, fontWeight: '600' }, 'mono', lang),
  settingsBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  settingsBtnList: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bodyGrid: {
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
  bodyList: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 3,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  nameRowList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  nameList: {
    flex: 1,
    minWidth: 0,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 1,
  },
  intro: Typo({width: '100%', color: COLORS.agents.paleGoldMuted, fontSize: 11, lineHeight: 16 }, 'sans'),
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 2 },
  worldviewTag: {
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
  },
  worldviewTagText: Typo({ color: COLORS.agents.paleGold, fontSize: 10, fontWeight: '600' }, 'mono', lang),
  tag: {
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
  },
  tagText: Typo({ color: COLORS.agents.paleGold, fontSize: 10, fontWeight: '600' }, 'mono', lang),
  historyTag: {
    backgroundColor: 'rgba(201, 162, 39, 0.18)',
    borderColor: COLORS.agents.brightGold,
  },
  historyTagText: {
    color: COLORS.agents.brightGold,
  },
});
};
