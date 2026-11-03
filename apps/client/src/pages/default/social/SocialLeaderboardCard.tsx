import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchContestLeaderboard, fetchLiveContests } from '../../../api/contests';
import type { ContestLeaderboardItem, ContestListItem } from '../../../types/api';
import { resolveStaticUrl } from '../../../constants/config';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { SOCIAL } from './socialTokens';

const PAGE_SIZE = 5;

type SocialLeaderboardCardProps = {
  /** Compact density for mobile search dropdown */
  compact?: boolean;
  /** Called after navigating from a row (e.g. close mobile search dropdown). */
  onNavigated?: () => void;
};

function formatCount(n: number | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

function pickSeasonContest(items: ContestListItem[]): ContestListItem | null {
  if (!items.length) return null;
  const live = items.find((c) => c.status === 'live');
  if (live) return live;
  const scheduled = items.find((c) => c.status === 'scheduled');
  if (scheduled) return scheduled;
  return items[0] ?? null;
}

function entryRoute(item: ContestLeaderboardItem): string | null {
  const type = (item.entry_type || '').toLowerCase();
  const subject = item.subject_id?.trim();
  const roleId = item.role_id?.trim();
  if (type === 'simulator' && subject) return `/simulator/${subject}`;
  if (type === 'world' && subject) return `/world/${subject}`;
  if (roleId) return `/agent/${roleId}/media`;
  if (subject) return `/agent/${subject}/media`;
  return null;
}

export function SocialLeaderboardCard({
  compact = false,
  onNavigated,
}: SocialLeaderboardCardProps) {
  const { t, tp } = useI18n();
  const router = useRouter();
  const [contest, setContest] = useState<ContestListItem | null>(null);
  const [items, setItems] = useState<ContestLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const requestSeqRef = React.useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const live = await fetchLiveContests();
      const season = pickSeasonContest(live.items ?? []);
      if (seq !== requestSeqRef.current) return;
      setContest(season);
      if (!season?.slug) {
        setItems([]);
        return;
      }
      const board = await fetchContestLeaderboard(season.slug, 1, true, PAGE_SIZE);
      if (seq !== requestSeqRef.current) return;
      setItems((board.items ?? []).slice(0, PAGE_SIZE));
    } catch {
      if (seq !== requestSeqRef.current) return;
      setContest(null);
      setItems([]);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openSeason = () => {
    if (!contest?.slug) return;
    onNavigated?.();
    router.push(`/contest/${encodeURIComponent(contest.slug)}` as never);
  };

  const onPressItem = (item: ContestLeaderboardItem) => {
    const path = entryRoute(item);
    if (!path) {
      openSeason();
      return;
    }
    onNavigated?.();
    router.push(path as never);
  };

  const subtitle = contest?.theme_title?.trim() || contest?.name?.trim() || '';

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Pressable
        style={styles.header}
        onPress={contest?.slug ? openSeason : undefined}
        disabled={!contest?.slug}
        accessibilityRole="button"
      >
        <View style={styles.headerTitleRow}>
          <Ionicons name="trophy" size={compact ? 13 : 14} color="#F6D77A" />
          <Text style={[styles.headerTitle, compact && styles.headerTitleCompact]} numberOfLines={1}>
            {t('social.leaderboardSeason')}
          </Text>
        </View>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>

      {loading ? (
        <ActivityIndicator color={SOCIAL.handle} style={{ marginVertical: compact ? 10 : 14 }} />
      ) : !contest ? (
        <Text style={styles.empty}>{t('social.leaderboardSeasonNone')}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>{t('social.leaderboardSeasonEmpty')}</Text>
      ) : (
        <View style={styles.list}>
          {items.map((item, i) => {
            const name = item.role_name?.trim() || '—';
            const avatar = resolveStaticUrl(item.role_avatar_url);
            const rank = item.rank || i + 1;
            const pressable = !!entryRoute(item) || !!contest.slug;
            const rowKey = `season-${item.entry_id || item.role_id || i}`;

            return (
              <Pressable
                key={rowKey}
                style={({ pressed }) => [
                  styles.row,
                  compact && styles.rowCompact,
                  pressable && pressed && styles.rowPressed,
                ]}
                onPress={pressable ? () => onPressItem(item) : undefined}
                disabled={!pressable}
              >
                <Text style={[styles.rank, rank <= 3 && styles.rankTop]}>{rank}</Text>
                <View style={[styles.avatarWrap, compact && styles.avatarWrapCompact]}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={compact ? 14 : 16} color={SOCIAL.handle} />
                    </View>
                  )}
                </View>
                <View style={styles.meta}>
                  <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.stats} numberOfLines={1}>
                    {tp('social.leaderboardScore', { n: formatCount(item.score) })}
                    {' · '}
                    {tp('social.leaderboardGiftPts', { n: formatCount(item.gift_points) })}
                    {' · '}
                    {tp('social.leaderboardFans', { n: formatCount(item.follow_count) })}
                    {' · '}
                    {tp('social.leaderboardLikes', { n: formatCount(item.like_count) })}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {contest?.slug && !loading ? (
        <Pressable
          style={styles.footerBtn}
          onPress={openSeason}
          accessibilityRole="button"
          accessibilityLabel={t('social.leaderboardViewSeason')}
        >
          <Text style={styles.footerText}>{t('social.leaderboardViewSeason')}</Text>
          <Ionicons name="chevron-forward" size={12} color={SOCIAL.handle} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120, 140, 220, 0.28)',
    backgroundColor: 'rgba(18, 22, 34, 0.72)',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 0 1px rgba(186, 60, 71, 0.12), 0 8px 24px rgba(0,0,0,0.25)',
        } as object)
      : {}),
  },
  cardCompact: {
    borderRadius: 12,
    paddingTop: 8,
    paddingBottom: 6,
    marginTop: 4,
  },
  header: {
    paddingHorizontal: 6,
    paddingBottom: 8,
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: Typo(
    {
      color: '#F2F2F4',
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
    },
    'sans',
  ),
  headerTitleCompact: {
    fontSize: 12,
  },
  headerSubtitle: Typo(
    {
      color: SOCIAL.handle,
      fontSize: 11,
      marginLeft: 20,
    },
    'sans',
  ),
  empty: Typo(
    {
      color: SOCIAL.handle,
      fontSize: 12,
      textAlign: 'center',
      paddingVertical: 14,
    },
    'sans',
  ),
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  rowCompact: {
    paddingVertical: 6,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rank: Typo(
    {
      width: 16,
      color: SOCIAL.handle,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    'sans',
  ),
  rankTop: {
    color: SOCIAL.postBtn,
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarWrapCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: Typo(
    {
      color: SOCIAL.name,
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
  nameCompact: {
    fontSize: 12,
  },
  stats: Typo(
    {
      color: SOCIAL.handle,
      fontSize: 10,
      lineHeight: 13,
    },
    'sans',
  ),
  footerBtn: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  footerText: Typo(
    {
      color: SOCIAL.handle,
      fontSize: 11,
      fontWeight: '600',
    },
    'sans',
  ),
});
