import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { checkoutVip, getVipPlans } from '../../api/vip';
import { useVipStore } from '../../stores/vipStore';
import { formatApiError } from '../../utils/roleForm';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { findPlan, tiersWithAppleIap, VIP_TIER_ORDER, type VipTier } from '../../utils/vipPlans';
import {
  findPremiumTrialPlan,
  canPurchasePremiumTrial,
  isPremiumTrialCheckoutEnabled,
} from '../../utils/vipTrial';
import type { VipPlanItem } from '../../types/api';
import {
  isAppleIapEnabled,
  isNowPaymentsAmountAllowed,
  isNowPaymentsCheckoutEnabled,
  isStripeVipCheckoutEnabled,
  openCheckoutUrl,
  type VipExternalPayMethod,
} from '../../utils/vipPurchase';
import { useAppleVipPurchase } from '../../hooks/useAppleVipPurchase';
import { VipShopHeader } from './VipShopHeader';
import { VipPricingCards } from './VipPricingCards';
import { VipRestorePurchasesButton } from './VipRestorePurchasesButton';
import { VipSubscriptionLegalLinks, VIP_LEGAL_READY } from './VipSubscriptionLegalLinks';
import { VipPayMethodBar } from './VipPayMethodBar';

type VipSubscribePanelProps = {
  contentWidth: number;
  isDesktop?: boolean;
  /** When false, skip fetching plans (e.g. modal hidden). Defaults to true. */
  active?: boolean;
  onTierChange?: (tier: VipTier) => void;
};

export function VipSubscribePanel({
  contentWidth,
  isDesktop = false,
  active = true,
  onTierChange,
}: VipSubscribePanelProps) {
  const { t } = useI18n();
  const vip = useVipStore((s) => s.vip);
  const fetchVip = useVipStore((s) => s.fetchVip);
  const stripeEnabled = isStripeVipCheckoutEnabled();
  const cryptoEnabled = isNowPaymentsCheckoutEnabled();
  const appleIapEnabled = isAppleIapEnabled();
  const purchaseEnabled = VIP_LEGAL_READY && (stripeEnabled || cryptoEnabled || appleIapEnabled);
  const { purchaseSubscription, restorePurchases } = useAppleVipPurchase(t);

  const [plans, setPlans] = useState<VipPlanItem[]>([]);
  const [trialPlan, setTrialPlan] = useState<VipPlanItem | undefined>();
  const [selectedTier, setSelectedTier] = useState<VipTier>('premium');
  const [payMethod, setPayMethod] = useState<VipExternalPayMethod>('stripe');
  const [loading, setLoading] = useState(active);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!stripeEnabled && cryptoEnabled) setPayMethod('nowpayments');
  }, [stripeEnabled, cryptoEnabled]);

  const visibleTiers = useMemo(() => {
    if (!appleIapEnabled) return VIP_TIER_ORDER;
    const iapTiers = tiersWithAppleIap(plans);
    return iapTiers.length ? iapTiers : VIP_TIER_ORDER;
  }, [appleIapEnabled, plans]);

  useEffect(() => {
    if (!visibleTiers.includes(selectedTier) && visibleTiers[0]) {
      setSelectedTier(visibleTiers[0]);
      onTierChange?.(visibleTiers[0]);
    }
  }, [visibleTiers, selectedTier, onTierChange]);

  const monthlyPlan = useMemo(
    () => findPlan(plans, selectedTier, 'monthly'),
    [plans, selectedTier],
  );
  const yearlyPlan = useMemo(
    () => findPlan(plans, selectedTier, 'yearly'),
    [plans, selectedTier],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planResp, welfareResp] = await Promise.all([
        getVipPlans('entitlement'),
        getVipPlans('welfare'),
        fetchVip(),
      ]);
      const purchasable = planResp.plans.filter((p) => p.price_cents > 0);
      setPlans(
        appleIapEnabled
          ? purchasable.filter((p) => Boolean(p.apple_product_id?.trim()))
          : purchasable,
      );
      setTrialPlan(findPremiumTrialPlan(welfareResp.plans || []));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setLoading(false);
    }
  }, [appleIapEnabled, fetchVip, t]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  const trialPurchasable = canPurchasePremiumTrial(vip, trialPlan);

  const resolvePlan = (planId: string): VipPlanItem | undefined => {
    return plans.find((p) => p.id === planId) ?? (trialPlan?.id === planId ? trialPlan : undefined);
  };

  const onCheckout = async (planId: string, opts?: { stripeOnly?: boolean }) => {
    // 未配置服务条款或隐私政策时，不允许发起购买。
    if (!VIP_LEGAL_READY) return;
    if (appleIapEnabled) {
      const plan = resolvePlan(planId);
      const appleProductId = plan?.apple_product_id?.trim();
      if (!appleProductId) {
        notifyError(t('vip.shop.appleIapMissingProduct'));
        return;
      }
      setCheckingOut(`${planId}:apple`);
      try {
        await purchaseSubscription(appleProductId);
      } catch (e) {
        notifyError(formatApiError(t, e));
      } finally {
        setCheckingOut(null);
      }
      return;
    }

    const plan = resolvePlan(planId);
    const stripeOnly = opts?.stripeOnly ?? plan?.product_type === 'welfare';
    let provider: VipExternalPayMethod = 'stripe';
    if (!stripeOnly) {
      provider =
        payMethod === 'nowpayments' && cryptoEnabled
          ? 'nowpayments'
          : stripeEnabled
            ? 'stripe'
            : cryptoEnabled
              ? 'nowpayments'
              : 'stripe';
    }

    if (provider === 'stripe' && !stripeEnabled) {
      notifyWarning(t('vip.shop.iosPurchaseBlocked'));
      return;
    }
    if (provider === 'nowpayments' && !cryptoEnabled) {
      notifyWarning(t('vip.shop.iosPurchaseBlocked'));
      return;
    }
    if (provider === 'nowpayments' && !isNowPaymentsAmountAllowed(plan?.price_cents ?? 0)) {
      notifyWarning(t('vip.shop.cryptoMinAmount'));
      return;
    }

    setCheckingOut(`${planId}:${provider}`);
    try {
      const resp = await checkoutVip(planId, provider);
      if (!resp.checkout_url) {
        throw new Error(t('vip.shop.openCheckoutFailed'));
      }
      await openCheckoutUrl(resp.checkout_url);
      notifySuccess(
        provider === 'nowpayments'
          ? t('vip.shop.cryptoCheckoutOpened')
          : t('vip.shop.checkoutOpened'),
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setCheckingOut(null);
    }
  };

  const currentPlanLabel = vip?.plan_name || (vip ? t('vip.shop.freePlan') : undefined);

  const handleTierChange = useCallback(
    (tier: VipTier) => {
      setSelectedTier(tier);
      onTierChange?.(tier);
    },
    [onTierChange],
  );

  const onRestorePurchases = useCallback(async () => {
    setRestoring(true);
    try {
      await restorePurchases();
    } finally {
      setRestoring(false);
    }
  }, [restorePurchases]);

  return (
    <View style={[styles.root, { width: contentWidth }]}>
      <VipShopHeader
        selectedTier={selectedTier}
        onTierChange={handleTierChange}
        contentWidth={contentWidth}
        isDesktop={isDesktop}
        currentPlanLabel={currentPlanLabel}
        tiers={visibleTiers}
      />

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent.redDark} style={styles.loader} />
      ) : (
        <>
          {!appleIapEnabled && (stripeEnabled || cryptoEnabled) ? (
            <VipPayMethodBar
              value={payMethod}
              onChange={setPayMethod}
              cryptoEnabled={cryptoEnabled && stripeEnabled}
              tone="soviet"
            />
          ) : null}
          <VipPricingCards
            tier={selectedTier}
            monthlyPlan={monthlyPlan}
            yearlyPlan={yearlyPlan}
            trialPlan={selectedTier === 'premium' ? trialPlan : undefined}
            trialPurchaseEnabled={VIP_LEGAL_READY && isPremiumTrialCheckoutEnabled({
              stripeEnabled,
              appleIapEnabled,
              trialPlan,
              trialPurchasable,
            })}
            contentWidth={contentWidth}
            checkingOut={checkingOut}
            onSubscribe={onCheckout}
            purchaseEnabled={purchaseEnabled}
          />
          {appleIapEnabled ? (
            <VipRestorePurchasesButton
              tone="soviet"
              loading={restoring}
              onPress={() => {
                void onRestorePurchases();
              }}
            />
          ) : null}
          <VipSubscriptionLegalLinks tone="soviet" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
  loader: {
    marginVertical: 40,
  },
});
