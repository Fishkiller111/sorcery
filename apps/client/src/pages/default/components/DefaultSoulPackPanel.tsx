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
import { useI18n } from '../../../i18n/I18nContext';
import { checkoutVip, getVipPlans } from '../../../api/vip';
import type { VipPlanItem } from '../../../types/api';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';
import { formatApiError } from '../../../utils/roleForm';
import { notifyError, notifySuccess, notifyWarning } from '../../../utils/notify';
import { trackGaEvent } from '../../../utils/analytics';
import {
  isNowPaymentsAmountAllowed,
  isNowPaymentsCheckoutEnabled,
  isStripeVipCheckoutEnabled,
  openCheckoutUrl,
  type VipExternalPayMethod,
} from '../../../utils/vipPurchase';
import { formatPrice } from '../../../utils/vipPlans';
import {
  customSoulPriceCents,
  resolveCustomMinPoints,
  resolveCustomStepPoints,
  snapCustomSoul,
  SOUL_PURCHASE_MIN_USD,
} from '../../../utils/soulRecharge';
import { DefaultAuthPrimaryButton } from './DefaultAuthPrimaryButton';
import { DefaultSoulCoinIcon } from './DefaultSoulCoinIcon';
import { VipPayMethodBar } from '../../../components/vip/VipPayMethodBar';

const PRICE_GOLD = '#D4AF37';
const CARD_GAP = 16;

type DefaultSoulPackPanelProps = {
  isDesktop: boolean;
  active?: boolean;
};

export function DefaultSoulPackPanel({ isDesktop, active = true }: DefaultSoulPackPanelProps) {
  const { t, tp } = useI18n();
  const stripeEnabled = isStripeVipCheckoutEnabled();
  const cryptoEnabled = isNowPaymentsCheckoutEnabled();
  const checkoutEnabled = stripeEnabled || cryptoEnabled;

  const [loading, setLoading] = useState(active);
  const [customPlan, setCustomPlan] = useState<VipPlanItem | null>(null);
  const [fixedPacks, setFixedPacks] = useState<VipPlanItem[]>([]);
  const [customSoul, setCustomSoul] = useState(5000);
  const [customSoulText, setCustomSoulText] = useState('5000');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<VipExternalPayMethod>('stripe');

  useEffect(() => {
    if (!stripeEnabled && cryptoEnabled) setPayMethod('nowpayments');
  }, [stripeEnabled, cryptoEnabled]);

  const resolveProvider = (priceCents: number): VipExternalPayMethod | null => {
    if (payMethod === 'nowpayments' && cryptoEnabled) {
      if (!isNowPaymentsAmountAllowed(priceCents)) {
        notifyWarning(t('vip.shop.cryptoMinAmount'));
        return null;
      }
      return 'nowpayments';
    }
    if (stripeEnabled) return 'stripe';
    if (cryptoEnabled && isNowPaymentsAmountAllowed(priceCents)) return 'nowpayments';
    return null;
  };

  const customMin = resolveCustomMinPoints(customPlan?.custom_min_points);
  const customStep = resolveCustomStepPoints(customPlan?.custom_step_points);
  const rechargePriceCents = useMemo(() => customSoulPriceCents(customSoul), [customSoul]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await getVipPlans('points_pack');
      const plans = (resp.plans || []).filter((p) => p.is_custom_recharge || p.price_cents > 0);
      const custom = plans.find((p) => p.is_custom_recharge) || null;
      const fixed = plans
        .filter(
          (p) =>
            !p.is_custom_recharge &&
            (p.grant_points ?? 0) > 0 &&
            p.price_cents >= SOUL_PURCHASE_MIN_USD * 100,
        )
        .sort((a, b) => a.price_cents - b.price_cents || (a.grant_points ?? 0) - (b.grant_points ?? 0));
      setCustomPlan(custom);
      setFixedPacks(fixed);
      if (custom) {
        const min = resolveCustomMinPoints(custom.custom_min_points);
        setCustomSoul(min);
        setCustomSoulText(String(min));
      }
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  const applyCustomSoul = (next: number) => {
    const snapped = snapCustomSoul(next, customMin, customStep);
    setCustomSoul(snapped);
    setCustomSoulText(String(snapped));
  };

  const onCustomSoulBlur = () => {
    const n = Math.floor(Number(customSoulText));
    applyCustomSoul(Number.isFinite(n) ? n : customMin);
  };

  const onBuyCustom = async () => {
    if (!customPlan) return;
    if (customSoul < customMin || customSoul % customStep !== 0) {
      notifyWarning(t('soulWallet.rechargeInvalidAmount'));
      return;
    }
    const provider = resolveProvider(rechargePriceCents);
    if (!provider) {
      if (!(stripeEnabled || cryptoEnabled)) {
        notifyWarning(t('soulWallet.rechargeIosBlocked'));
      }
      return;
    }
    setCheckingOut('custom');
    try {
      const resp = await checkoutVip(customPlan.id, provider, { grantPoints: customSoul });
      if (!resp.checkout_url) {
        throw new Error(t('soulWallet.rechargeOpenFailed'));
      }
      trackGaEvent('soul_custom_recharge', {
        soul: customSoul,
        usd_cents: rechargePriceCents,
        plan_id: customPlan.id,
        source: 'vip_shop',
        payment_provider: provider,
      });
      await openCheckoutUrl(resp.checkout_url);
      notifySuccess(
        provider === 'nowpayments'
          ? t('vip.shop.cryptoCheckoutOpened')
          : t('soulWallet.rechargeOpened'),
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setCheckingOut(null);
    }
  };

  const onBuyFixed = async (plan: VipPlanItem) => {
    const provider = resolveProvider(plan.price_cents);
    if (!provider) {
      if (!(stripeEnabled || cryptoEnabled)) {
        notifyWarning(t('soulWallet.rechargeIosBlocked'));
      }
      return;
    }
    setCheckingOut(plan.id);
    try {
      const resp = await checkoutVip(plan.id, provider);
      if (!resp.checkout_url) {
        throw new Error(t('soulWallet.rechargeOpenFailed'));
      }
      trackGaEvent('soul_fixed_pack_purchase', {
        soul: plan.grant_points ?? 0,
        usd_cents: plan.price_cents,
        plan_id: plan.id,
        source: 'vip_shop',
        payment_provider: provider,
      });
      await openCheckoutUrl(resp.checkout_url);
      notifySuccess(
        provider === 'nowpayments'
          ? t('vip.shop.cryptoCheckoutOpened')
          : t('soulWallet.rechargeOpened'),
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setCheckingOut(null);
    }
  };

  const empty = !customPlan && fixedPacks.length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.titleCol}>
        <DefaultSoulCoinIcon size={isDesktop ? 88 : 72} />
        <Text style={styles.mainTitle}>{t('vip.shop.soulPackageTitle')}</Text>
        <Text style={styles.subtitle}>{t('vip.shop.soulPackageSubtitle')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={TOKENS.colors.accent} style={styles.loader} />
      ) : empty ? (
        <Text style={styles.emptyText}>{t('vip.shop.soulEmpty')}</Text>
      ) : (
        <>
          {checkoutEnabled ? (
            <VipPayMethodBar
              value={payMethod}
              onChange={setPayMethod}
              cryptoEnabled={cryptoEnabled && stripeEnabled}
              tone="default"
            />
          ) : null}
          {customPlan ? (
            <View style={[styles.customCard, !isDesktop && styles.customCardMobile]}>
              <View style={styles.cardTitleRow}>
                <DefaultSoulCoinIcon size={28} />
                <Text style={styles.cardTitle}>{t('vip.shop.soulCustomTitle')}</Text>
              </View>
              <Text style={styles.meta}>{t('soulWallet.rechargeNotWithdrawable')}</Text>
              <Text style={styles.meta}>
                {tp('soulWallet.rechargeRule', {
                  min: String(customMin),
                  step: String(customStep),
                  usd: formatPrice(customSoulPriceCents(customMin), 'USD'),
                })}
              </Text>

              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => applyCustomSoul(customSoul - customStep)}
                  disabled={checkingOut != null || customSoul <= customMin}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    (checkingOut != null || customSoul <= customMin) && styles.btnDisabled,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityLabel={t('soulWallet.rechargeMinus')}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <TextInput
                  value={customSoulText}
                  onChangeText={setCustomSoulText}
                  onBlur={onCustomSoulBlur}
                  keyboardType="number-pad"
                  editable={checkingOut == null}
                  style={[styles.input, styles.stepperInput]}
                />
                <Pressable
                  onPress={() => applyCustomSoul(customSoul + customStep)}
                  disabled={checkingOut != null}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    checkingOut != null && styles.btnDisabled,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityLabel={t('soulWallet.rechargePlus')}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.priceBlock}>
                <Text style={styles.priceMain}>
                  {formatPrice(rechargePriceCents, customPlan.currency || 'USD')}
                </Text>
                <Text style={styles.priceHint}>
                  {tp('soulWallet.rechargePreview', {
                    soul: String(customSoul),
                    usd: formatPrice(rechargePriceCents, customPlan.currency || 'USD'),
                  })}
                </Text>
              </View>

              {!checkoutEnabled ? (
                <Text style={styles.meta}>{t('soulWallet.rechargeIosBlocked')}</Text>
              ) : null}

              <DefaultAuthPrimaryButton
                label={t('vip.shop.soulBuyNow')}
                onPress={() => void onBuyCustom()}
                disabled={!checkoutEnabled || checkingOut != null}
                loading={checkingOut === 'custom'}
                style={styles.cta}
              />
            </View>
          ) : null}

          {fixedPacks.length > 0 ? (
            <View style={styles.fixedSection}>
              <Text style={styles.sectionLabel}>{t('vip.shop.soulFixedSection')}</Text>
              <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
                {fixedPacks.map((plan) => {
                  const busy = checkingOut === plan.id;
                  return (
                    <View
                      key={plan.id}
                      style={[styles.cardCell, isDesktop && styles.cardCellDesktop]}
                    >
                      <View style={styles.fixedCard}>
                        <View style={styles.cardTitleRow}>
                          <DefaultSoulCoinIcon size={28} />
                          <Text style={styles.cardTitle}>
                            {plan.name?.trim() ||
                              tp('vip.shop.soulGrantLabel', { n: String(plan.grant_points ?? 0) })}
                          </Text>
                        </View>
                        <View style={styles.grantRow}>
                          <DefaultSoulCoinIcon size={18} />
                          <Text style={styles.grantText}>
                            {tp('vip.shop.soulGrantLabel', { n: String(plan.grant_points ?? 0) })}
                          </Text>
                        </View>
                        {plan.description ? (
                          <Text style={styles.meta} numberOfLines={2}>
                            {plan.description}
                          </Text>
                        ) : null}
                        <Text style={styles.priceMain}>
                          {formatPrice(plan.price_cents, plan.currency || 'USD')}
                        </Text>
                        <DefaultAuthPrimaryButton
                          label={t('vip.shop.soulBuyNow')}
                          onPress={() => void onBuyFixed(plan)}
                          disabled={!checkoutEnabled || checkingOut != null}
                          loading={busy}
                          style={styles.cta}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 20,
  },
  titleCol: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mainTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600',
      letterSpacing: 2.4,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'serif',
  ),
  subtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },
    'sans',
  ),
  loader: {
    marginVertical: 48,
  },
  emptyText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginVertical: 32,
    },
    'sans',
  ),
  customCard: {
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.45)',
    backgroundColor: TOKENS.colors.card,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 10,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 40px rgba(0,0,0,0.35)' } as object) : null),
  },
  customCardMobile: {
    paddingHorizontal: 18,
  },
  cardTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 0,
      flex: 1,
      minWidth: 0,
    },
    'serif',
  ),
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  grantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    'sans',
  ),
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 22,
      fontWeight: '600',
      lineHeight: 26,
    },
    'sans',
  ),
  input: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.button,
    backgroundColor: 'rgba(0,0,0,0.28)',
    color: TOKENS.colors.text,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: 16,
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceBlock: {
    marginTop: 8,
    marginBottom: 4,
    gap: 4,
  },
  priceMain: Typo(
    {
      color: PRICE_GOLD,
      fontSize: 36,
      lineHeight: 42,
      fontWeight: '700',
    },
    'display',
  ),
  priceHint: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
    },
    'sans',
  ),
  cta: {
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.85,
  },
  fixedSection: {
    gap: 14,
  },
  sectionLabel: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  cardCell: {
    flexGrow: 1,
    minWidth: 0,
    width: '100%',
  },
  cardCellDesktop: {
    flexBasis: '30%',
    maxWidth: '32%',
  },
  fixedCard: {
    flex: 1,
    minHeight: 200,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    gap: 8,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 40px rgba(0,0,0,0.35)' } as object) : null),
  },
  grantText: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    'sans',
  ),
});
