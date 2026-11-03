import type { VipPlanItem } from '../types/api';
import { isPremiumPlusPlanCode } from './vipPlans';

/** Welfare SKU: 7-day PREMIUM trial at $0.99 (list $4.99 in UI). */
export const PREMIUM_TRIAL_PLAN_CODE = 'welfare_premium_trial_7d';

/** Strikethrough list price shown in the VIP shop hero ($4.99). */
export const PREMIUM_TRIAL_LIST_PRICE_CENTS = 499;

export function isPremiumTrialPlan(plan: Pick<VipPlanItem, 'code'>): boolean {
  return plan.code === PREMIUM_TRIAL_PLAN_CODE;
}

export function findPremiumTrialPlan(plans: VipPlanItem[]): VipPlanItem | undefined {
  return plans.find((p) => isPremiumTrialPlan(p) && p.price_cents > 0);
}

export function trialChargeCents(plan: VipPlanItem): number {
  return plan.charge_cents && plan.charge_cents > 0 ? plan.charge_cents : plan.price_cents;
}

/** Whether the user can purchase the first-week trial (not for display gating). */
export function canPurchasePremiumTrial(
  vip: { is_active?: boolean; plan_code?: string } | null | undefined,
  trialPlan?: VipPlanItem,
): boolean {
  if (!trialPlan) return false;
  if (vip?.is_active && isPremiumPlusPlanCode(vip.plan_code)) return false;
  return true;
}

/** Trial checkout: Stripe (web/Android) or StoreKit when apple_product_id is mapped. */
export function isPremiumTrialCheckoutEnabled(opts: {
  stripeEnabled: boolean;
  appleIapEnabled: boolean;
  trialPlan?: VipPlanItem;
  trialPurchasable: boolean;
}): boolean {
  const { stripeEnabled, appleIapEnabled, trialPlan, trialPurchasable } = opts;
  if (!trialPurchasable) return false;
  const appleTrial = Boolean(appleIapEnabled && trialPlan?.apple_product_id?.trim());
  return stripeEnabled || appleTrial;
}

/** @deprecated Use canPurchasePremiumTrial — trial card is always shown on PREMIUM tier. */
export const shouldShowPremiumTrialCard = canPurchasePremiumTrial;
