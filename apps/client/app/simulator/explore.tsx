import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listExploreSimulators } from '../../src/api/simulator';
import { useSimulatorAccess } from '../../src/hooks/useSimulatorAccess';
import { useI18n } from '../../src/i18n/I18nContext';
import { Typo } from '../../src/theme/typography';
import { useAuthStore } from '../../src/stores/authStore';
import { requireLoginForAction } from '../../src/utils/requireLogin';
import { safeGoBack } from '../../src/utils/safeGoBack';
import { formatApiError } from '../../src/utils/apiError';
import { notifyError } from '../../src/utils/notify';
import {
  formatSimulatorStatsLine,
  resolveSimulatorStats,
} from '../../src/utils/simulatorStats';
import { useMobilePageContentPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';
import { DefaultShell } from '../../src/pages/default/components/DefaultShell';
import { DefaultMainBackground } from '../../src/pages/default/components/DefaultMainBackground';
import { TOKENS } from '../../src/pages/default/theme/tokens';
import { themedScrollViewProps } from '../../src/theme/webScrollbar';
import type { ExploreSimulatorItem } from '../../src/types/simulator';

function DevGate({
  title,
  desc,
  actionLabel,
  onAction,
}: {
  title: string;
  desc?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.gate}>
      <DefaultMainBackground />
      <View style={styles.gateCard}>
        <Text style={styles.gateTitle}>{title}</Text>
        {desc ? <Text style={styles.gateDesc}>{desc}</Text> : null}
        <Pressable style={styles.gateBtn} onPress={onAction}>
          <Text style={styles.gateBtnText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SimulatorExploreScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const { canAccessSimulator } = useSimulatorAccess();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  const [items, setItems] = useState<ExploreSimulatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!isLoggedIn) {
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const resp = await listExploreSimulators({ page: 1, page_size: 50 });
        setItems(resp.items ?? []);
      } catch (e) {
        notifyError(formatApiError(t, e));
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isLoggedIn, t],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isRestored) return;
      if (!isLoggedIn) {
        requireLoginForAction(false, router, t('errors.authTokenMissing'));
        return;
      }
      if (!canAccessSimulator) return;
      void load('initial');
    }, [isRestored, isLoggedIn, canAccessSimulator, load, router, t]),
  );

  if (!isRestored) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={TOKENS.colors.accent} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <DevGate
        title={t('login.loginRequired')}
        actionLabel={t('login.login')}
        onAction={() => router.push('/login')}
      />
    );
  }

  if (!canAccessSimulator) {
    return (
      <DevGate
        title={t('simulator.devOnlyTitle')}
        desc={t('simulator.devOnlyDesc')}
        actionLabel={t('menu.back')}
        onAction={() => safeGoBack('/simulator', router)}
      />
    );
  }

  return (
    <DefaultShell scrollable={false}>
      <View style={[styles.content, pageContentPadding]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => safeGoBack('/simulator', router)}
            style={styles.backRow}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={TOKENS.colors.text} />
            <Text style={Typo(styles.backText, 'sans', lang)}>{t('simulator.back')}</Text>
          </Pressable>
        </View>

        <Text style={Typo(styles.title, 'serif', lang)}>{t('simulator.exploreTitle')}</Text>
        <Text style={Typo(styles.subtitle, 'sans', lang)}>{t('simulator.exploreSubtitle')}</Text>

        <ScrollView
          {...scrollWebProps}
          style={[styles.list, scrollWebProps.style]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={TOKENS.colors.accent}
            />
          }
        >
          {loading && items.length === 0 ? (
            <ActivityIndicator color={TOKENS.colors.accent} style={{ marginTop: 40 }} />
          ) : items.length === 0 ? (
            <Text style={Typo(styles.empty, 'sans', lang)}>{t('simulator.exploreEmpty')}</Text>
          ) : (
            items.map((item) => {
              const stats = resolveSimulatorStats(item);
              const statsLine = stats
                ? formatSimulatorStatsLine(stats, {
                    views: t('simulator.statsViews'),
                    plays: t('simulator.statsPlays'),
                    clears: t('simulator.statsClears'),
                  })
                : '';
              return (
              <View key={item.simulator_id} style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
                  onPress={() => router.push(`/simulator/${item.simulator_id}`)}
                >
                  <View style={styles.rowCopy}>
                    <Text style={Typo(styles.rowTitle, 'serif', lang)} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={Typo(styles.rowMeta, 'sans', lang)} numberOfLines={2}>
                      {item.content_rating}
                      {item.tagline ? ` · ${item.tagline}` : ''}
                    </Text>
                    {statsLine ? (
                      <Text style={Typo(styles.rowStats, 'sans', lang)} numberOfLines={1}>
                        {statsLine}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TOKENS.colors.textMuted} />
                </Pressable>
                <Pressable
                  style={styles.playBtn}
                  onPress={() => router.push(`/simulator/${item.simulator_id}/play`)}
                  hitSlop={6}
                >
                  <Text style={Typo(styles.playBtnText, 'sans', lang)}>
                    {t('simulator.explorePlay')}
                  </Text>
                </Pressable>
              </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: TOKENS.layout.contentPadding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: TOKENS.colors.text,
    fontSize: 15,
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 6,
  },
  subtitle: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  list: { flex: 1 },
  listContent: {
    paddingBottom: 40,
    gap: 10,
  },
  empty: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 48,
  },
  row: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.45)',
    borderRadius: TOKENS.radius.card,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { opacity: 0.88 },
  rowCopy: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: {
    color: TOKENS.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowMeta: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
  },
  rowStats: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  playBtn: {
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
  },
  playBtnText: {
    color: TOKENS.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: TOKENS.colors.bg,
  },
  gateCard: {
    width: '100%',
    maxWidth: 400,
    padding: 28,
    gap: 14,
    alignItems: 'center',
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
  },
  gateTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
    },
    'display',
  ),
  gateDesc: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    'sans',
  ),
  gateBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  gateBtnText: Typo({ color: TOKENS.colors.text, fontWeight: '700', fontSize: 15 }, 'sans'),
});
