import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSimulator, publishSimulator, recordSimulatorView } from '../../../src/api/simulator';
import { useSimulatorAccess } from '../../../src/hooks/useSimulatorAccess';
import { useI18n } from '../../../src/i18n/I18nContext';
import { Typo } from '../../../src/theme/typography';
import { useAuthStore } from '../../../src/stores/authStore';
import { requireLoginForAction } from '../../../src/utils/requireLogin';
import { safeGoBack } from '../../../src/utils/safeGoBack';
import { formatApiError } from '../../../src/utils/apiError';
import { notifyError, notifySuccess } from '../../../src/utils/notify';
import {
  formatSimulatorStatsLine,
  resolveSimulatorStats,
} from '../../../src/utils/simulatorStats';
import { useMobilePageContentPaddingStyle } from '../../../src/hooks/useMobileSafeAreaPadding';
import { DefaultShell } from '../../../src/pages/default/components/DefaultShell';
import { DefaultMainBackground } from '../../../src/pages/default/components/DefaultMainBackground';
import { TOKENS } from '../../../src/pages/default/theme/tokens';
import type { GetSimulatorResp, SimulatorDocumentV1 } from '../../../src/types/simulator';

function asDocument(raw: unknown): SimulatorDocumentV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as SimulatorDocumentV1;
}

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

export default function SimulatorDetailScreen() {
  const { simulatorId } = useLocalSearchParams<{ simulatorId: string }>();
  const id = String(simulatorId || '');
  const router = useRouter();
  const { t, lang } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const { canAccessSimulator } = useSimulatorAccess();
  const pageContentPadding = useMobilePageContentPaddingStyle();

  const [data, setData] = useState<GetSimulatorResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const resp = await getSimulator(id);
      setData(resp);
      void recordSimulatorView(id).catch(() => {});
    } catch (e) {
      notifyError(formatApiError(t, e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      if (!isRestored) return;
      if (!isLoggedIn) {
        requireLoginForAction(false, router, t('errors.authTokenMissing'));
        return;
      }
      if (!canAccessSimulator) return;
      void load();
    }, [isRestored, isLoggedIn, canAccessSimulator, load, router, t]),
  );

  const onPublish = useCallback(async () => {
    if (!id || publishing) return;
    setPublishing(true);
    try {
      await publishSimulator(id);
      notifySuccess(t('simulator.publishSuccess'));
      await load();
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setPublishing(false);
    }
  }, [id, load, publishing, t]);

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

  const sim = data?.simulator;
  const doc = asDocument(data?.draft?.document);
  const intro = doc?.intro?.trim() || '';
  const goalBrief = doc?.goal_brief?.trim() || '';
  const castName = doc?.cast?.[0]?.name || '';
  const stats = resolveSimulatorStats({
    ...(sim || {}),
    stats: data?.stats,
  });
  const statsLine = stats
    ? formatSimulatorStatsLine(stats, {
        views: t('simulator.statsViews'),
        plays: t('simulator.statsPlays'),
        clears: t('simulator.statsClears'),
      })
    : '';
  const statusLower = (sim?.status || '').toLowerCase();
  const canUpgrade = statusLower === 'published' || statusLower === 'draft';

  return (
    <DefaultShell scrollable={false}>
      <ScrollView contentContainerStyle={[styles.content, pageContentPadding]}>
        <Pressable
          onPress={() => safeGoBack('/simulator', router)}
          style={styles.backRow}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={20} color={TOKENS.colors.text} />
          <Text style={Typo(styles.backText, 'sans', lang)}>{t('simulator.back')}</Text>
        </Pressable>

        {loading && !sim ? (
          <ActivityIndicator color={TOKENS.colors.accent} style={{ marginTop: 40 }} />
        ) : !sim ? (
          <Text style={Typo(styles.empty, 'sans', lang)}>{t('simulator.loadFailed')}</Text>
        ) : (
          <>
            <Text style={Typo(styles.title, 'serif', lang)}>{sim.title}</Text>
            <Text style={Typo(styles.meta, 'sans', lang)}>
              {sim.status} · {sim.content_rating}
            </Text>
            {statsLine ? (
              <Text style={Typo(styles.statsLine, 'sans', lang)}>{statsLine}</Text>
            ) : null}

            {intro ? (
              <View style={styles.block}>
                <Text style={Typo(styles.blockLabel, 'sans', lang)}>{t('simulator.intro')}</Text>
                <Text style={Typo(styles.blockBody, 'sans', lang)}>{intro}</Text>
              </View>
            ) : null}

            {goalBrief ? (
              <View style={styles.block}>
                <Text style={Typo(styles.blockLabel, 'sans', lang)}>{t('simulator.goal')}</Text>
                <Text style={Typo(styles.blockBody, 'sans', lang)}>{goalBrief}</Text>
              </View>
            ) : null}

            {castName ? (
              <View style={styles.block}>
                <Text style={Typo(styles.blockLabel, 'sans', lang)}>{t('simulator.cast')}</Text>
                <Text style={Typo(styles.blockBody, 'sans', lang)}>{castName}</Text>
              </View>
            ) : null}

            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push(`/simulator/${id}/play`)}
            >
              <Text style={Typo(styles.primaryBtnText, 'sans', lang)}>
                {t('simulator.startPlay')}
              </Text>
            </Pressable>

            {sim.status === 'draft' ? (
              <Pressable
                style={[styles.secondaryBtn, publishing && styles.btnDisabled]}
                disabled={publishing}
                onPress={() => void onPublish()}
              >
                {publishing ? (
                  <ActivityIndicator color={TOKENS.colors.text} />
                ) : (
                  <Text style={Typo(styles.secondaryBtnText, 'sans', lang)}>
                    {t('simulator.publish')}
                  </Text>
                )}
              </Pressable>
            ) : null}

            {canUpgrade ? (
              <View style={styles.upgradeBlock}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() =>
                    router.push(`/create-world?from=simulator&simulator_id=${encodeURIComponent(id)}`)
                  }
                >
                  <Text style={Typo(styles.secondaryBtnText, 'sans', lang)}>
                    {t('simulator.upgradeToWorld')}
                  </Text>
                </Pressable>
                <Text style={Typo(styles.upgradeHint, 'sans', lang)}>
                  {t('simulator.upgradeToWorldHint')}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: TOKENS.layout.contentPadding,
    paddingBottom: 48,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  backText: { color: TOKENS.colors.text, fontSize: 15 },
  title: {
    color: TOKENS.colors.text,
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 6,
  },
  meta: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  statsLine: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  block: { marginBottom: 16, gap: 6 },
  blockLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  blockBody: {
    color: TOKENS.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  empty: {
    color: TOKENS.colors.textMuted,
    marginTop: 40,
    textAlign: 'center',
  },
  primaryBtn: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.22)',
  },
  primaryBtnText: {
    color: TOKENS.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  secondaryBtnText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeBlock: { marginTop: 4, gap: 6 },
  upgradeHint: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  btnDisabled: { opacity: 0.5 },
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
