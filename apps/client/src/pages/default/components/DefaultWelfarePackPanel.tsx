import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
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
import { DefaultAuthPrimaryButton } from './DefaultAuthPrimaryButton';
import { VipPayMethodBar } from '../../../components/vip/VipPayMethodBar';
import { resolveStaticUrl } from '../../../constants/config';
import { isPremiumTrialPlan } from '../../../utils/vipTrial';

const PRICE_GOLD = '#D4AF37';
const PROMO_RED = '#C44536';
const GRID_GAP = 12;

function localizedPlanText(
  t: (key: string) => string,
  plan: VipPlanItem,
  field: 'name' | 'description',
  fallback: string,
): string {
  const key = `vip.shop.welfarePlans.${plan.code}.${field}`;
  const text = t(key);
  return text === key ? fallback : text;
}

function chargeCents(plan: VipPlanItem): number {
  return plan.charge_cents && plan.charge_cents > 0 ? plan.charge_cents : plan.price_cents;
}

function promoActive(plan: VipPlanItem): boolean {
  const charge = chargeCents(plan);
  return Boolean(plan.promo_percent && plan.promo_percent > 0 && charge < plan.price_cents);
}

type DefaultWelfarePackPanelProps = {
  isDesktop: boolean;
  active?: boolean;
};

export function DefaultWelfarePackPanel({ isDesktop, active = true }: DefaultWelfarePackPanelProps) {
  const { t, tp } = useI18n();
  const stripeEnabled = isStripeVipCheckoutEnabled();
  const cryptoEnabled = isNowPaymentsCheckoutEnabled();
  const checkoutEnabled = stripeEnabled || cryptoEnabled;

  const [loading, setLoading] = useState(active);
  const [quotaPacks, setQuotaPacks] = useState<VipPlanItem[]>([]);
  const [welfarePlans, setWelfarePlans] = useState<VipPlanItem[]>([]);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<VipExternalPayMethod>('stripe');

  useEffect(() => {
    if (!stripeEnabled && cryptoEnabled) setPayMethod('nowpayments');
  }, [stripeEnabled, cryptoEnabled]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [quotaResp, welfareResp] = await Promise.all([
        getVipPlans('quota_pack'),
        getVipPlans('welfare'),
      ]);
      setQuotaPacks((quotaResp.plans || []).filter((p) => p.price_cents > 0));
      setWelfarePlans(
        (welfareResp.plans || [])
          .filter((p) => p.price_cents > 0 && !isPremiumTrialPlan(p))
          .sort((a, b) => a.price_cents - b.price_cents),
      );
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

  const resolveProvider = (priceCents: number, stripeOnly: boolean): VipExternalPayMethod | null => {
    if (stripeOnly) {
      return stripeEnabled ? 'stripe' : null;
    }
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

  const onBuy = async (plan: VipPlanItem, stripeOnly: boolean) => {
    const provider = resolveProvider(chargeCents(plan), stripeOnly);
    if (!provider) {
      if (!stripeEnabled) {
        notifyWarning(t('soulWallet.rechargeIosBlocked'));
      }
      return;
    }
    setCheckingOut(plan.id);
    try {
      const resp = await checkoutVip(plan.id, provider);
      if (!resp.checkout_url) {
        throw new Error(t('vip.shop.openCheckoutFailed'));
      }
      trackGaEvent('welfare_pack_purchase', {
        soul: plan.grant_points ?? 0,
        usd_cents: chargeCents(plan),
        plan_id: plan.id,
        product_type: plan.product_type ?? '',
        source: 'vip_shop',
        payment_provider: provider,
      });
      await openCheckoutUrl(resp.checkout_url);
      notifySuccess(
        provider === 'nowpayments' ? t('vip.shop.cryptoCheckoutOpened') : t('vip.shop.checkoutOpened'),
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setCheckingOut(null);
    }
  };

  const empty = quotaPacks.length === 0 && welfarePlans.length === 0;
  const columns = isDesktop ? 4 : 2;
  const gridStyle =
    Platform.OS === 'web'
      ? ({
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: GRID_GAP,
        } as object)
      : null;
  const cellStyle = Platform.OS === 'web' ? styles.cellWeb : isDesktop ? styles.cellDesktop : styles.cellMobile;

  return (
    <View style={styles.root}>
      <View style={styles.titleCol}>
        <Text style={styles.mainTitle}>{t('vip.shop.welfarePackageTitle')}</Text>
        <Text style={styles.subtitle}>{t('vip.shop.welfarePackageSubtitle')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={TOKENS.colors.accent} style={styles.loader} />
      ) : empty ? (
        <Text style={styles.emptyText}>{t('vip.shop.welfareEmpty')}</Text>
      ) : (
        <>
          {welfarePlans.length > 0 && checkoutEnabled ? (
            <VipPayMethodBar
              value={payMethod}
              onChange={setPayMethod}
              cryptoEnabled={cryptoEnabled && stripeEnabled}
              tone="default"
            />
          ) : null}

          <View style={[styles.grid, !isDesktop && styles.gridMobile, gridStyle]}>
            {quotaPacks.map((plan) => {
              const name = plan.name;
              const description = plan.description || '';
              const charge = chargeCents(plan);
              const onSale = promoActive(plan);
              const icon = plan.image_url ? resolveStaticUrl(plan.image_url) : '';
              const grant =
                plan.grant_reward_type === 'voice_quota'
                  ? tp('vip.shop.quotaGrantVoice', { n: plan.grant_reward_amount ?? 0 })
                  : tp('vip.shop.quotaGrantChat', { n: plan.grant_reward_amount ?? 0 });
              const showDesc = description && description !== grant;
              return (
                <View key={plan.id} style={cellStyle}>
                  <View style={[styles.card, !isDesktop && styles.cardMobile]}>
                    {onSale ? (
                      <View style={styles.promoBadge}>
                        <Text style={styles.promoBadgeText}>
                          {tp('vip.shop.quotaPackPromo', { n: plan.promo_percent ?? 20 })}
                        </Text>
                      </View>
                    ) : null}
                    {icon ? (
                      <Image
                        source={{ uri: icon }}
                        style={[styles.icon, !isDesktop && styles.iconMobile]}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text style={[styles.cardTitle, !isDesktop && styles.cardTitleMobile]} numberOfLines={2}>
                      {name}
                    </Text>
                    {showDesc ? (
                      <Text style={styles.desc} numberOfLines={2}>
                        {description}
                      </Text>
                    ) : null}
                    <View style={styles.priceRow}>
                      <Text style={[styles.price, !isDesktop && styles.priceMobile]}>
                        {formatPrice(charge, plan.currency || 'USD')}
                      </Text>
                      {onSale ? (
                        <Text style={styles.originalPrice}>
                          {formatPrice(plan.price_cents, plan.currency || 'USD')}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.meta} numberOfLines={2}>
                      {grant}
                    </Text>
                    <Text style={styles.hint} numberOfLines={2}>
                      {t('vip.shop.quotaRepeatHint')}
                    </Text>
                    <Text style={styles.hint} numberOfLines={1}>
                      {t('vip.shop.quotaStripeOnly')}
                    </Text>
                    <DefaultAuthPrimaryButton
                      label={t('vip.shop.welfareBuyNow')}
                      onPress={() => onBuy(plan, true)}
                      loading={checkingOut === plan.id}
                      disabled={checkingOut != null || !stripeEnabled}
                      style={styles.cta}
                    />
                  </View>
                </View>
              );
            })}

            {welfarePlans.map((plan) => {
              const soul = plan.grant_points ?? 0;
              const name = localizedPlanText(t, plan, 'name', plan.name);
              const description = localizedPlanText(t, plan, 'description', plan.description || '');
              return (
                <View key={plan.id} style={cellStyle}>
                  <View style={[styles.card, !isDesktop && styles.cardMobile]}>
                    <Text style={styles.sectionLabel}>{t('vip.shop.welfareSectionTitle')}</Text>
                    <Text style={[styles.cardTitle, !isDesktop && styles.cardTitleMobile]} numberOfLines={2}>
                      {name}
                    </Text>
                    {description ? (
                      <Text style={styles.desc} numberOfLines={2}>
                        {description}
                      </Text>
                    ) : null}
                    <View style={styles.priceRow}>
                      <Text style={[styles.price, !isDesktop && styles.priceMobile]}>
                        {formatPrice(plan.price_cents, plan.currency || 'USD')}
                      </Text>
                    </View>
                    <Text style={styles.meta} numberOfLines={2}>
                      {t('vip.shop.welfareGrantVip')}
                    </Text>
                    {soul > 0 ? (
                      <Text style={styles.meta} numberOfLines={2}>
                        {tp('vip.shop.welfareGrantSoul', { n: soul, usd: (soul / 1000).toFixed(0) })}
                      </Text>
                    ) : null}
                    <Text style={styles.hint} numberOfLines={2}>
                      {t('vip.shop.welfareRepeatHint')}
                    </Text>
                    <DefaultAuthPrimaryButton
                      label={t('vip.shop.welfareBuyNow')}
                      onPress={() => onBuy(plan, false)}
                      loading={checkingOut === plan.id}
                      disabled={checkingOut != null || !checkoutEnabled}
                      style={styles.cta}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: 16 },
  titleCol: { gap: 6, alignItems: 'center' },
  mainTitle: Typo(
    { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
    'serif',
  ),
  subtitle: Typo({ color: TOKENS.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 }, 'sans'),
  loader: { marginTop: 24 },
  emptyText: Typo({ color: TOKENS.colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 16 }, 'sans'),
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    alignItems: 'stretch',
  },
  gridMobile: {
    gap: 10,
  },
  cellWeb: {
    minWidth: 0,
    flex: 1,
  },
  cellDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: '23%',
    width: '23%',
    maxWidth: '23%',
    minWidth: 0,
  },
  cellMobile: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: '48%',
    width: '48%',
    maxWidth: '48%',
    minWidth: 0,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.cardLg,
    padding: 16,
    paddingTop: 20,
    gap: 6,
    backgroundColor: 'rgba(12, 14, 20, 0.72)',
    position: 'relative',
  },
  cardMobile: { padding: 12, paddingTop: 18, gap: 5 },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#111',
    alignSelf: 'center',
    marginBottom: 4,
  },
  iconMobile: { width: 52, height: 52, borderRadius: 12 },
  cardTitle: Typo({ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }, 'serif'),
  cardTitleMobile: Typo({ color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' }, 'serif'),
  promoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: PROMO_RED,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 1,
  },
  promoBadgeText: Typo({ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 }, 'sans'),
  desc: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, lineHeight: 17, textAlign: 'center' }, 'sans'),
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  price: Typo({ color: PRICE_GOLD, fontSize: 24, fontWeight: '700' }, 'serif'),
  priceMobile: Typo({ color: PRICE_GOLD, fontSize: 20, fontWeight: '700' }, 'serif'),
  originalPrice: Typo(
    { color: TOKENS.colors.textMuted, fontSize: 13, textDecorationLine: 'line-through' },
    'serif',
  ),
  meta: Typo({ color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' }, 'sans'),
  hint: Typo({ color: TOKENS.colors.textMuted, fontSize: 11, textAlign: 'center' }, 'sans'),
  sectionLabel: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'mono',
  ),
  cta: { minHeight: 42, paddingVertical: 10, marginTop: 'auto' },
});
