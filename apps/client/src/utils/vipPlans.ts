import type { VipPlanItem } from '../types/api';

export type VipTier = 'basic' | 'premium' | 'ultimate';
export type BillingPeriod = 'monthly' | 'yearly';

/** 年付固定 8 折（即 20% OFF） */
export const YEARLY_DISCOUNT_PERCENT = 20;

/**
 * PREMIUM / ULTIMATE 月付前 3 个月特惠 — 划线原价（分）。
 * PREMIUM：$11.99 ← $19.90；ULTIMATE 按同折扣比：$19.90 ← $33.03
 * （1990 × 1990 / 1199 ≈ 3303）
 */
export const MONTHLY_INTRO_ORIGINAL_CENTS: Partial<Record<VipTier, number>> = {
  premium: 1990,
  ultimate: Math.round((1990 * 1990) / 1199),
};

/** 月付前 3 个月特惠划线原价；无特惠档位返回 undefined。 */
export function monthlyIntroOriginalCents(tier: VipTier): number | undefined {
  const cents = MONTHLY_INTRO_ORIGINAL_CENTS[tier];
  return cents && cents > 0 ? cents : undefined;
}

const TIER_ORDER: VipTier[] = ['basic', 'premium', 'ultimate'];

/** VIP 档位展示顺序（低 → 高） */
export const VIP_TIER_ORDER: readonly VipTier[] = TIER_ORDER;

export function inferTier(plan: VipPlanItem): VipTier {
  const code = plan.code.toLowerCase();
  const name = plan.name.toLowerCase();

  // ultimate 优先于 all_access / premium 关键字
  if (
    code.includes('ultimate') ||
    name.includes('ultimate') ||
    code.includes('all_access')
  ) {
    return 'ultimate';
  }

  if (
    code.includes('premium') ||
    code.includes('chat_monthly') ||
    code.includes('chat_yearly') ||
    name.includes('premium')
  ) {
    return 'premium';
  }

  if (code.includes('basic') || code.includes('free_chat') || name.includes('basic')) {
    return 'basic';
  }

  return 'basic';
}

export function inferPeriod(plan: VipPlanItem): BillingPeriod {
  if (plan.duration_unit === 'year' || (plan.duration_unit === 'month' && plan.duration_value >= 12)) {
    return 'yearly';
  }
  return 'monthly';
}

export function findPlan(
  plans: VipPlanItem[],
  tier: VipTier,
  period: BillingPeriod,
): VipPlanItem | undefined {
  return plans.find((p) => inferTier(p) === tier && inferPeriod(p) === period);
}

/** Tiers that have at least one App Store IAP SKU (hide empty Basic etc. on iOS). */
export function tiersWithAppleIap(plans: VipPlanItem[]): VipTier[] {
  const present = new Set<VipTier>();
  for (const plan of plans) {
    if (!plan.apple_product_id?.trim()) continue;
    if (plan.price_cents <= 0) continue;
    present.add(inferTier(plan));
  }
  return VIP_TIER_ORDER.filter((tier) => present.has(tier));
}

export function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency.toUpperCase() === 'USD' ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}

export function monthlyEquivalent(plan: VipPlanItem): number {
  if (inferPeriod(plan) === 'monthly') return plan.price_cents;
  const months = plan.duration_unit === 'year' ? plan.duration_value * 12 : plan.duration_value;
  return Math.round(plan.price_cents / Math.max(months, 1));
}

export function yearlyOriginalCents(monthlyPlan?: VipPlanItem): number | undefined {
  if (!monthlyPlan || monthlyPlan.price_cents <= 0) return undefined;
  return monthlyPlan.price_cents * 12;
}

/** PREMIUM / ULTIMATE shop plan codes (align with inferTier). */
export function isPremiumPlusPlanCode(planCode?: string | null): boolean {
  const code = (planCode || '').toLowerCase();
  if (!code || code === 'free' || code.includes('basic')) return false;
  return (
    code.includes('premium') ||
    code.includes('chat_monthly') ||
    code.includes('chat_yearly') ||
    code.includes('all_access') ||
    code.includes('ultimate') ||
    code.includes('welfare')
  );
}

/**
 * Voice call gate: prefer permissions.voice_call when API sends it.
 * If the field is missing (older API), fall back to active PREMIUM+ plan_code.
 */
export function canUseVoiceCall(vip?: {
  is_active?: boolean;
  plan_code?: string;
  permissions?: { voice_call?: boolean };
} | null): boolean {
  if (!vip) return false;
  if (typeof vip.permissions?.voice_call === 'boolean') {
    return vip.permissions.voice_call;
  }
  return Boolean(vip.is_active) && isPremiumPlusPlanCode(vip.plan_code);
}

/**
 * Request-photo gate: prefer permissions.request_photo; fall back to PREMIUM+.
 */
export function canRequestPhoto(vip?: {
  is_active?: boolean;
  plan_code?: string;
  permissions?: { request_photo?: boolean };
} | null): boolean {
  if (!vip) return false;
  if (typeof vip.permissions?.request_photo === 'boolean') {
    return vip.permissions.request_photo;
  }
  return Boolean(vip.is_active) && isPremiumPlusPlanCode(vip.plan_code);
}
