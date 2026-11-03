import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { safeGoBack } from '../../utils/safeGoBack';
import { formatApiError } from '../../utils/apiError';
import { notifyError } from '../../utils/notify';
import { fetchContestDetail, fetchContestLeaderboard } from '../../api/contests';
import type { ContestDetailResp, ContestLeaderboardItem } from '../../types/api';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { resolveStaticUrl } from '../../constants/config';
import { themedScrollViewProps } from '../../theme/webScrollbar';

const H_PADDING_DESKTOP = TOKENS.layout.contentPadding;
const H_PADDING_MOBILE = 16;
function fmtCountdown(endsAt?: number) {
  if (!endsAt) return '';
  const diff = endsAt - Date.now();
  if (diff <= 0) return '已结束';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `剩余 ${days} 天 ${hours} 小时`;
  return `剩余 ${hours} 小时`;
}

export function DefaultContestDetail() {
  const router = useRouter();
  const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = useMemo(() => {
    const value = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }, [rawSlug]);

  const { t, lang } = useI18n();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const hPadding = isDesktop ? H_PADDING_DESKTOP : H_PADDING_MOBILE;  const [detail, setDetail] = useState<ContestDetailResp | null>(null);
  const [board, setBoard] = useState<ContestLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) {
      setDetail(null);
      setBoard([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [d, lb] = await Promise.all([
        fetchContestDetail(slug),
        fetchContestLeaderboard(slug, 1, true),
      ]);
      setDetail(d);
      setBoard(lb.items ?? []);
    } catch (err) {
      notifyError('加载活动失败', formatApiError(t, err));
      setDetail(null);
      setBoard([]);
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const heroUri = resolveStaticUrl(detail?.hero_url || detail?.banner_url);
  const primaryTheme = detail?.themes?.find((th) => th.is_primary) ?? detail?.themes?.[0];

  return (
    <DefaultShell>
      <ScrollView
        style={[styles.page, pageContentPadding]}
        contentContainerStyle={[styles.content, { paddingHorizontal: hPadding }]}
        {...scrollWebProps}
      >
        <View style={styles.header}>
          <DefaultBackButton accessibilityLabel={t('common.back')} onPress={() => safeGoBack('/', router)} />
        </View>

        {loading ? (
          <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />
        ) : !detail ? (
          <Text style={Typo(styles.empty, 'sans', lang)}>活动不存在或未开放</Text>
        ) : (
          <>
            {heroUri ? (
              <Image source={{ uri: heroUri }} style={styles.hero} resizeMode="cover" />
            ) : null}
            <Text style={Typo(styles.title, 'serif', lang)}>{detail.name}</Text>
            {primaryTheme ? (
              <Text style={Typo(styles.theme, 'sans', lang)}>{primaryTheme.title}</Text>
            ) : null}
            <Text style={Typo(styles.countdown, 'sans', lang)}>{fmtCountdown(detail.ends_at)}</Text>
            {detail.description ? (
              <Text style={Typo(styles.desc, 'sans', lang)}>{detail.description}</Text>
            ) : null}

            {detail.prizes?.length ? (
              <View style={styles.section}>
                <Text style={Typo(styles.sectionTitle, 'sans', lang)}>奖池</Text>
                {detail.prizes.map((p) => (
                  <Text key={p.prize_id} style={Typo(styles.prizeLine, 'sans', lang)}>
                    第 {p.rank_from}{p.rank_to !== p.rank_from ? `–${p.rank_to}` : ''} 名 ·{' '}
                    {p.reward_usdt > 0
                      ? `${p.reward_usdt} U`
                      : `${p.reward_soul} Soul`}
                  </Text>
                ))}
              </View>
            ) : null}

            {detail.rules_markdown ? (
              <View style={styles.section}>
                <Text style={Typo(styles.sectionTitle, 'sans', lang)}>规则</Text>
                <Text style={Typo(styles.rules, 'sans', lang)}>{detail.rules_markdown}</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={Typo(styles.sectionTitle, 'sans', lang)}>本期榜单</Text>
              {board.length === 0 ? (
                <Text style={Typo(styles.emptyBoard, 'sans', lang)}>暂无参赛角色</Text>
              ) : (
                board.map((row) => (
                  <View key={row.entry_id} style={styles.boardRow}>
                    <Text style={Typo(styles.boardRank, 'sans', lang)}>#{row.rank}</Text>
                    <View style={styles.boardMeta}>
                      <Text style={Typo(styles.boardName, 'sans', lang)} numberOfLines={1}>
                        {row.role_name}
                      </Text>
                      <Text style={Typo(styles.boardScore, 'sans', lang)}>{row.score} 分</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 40, maxWidth: 920 },
  header: { marginBottom: 12 },
  loader: { marginTop: 24 },
  empty: { color: TOKENS.colors.navTextInactive, marginTop: 24, fontSize: 14 },
  hero: {
    width: '100%',
    aspectRatio: 2.2,
    borderRadius: TOKENS.radius.cardLg,
    marginBottom: 20,
    backgroundColor: TOKENS.colors.cardSolid,
  },
  title: { color: TOKENS.colors.text, fontSize: 24, marginBottom: 8 },
  theme: { color: TOKENS.colors.accent, fontSize: 16, marginBottom: 6 },
  countdown: { color: TOKENS.colors.navTextInactive, fontSize: 13, marginBottom: 14 },
  desc: { color: TOKENS.colors.text, fontSize: 14, lineHeight: 22, marginBottom: 18, opacity: 0.92 },
  section: { marginTop: 24 },
  sectionTitle: { color: TOKENS.colors.text, fontSize: 17, fontWeight: '600', marginBottom: 10 },
  prizeLine: { color: TOKENS.colors.text, fontSize: 14, lineHeight: 22, marginBottom: 6, opacity: 0.9 },
  rules: { color: TOKENS.colors.text, fontSize: 13, lineHeight: 22, opacity: 0.9 },
  emptyBoard: { color: TOKENS.colors.navTextInactive, fontSize: 13 },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TOKENS.colors.cardBorderFaint,
  },
  boardRank: { width: 36, color: TOKENS.colors.accent, fontSize: 14 },
  boardMeta: { flex: 1, minWidth: 0 },
  boardName: { color: TOKENS.colors.text, fontSize: 14 },
  boardScore: { color: TOKENS.colors.navTextInactive, fontSize: 12, marginTop: 2 },
});
