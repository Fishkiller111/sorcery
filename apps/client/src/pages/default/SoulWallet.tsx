import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { DefaultSoulCoinIcon } from './components/DefaultSoulCoinIcon';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { safeGoBack } from '../../utils/safeGoBack';
import { formatApiError } from '../../utils/apiError';
import { trackGaEvent } from '../../utils/analytics';
import {
  getSoulWallet,
  listSoulWithdrawals,
  redeemSoul,
  requestSoulWithdraw,
  startSoulStripeOnboarding,
  updateSoulPayoutAccount,
} from '../../api/soul';
import type { SoulWalletResp, SoulWithdrawalItem } from '../../types/api';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import * as Linking from 'expo-linking';
import { APP_SITE_URL } from '../../constants/config';

const REDEEM_QUICK_SOUL = [10000, 50000, 100000] as const;

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(t: (k: string) => string, status: string): string {
  switch (status) {
    case 'pending':
      return t('soulWallet.statusPending');
    case 'approved':
      return t('soulWallet.statusApproved');
    case 'paid':
      return t('soulWallet.statusPaid');
    case 'rejected':
      return t('soulWallet.statusRejected');
    case 'cancelled':
      return t('soulWallet.statusCancelled');
    case 'payout_failed':
      return t('soulWallet.statusPayoutFailed');
    default:
      return status;
  }
}

function isLikelyTrc20(address: string): boolean {
  const v = address.trim();
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(v);
}

export default function DefaultSoulWallet() {
  const { t, tp } = useI18n();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();

  const [wallet, setWallet] = useState<SoulWalletResp | null>(null);
  const [history, setHistory] = useState<SoulWithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [redeemInput, setRedeemInput] = useState('');
  const [withdrawInput, setWithdrawInput] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [busy, setBusy] = useState<'redeem' | 'withdraw' | 'payout' | 'stripe' | null>(
    null,
  );

  const writeDisabled = !!wallet?.is_banned;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [walletResp, withdrawalsResp] = await Promise.all([
        getSoulWallet(),
        listSoulWithdrawals(1, 20),
      ]);
      setWallet(walletResp);
      setPayoutAccount(walletResp.payout_account || '');
      setHistory(withdrawalsResp.items || []);
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

  const redeemPreviewCents = useMemo(() => {
    if (!wallet) return 0;
    const soul = Math.floor(Number(redeemInput));
    if (!Number.isFinite(soul) || soul <= 0 || wallet.soul_per_usd <= 0) return 0;
    return Math.floor((soul * 100) / wallet.soul_per_usd);
  }, [redeemInput, wallet]);

  const onRedeem = async () => {
    if (!wallet || writeDisabled) return;
    if (!wallet.is_enabled) {
      notifyWarning(t('soulWallet.redeemDisabled'));
      return;
    }
    const soul = Math.floor(Number(redeemInput));
    if (!Number.isFinite(soul) || soul <= 0) {
      notifyWarning(t('soulWallet.invalidSoul'));
      return;
    }
    setBusy('redeem');
    try {
      const resp = await redeemSoul({ soul });
      trackGaEvent('soul_redeem', { soul, usd_cents: resp.usd_cents });
      setWallet((prev) =>
        prev
          ? {
              ...prev,
              soul_balance: resp.soul_balance,
              withdrawable_soul: resp.withdrawable_soul,
              available_cents: resp.available_cents,
            }
          : prev,
      );
      setRedeemInput('');
      notifySuccess(t('soulWallet.redeemSuccess'));
      await load();
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  };

  const onWithdraw = async () => {
    if (!wallet || writeDisabled) return;
    const usd = Number(withdrawInput);
    if (!Number.isFinite(usd) || usd <= 0) {
      notifyWarning(t('soulWallet.invalidUsd'));
      return;
    }
    const amountCents = Math.round(usd * 100);
    setBusy('withdraw');
    try {
      const resp = await requestSoulWithdraw({ amount_cents: amountCents });
      trackGaEvent('soul_withdraw_request', { amount_cents: amountCents });
      setWallet((prev) =>
        prev ? { ...prev, available_cents: resp.available_cents } : prev,
      );
      setWithdrawInput('');
      notifySuccess(t('soulWallet.withdrawSuccess'));
      await load();
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  };

  const onSavePayout = async () => {
    if (!wallet || writeDisabled) return;
    const account = payoutAccount.trim();
    if (!isLikelyTrc20(account)) {
      notifyWarning(t('soulWallet.invalidPayout'));
      return;
    }
    setBusy('payout');
    try {
      const resp = await updateSoulPayoutAccount({
        payout_method: 'usdt_trc20',
        payout_account: account,
      });
      setWallet((prev) =>
        prev
          ? {
              ...prev,
              payout_method: resp.payout_method,
              payout_account: resp.payout_account,
              stripe_connected_account_id: resp.stripe_connected_account_id,
              stripe_ready: resp.stripe_ready,
            }
          : prev,
      );
      setPayoutAccount(resp.payout_account);
      notifySuccess(t('soulWallet.payoutSaved'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  };

  const onBindStripe = async () => {
    if (!wallet || writeDisabled) return;
    setBusy('stripe');
    try {
      const returnUrl = APP_SITE_URL
        ? `${APP_SITE_URL.replace(/\/$/, '')}/soul/wallet`
        : Linking.createURL('/soul/wallet');
      const resp = await startSoulStripeOnboarding({
        return_url: returnUrl,
        refresh_url: returnUrl,
      });
      trackGaEvent('soul_stripe_onboarding', {
        already_ready: resp.already_ready,
        account_id: resp.stripe_connected_account_id,
      });
      if (resp.already_ready || resp.stripe_ready) {
        setWallet((prev) =>
          prev
            ? {
                ...prev,
                payout_method: 'stripe',
                stripe_connected_account_id: resp.stripe_connected_account_id,
                stripe_ready: true,
              }
            : prev,
        );
        notifySuccess(t('soulWallet.stripeReady'));
        await load();
        return;
      }
      if (!resp.onboarding_url) {
        throw new Error(t('soulWallet.stripeOpenFailed'));
      }
      await Linking.openURL(resp.onboarding_url);
      notifySuccess(t('soulWallet.stripeOpened'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  };

  const onPreferStripe = async () => {
    if (!wallet || writeDisabled) return;
    if (!wallet.stripe_connected_account_id) {
      await onBindStripe();
      return;
    }
    setBusy('stripe');
    try {
      const resp = await updateSoulPayoutAccount({
        payout_method: 'stripe',
        payout_account: payoutAccount.trim() || undefined,
      });
      setWallet((prev) =>
        prev
          ? {
              ...prev,
              payout_method: resp.payout_method,
              payout_account: resp.payout_account,
              stripe_connected_account_id: resp.stripe_connected_account_id,
              stripe_ready: resp.stripe_ready,
            }
          : prev,
      );
      notifySuccess(t('soulWallet.stripePreferred'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DefaultShell scrollable>
      <View
        style={[
          styles.content,
          isDesktop ? styles.contentDesktop : styles.contentMobile,
          pageContentPadding,
        ]}
      >
        <DefaultBackButton
          onPress={() => safeGoBack('/profile')}
          accessibilityLabel={t('soulWallet.back')}
        />

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.walletIconWrap}>
              <Ionicons
                name="wallet-outline"
                size={isDesktop ? 28 : 24}
                color={TOKENS.colors.text}
              />
            </View>
            <View style={styles.titleCopy}>
              <Text style={styles.title}>{t('soulWallet.title')}</Text>
              <Text style={styles.subtitle}>{t('soulWallet.subtitle')}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={TOKENS.colors.accent} style={styles.loader} />
        ) : loadFailed || !wallet ? (
          <View style={styles.errorBox}>
            <Text style={styles.emptyText}>{t('soulWallet.loadFailed')}</Text>
            <Pressable
              onPress={() => void load()}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.primaryBtnText}>{t('soulWallet.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {writeDisabled ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>{t('soulWallet.bannedNotice')}</Text>
              </View>
            ) : null}

            <View style={styles.panel}>
              <BalanceRow
                label={t('soulWallet.totalSoul')}
                value={String(wallet.soul_balance)}
                showCoin
              />
              <BalanceRow
                label={t('soulWallet.withdrawableSoul')}
                value={String(wallet.withdrawable_soul)}
                showCoin
              />
              <BalanceRow
                label={t('soulWallet.usdBalance')}
                value={formatUsd(wallet.available_cents)}
                emphasize
              />
              <Text style={styles.meta}>
                {tp('soulWallet.rateHint', {
                  soul: String(wallet.soul_per_usd),
                  min: String(wallet.min_redeem_soul),
                })}
              </Text>
              <Text style={styles.meta}>
                {tp('soulWallet.minWithdrawHint', {
                  amount: formatUsd(wallet.min_withdraw_cents),
                })}
              </Text>
              <Text style={styles.meta}>
                {tp('soulWallet.feeHint', { fee: formatUsd(wallet.fee_preview_cents) })}
              </Text>
            </View>

            <Section title={t('soulWallet.redeemSection')}>
              <View style={styles.amountRow}>
                <TextInput
                  value={redeemInput}
                  onChangeText={setRedeemInput}
                  keyboardType="number-pad"
                  placeholder={t('soulWallet.redeemAmount')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                  editable={!writeDisabled && busy == null}
                  style={[styles.input, styles.amountInput]}
                />
                <Pressable
                  onPress={() => {
                    if (wallet.withdrawable_soul > 0) {
                      setRedeemInput(String(wallet.withdrawable_soul));
                    }
                  }}
                  disabled={
                    writeDisabled || busy != null || wallet.withdrawable_soul <= 0
                  }
                  accessibilityLabel={t('soulWallet.redeemMax')}
                  style={({ pressed }) => [
                    styles.chip,
                    styles.maxChip,
                    Math.floor(Number(redeemInput)) === wallet.withdrawable_soul &&
                      wallet.withdrawable_soul > 0 &&
                      styles.chipActive,
                    (writeDisabled || busy != null || wallet.withdrawable_soul <= 0) &&
                      styles.btnDisabled,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      Math.floor(Number(redeemInput)) === wallet.withdrawable_soul &&
                        wallet.withdrawable_soul > 0 &&
                        styles.chipTextActive,
                    ]}
                  >
                    {t('soulWallet.redeemMax')}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.chipRow}>
                {REDEEM_QUICK_SOUL.map((amount) => {
                  const rate = wallet.soul_per_usd > 0 ? wallet.soul_per_usd : 1000;
                  const usd = Math.floor(amount / rate);
                  const selected = Math.floor(Number(redeemInput)) === amount;
                  const disabled =
                    writeDisabled || busy != null || wallet.withdrawable_soul < amount;
                  return (
                    <Pressable
                      key={amount}
                      onPress={() => setRedeemInput(String(amount))}
                      disabled={disabled}
                      accessibilityLabel={tp('soulWallet.redeemQuick', {
                        soul: String(amount),
                        usd: String(usd),
                      })}
                      style={({ pressed }) => [
                        styles.chip,
                        selected && styles.chipActive,
                        disabled && styles.btnDisabled,
                        pressed && styles.btnPressed,
                      ]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {tp('soulWallet.redeemQuick', {
                          soul: String(amount),
                          usd: String(usd),
                        })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {redeemPreviewCents > 0 ? (
                <Text style={styles.preview}>
                  {tp('soulWallet.redeemPreview', { usd: formatUsd(redeemPreviewCents) })}
                </Text>
              ) : null}
              <Pressable
                onPress={() => void onRedeem()}
                disabled={writeDisabled || busy != null || !wallet.is_enabled}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (writeDisabled || busy != null || !wallet.is_enabled) && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                {busy === 'redeem' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {wallet.is_enabled
                      ? t('soulWallet.redeemSubmit')
                      : t('soulWallet.redeemDisabled')}
                  </Text>
                )}
              </Pressable>
            </Section>

            <Section title={t('soulWallet.payoutSection')}>
              <Text style={styles.meta}>
                {tp('soulWallet.payoutModeHint', {
                  mode: wallet.payout_provider_mode || '—',
                  method: wallet.payout_method || '—',
                })}
              </Text>
              {wallet.payout_provider_mode === 'stripe_first' ? (
                <>
                  <Text style={styles.meta}>
                    {wallet.stripe_ready
                      ? t('soulWallet.stripeStatusReady')
                      : wallet.stripe_connected_account_id
                        ? t('soulWallet.stripeStatusPending')
                        : t('soulWallet.stripeStatusNone')}
                  </Text>
                  <Pressable
                    onPress={() => void onBindStripe()}
                    disabled={writeDisabled || busy != null}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      (writeDisabled || busy != null) && styles.btnDisabled,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    {busy === 'stripe' ? (
                      <ActivityIndicator color={TOKENS.colors.accent} />
                    ) : (
                      <Text style={styles.secondaryBtnText}>
                        {wallet.stripe_ready
                          ? t('soulWallet.stripeRefresh')
                          : t('soulWallet.stripeBind')}
                      </Text>
                    )}
                  </Pressable>
                  {wallet.stripe_connected_account_id ? (
                    <Pressable
                      onPress={() => void onPreferStripe()}
                      disabled={writeDisabled || busy != null}
                      style={({ pressed }) => [
                        styles.secondaryBtn,
                        (writeDisabled || busy != null) && styles.btnDisabled,
                        pressed && styles.btnPressed,
                      ]}
                    >
                      <Text style={styles.secondaryBtnText}>{t('soulWallet.stripePrefer')}</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              <Text style={styles.meta}>{t('soulWallet.payoutMethodUsdt')}</Text>
              <TextInput
                value={payoutAccount}
                onChangeText={setPayoutAccount}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('soulWallet.payoutAccountPlaceholder')}
                placeholderTextColor={TOKENS.colors.textMuted}
                editable={!writeDisabled && busy == null}
                style={styles.input}
              />
              <Pressable
                onPress={() => void onSavePayout()}
                disabled={writeDisabled || busy != null}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  (writeDisabled || busy != null) && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                {busy === 'payout' ? (
                  <ActivityIndicator color={TOKENS.colors.accent} />
                ) : (
                  <Text style={styles.secondaryBtnText}>{t('soulWallet.payoutSave')}</Text>
                )}
              </Pressable>
            </Section>

            <Section title={t('soulWallet.withdrawSection')}>
              <TextInput
                value={withdrawInput}
                onChangeText={setWithdrawInput}
                keyboardType="decimal-pad"
                placeholder={t('soulWallet.withdrawAmount')}
                placeholderTextColor={TOKENS.colors.textMuted}
                editable={!writeDisabled && busy == null}
                style={styles.input}
              />
              <Pressable
                onPress={() => void onWithdraw()}
                disabled={writeDisabled || busy != null}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (writeDisabled || busy != null) && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                {busy === 'withdraw' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('soulWallet.withdrawSubmit')}</Text>
                )}
              </Pressable>
            </Section>

            <Section title={t('soulWallet.historySection')}>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>{t('soulWallet.historyEmpty')}</Text>
              ) : (
                history.map((item) => (
                  <View key={item.withdrawal_id} style={styles.historyRow}>
                    <View style={styles.historyMain}>
                      <Text style={styles.historyAmount}>
                        {tp('soulWallet.historyAmount', {
                          amount: formatUsd(item.amount_cents),
                        })}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {tp('soulWallet.historyNet', {
                          amount: formatUsd(item.net_payout_cents),
                        })}{' '}
                        ·{' '}
                        {tp('soulWallet.historyFee', {
                          amount: formatUsd(item.fee_cents),
                        })}
                      </Text>
                    </View>
                    <Text style={styles.historyStatus}>{statusLabel(t, item.status)}</Text>
                  </View>
                ))
              )}
            </Section>
          </>
        )}
      </View>
    </DefaultShell>
  );
}

function BalanceRow({
  label,
  value,
  emphasize,
  showCoin,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  showCoin?: boolean;
}) {
  return (
    <View style={styles.balanceRow}>
      <Text style={styles.balanceLabel}>{label}</Text>
      <View style={styles.balanceValueRow}>
        {showCoin ? <DefaultSoulCoinIcon size={22} /> : null}
        <Text style={[styles.balanceValue, emphasize && styles.balanceValueEmph]}>{value}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.panel}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: 20,
  },
  contentDesktop: {
    paddingTop: 24,
    paddingHorizontal: 40,
    maxWidth: 720,
    alignSelf: 'center',
    paddingBottom: 48,
  },
  contentMobile: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  walletIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    'serif',
  ),
  subtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    'sans',
  ),
  loader: { marginVertical: 32 },
  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  banner: {
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: 'rgba(186, 60, 71, 0.45)',
    backgroundColor: 'rgba(186, 60, 71, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: Typo(
    { color: TOKENS.colors.accent, fontSize: 13, lineHeight: 18 },
    'sans',
  ),
  panel: {
    width: '100%',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as object)
      : {}),
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: Typo(
    { color: TOKENS.colors.textMuted, fontSize: 12, letterSpacing: 0.4 },
    'mono',
  ),
  balanceValue: Typo(
    { color: TOKENS.colors.text, fontSize: 18, fontWeight: '600' },
    'display',
  ),
  balanceValueEmph: {
    color: TOKENS.colors.accent,
  },
  meta: Typo(
    { color: TOKENS.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    'sans',
  ),
  section: { gap: 10 },
  sectionTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  input: {
    width: '100%',
    minHeight: 44,
    borderRadius: TOKENS.radius.input,
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
    backgroundColor: TOKENS.colors.inputBg,
    color: TOKENS.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountInput: {
    flex: 1,
    width: undefined,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
    backgroundColor: TOKENS.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxChip: {
    minWidth: 64,
    minHeight: 44,
  },
  chipActive: {
    borderColor: 'rgba(186, 60, 71, 0.55)',
    backgroundColor: 'rgba(186, 60, 71, 0.16)',
  },
  chipText: Typo(
    { color: TOKENS.colors.textMuted, fontSize: 12, fontWeight: '600' },
    'sans',
  ),
  chipTextActive: {
    color: TOKENS.colors.text,
  },
  preview: Typo(
    { color: TOKENS.colors.accent, fontSize: 13, marginTop: 2 },
    'sans',
  ),
  primaryBtn: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnText: Typo(
    { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
    'sans',
  ),
  secondaryBtn: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryBtnText: Typo(
    { color: TOKENS.colors.accent, fontSize: 14, fontWeight: '700' },
    'sans',
  ),
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.88 },
  emptyText: Typo(
    { color: TOKENS.colors.textMuted, fontSize: 13, textAlign: 'center' },
    'sans',
  ),
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TOKENS.colors.lineFaint,
  },
  historyMain: { flex: 1, gap: 4, minWidth: 0 },
  historyAmount: Typo(
    { color: TOKENS.colors.text, fontSize: 14, fontWeight: '600' },
    'sans',
  ),
  historyMeta: Typo(
    { color: TOKENS.colors.textMuted, fontSize: 12 },
    'mono',
  ),
  historyStatus: Typo(
    { color: TOKENS.colors.accent, fontSize: 12, fontWeight: '600' },
    'sans',
  ),
});
