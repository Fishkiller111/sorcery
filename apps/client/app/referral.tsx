import type { Lang } from '../src/i18n/types';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../src/utils/safeGoBack';
import { ShellLayout } from '../src/components/shell/ShellLayout';
import { useI18n } from '../src/i18n/I18nContext';
import { getCommonParams } from '../src/i18n/common';
import { COLORS } from '../src/theme/colors';
import { Typo } from '../src/theme/typography';
import {
  getPointsBalance,
  getReferralMe,
  listPointsLedger,
  listReferralInvites,
} from '../src/api/referral';
import type {
  PointsLedgerItem,
  ReferralInviteItem,
  ReferralMeResp,
} from '../src/types/api';
import { Message } from '../src/components/ui/Message';
import { notifyError } from '../src/utils/notify';
import { copyOrShareText } from '../src/utils/copyOrShare';
import { formatApiError } from '../src/utils/roleForm';
import { useMobilePageContentPaddingStyle } from '../src/hooks/useMobileSafeAreaPadding';

function statusLabel(t: (k: string) => string, status: string): string {
  if (status === 'completed') return t('referral.statusCompleted');
  if (status === 'pending') return t('referral.statusPending');
  return t('referral.statusUnknown');
}

function sourceLabel(t: (k: string) => string, source: string): string {
  switch (source) {
    case 'referral_invitee':
      return t('referral.sourceInvitee');
    case 'referral_inviter':
      return t('referral.sourceInviter');
    case 'admin_grant':
      return t('referral.sourceAdminGrant');
    default:
      return source || t('referral.sourceUnknown');
  }
}

export default function ReferralScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const [me, setMe] = useState<ReferralMeResp | null>(null);
  const [balance, setBalance] = useState(0);
  const [invites, setInvites] = useState<ReferralInviteItem[]>([]);
  const [ledger, setLedger] = useState<PointsLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [meResp, balanceResp, inviteResp, ledgerResp] = await Promise.all([
        getReferralMe(),
        getPointsBalance(),
        listReferralInvites(1, 20),
        listPointsLedger(1, 10),
      ]);
      setMe(meResp);
      setBalance(balanceResp.points);
      setInvites(inviteResp.items);
      setLedger(ledgerResp.items);
    } catch (e) {
      notifyError(formatApiError(t, e));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCopy = async (text: string, kind: 'code' | 'link') => {
    try {
      await copyOrShareText(text, t('referral.title'));
      Message.success(`${t('referral.copied')}\n${text}`, { duration: 4500 });
    } catch {
      Message.error(t('referral.loadFailed'));
    }
    void kind;
  };

  const activityActive = me?.activity_status === 'active';
  const shareTarget = me?.share_url || me?.invite_code || '';

  return (
    <ShellLayout scrollable showLangToggle={false}>
      <ScrollView contentContainerStyle={[styles.content, pageContentPadding]}>
        <TouchableOpacity onPress={() => safeGoBack('/')} style={styles.backRow} activeOpacity={0.7}>
          <Text style={Typo(styles.backText, 'sans', lang)}>‹ {t('referral.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('referral.title')}</Text>
        <Text style={Typo(styles.subtitle, 'sans', lang)}>{t('referral.subtitle')}</Text>

        <TouchableOpacity onPress={() => router.push('/points/shop')} style={styles.inviteLink}>
          <Text style={Typo(styles.inviteLinkText, 'sans', lang)}>{t('referral.goShop')} ›</Text>
        </TouchableOpacity>

        {!activityActive ? (
          <View style={styles.endedBanner}>
            <Text style={Typo(styles.endedText, 'sans', lang)}>{t('referral.activityEnded')}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.accent.gold} style={styles.loader} />
        ) : loadFailed ? (
          <View style={styles.errorBox}>
            <TouchableOpacity onPress={() => void load()} style={styles.retryBtn}>
              <Text style={Typo(styles.retryText, 'sans', lang)}>{t('referral.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : me ? (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={Typo(styles.statLabel, 'mono', lang)}>{t('referral.currentBalance')}</Text>
                <Text style={Typo(styles.statValue, 'display', lang)}>{balance}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={Typo(styles.statLabel, 'mono', lang)}>{t('referral.totalInvites')}</Text>
                <Text style={Typo(styles.statValue, 'display', lang)}>{me.total_invites}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={Typo(styles.statLabel, 'mono', lang)}>{t('referral.pointsEarned')}</Text>
                <Text style={Typo(styles.statValue, 'display', lang)}>{me.points_earned_from_referral}</Text>
              </View>
            </View>

            {activityActive ? (
              <View style={styles.rewardCard}>
                <Text style={Typo(styles.rewardLine, 'sans', lang)}>
                  {t('referral.rewardInvitee')}: {me.invitee_points} {t('referral.pointsUnit')}
                </Text>
                <Text style={Typo(styles.rewardLine, 'sans', lang)}>
                  {t('referral.rewardInviter')}: {me.inviter_points_per_invite}{' '}
                  {t('referral.pointsUnit')}
                </Text>
              </View>
            ) : null}

            <View style={styles.codeCard}>
              <Text style={styles.sectionLabel}>{t('referral.yourCode')}</Text>
              <Text style={styles.codeValue}>{me.invite_code}</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => void onCopy(me.invite_code, 'code')}
                  disabled={!activityActive}
                >
                  <Text style={Typo(styles.actionBtnText, 'display', lang)}>{t('referral.copyCode')}</Text>
                </TouchableOpacity>
                {shareTarget ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => void onCopy(shareTarget, 'link')}
                    disabled={!activityActive}
                  >
                    <Text style={Typo(styles.actionBtnText, 'display', lang)}>
                      {me.share_url ? t('referral.copyLink') : t('referral.share')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {me.share_url ? (
                <Text style={Typo(styles.shareUrl, 'mono', lang)} numberOfLines={2}>
                  {me.share_url}
                </Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('referral.inviteList')}</Text>
              {invites.length === 0 ? (
                <Text style={Typo(styles.emptyText, 'sans', lang)}>{t('referral.emptyInvites')}</Text>
              ) : (
                invites.map((row, idx) => (
                  <View key={`${row.invitee_email_masked}-${idx}`} style={styles.listRow}>
                    <Text style={Typo(styles.listPrimary, 'sans', lang)}>{row.invitee_email_masked}</Text>
                    <Text style={Typo(styles.listSecondary, 'mono', lang)}>{statusLabel(t, row.status)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('referral.ledgerTitle')}</Text>
              {ledger.length === 0 ? (
                <Text style={Typo(styles.emptyText, 'sans', lang)}>{t('referral.emptyLedger')}</Text>
              ) : (
                ledger.map((row) => (
                  <View key={row.id} style={styles.listRow}>
                    <Text style={Typo(styles.listPrimary, 'sans', lang)}>
                      {row.delta > 0 ? '+' : ''}
                      {row.delta}
                    </Text>
                    <Text style={Typo(styles.listSecondary, 'mono', lang)}>{sourceLabel(t, row.source)}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.rulesTitle}>{t('referral.rulesTitle')}</Text>
            <Text style={Typo(styles.rulesBody, 'sans', lang)}>
              {getCommonParams('referral.rulePermanent', lang, {})}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </ShellLayout>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: {
    marginBottom: 8,
  },
  backText: { color: COLORS.text.secondary, fontSize: 13 },
  title: Typo(
    { color: COLORS.text.primary, fontSize: 24, fontWeight: '700', marginBottom: 6 },
    'display', lang
  ),
  subtitle: { color: COLORS.text.secondary, fontSize: 13, marginBottom: 16 },
  inviteLink: {
    marginBottom: 14,
  },
  inviteLinkText: { color: COLORS.accent.gold, fontSize: 13 },
  endedBanner: {
    backgroundColor: 'rgba(158, 27, 27, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(158, 27, 27, 0.45)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  endedText: { color: '#e8b4b4', fontSize: 14, textAlign: 'center' },
  loader: { marginVertical: 32 },
  errorBox: { alignItems: 'center', gap: 12, marginVertical: 24 },
  errorText: { color: COLORS.text.secondary, fontSize: 13 },
  retryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: COLORS.accent.gold, fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(20, 22, 28, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { color: COLORS.text.muted, fontSize: 10, marginBottom: 6 },
  statValue: { color: COLORS.accent.gold, fontSize: 20, fontWeight: '700' },
  rewardCard: {
    backgroundColor: 'rgba(20, 22, 28, 0.6)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  rewardLine: { color: COLORS.text.secondary, fontSize: 13 },
  codeCard: {
    backgroundColor: 'rgba(20, 22, 28, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: Typo(
    { color: COLORS.text.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase' },
    'mono', lang
  ),
  codeValue: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 28,
      letterSpacing: 4,
      textAlign: 'center',
      marginBottom: 14,
    },
    'display', lang
  ),
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: COLORS.accent.gold,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnText: { color: '#0a0b0f', fontSize: 12, fontWeight: '700' },
  shareUrl: { color: COLORS.text.muted, fontSize: 11, textAlign: 'center' },
  section: {
    marginBottom: 18,
  },
  sectionTitle: Typo(
    { color: COLORS.text.primary, fontSize: 14, fontWeight: '600', marginBottom: 10 },
    'sans', lang
  ),
  emptyText: { color: COLORS.text.muted, fontSize: 12 },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  listPrimary: { color: COLORS.text.primary, fontSize: 13 },
  listSecondary: { color: COLORS.text.muted, fontSize: 12 },
  rulesTitle: Typo(
    { color: COLORS.text.muted, fontSize: 11, marginTop: 8, marginBottom: 6, textTransform: 'uppercase' },
    'mono', lang
  ),
  rulesBody: { color: COLORS.text.secondary, fontSize: 12, lineHeight: 18 },
});
};
