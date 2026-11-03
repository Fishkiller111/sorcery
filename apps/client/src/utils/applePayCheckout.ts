import type { VipPlanItem } from '../types/api';
import { formatPrice } from '../utils/vipPlans';

/**
 * Apple Pay (PassKit) is intentionally disabled on all platforms.
 * iOS digital VIP uses StoreKit IAP only (Guideline 3.1.1 / 2.1 PassKit cleanup).
 * Web / Android VIP uses Stripe Checkout via browser — no native Stripe SDK.
 */

export function isApplePayConfigured(): boolean {
  return false;
}

export async function checkApplePaySupported(): Promise<boolean> {
  return false;
}

export type ApplePayCheckoutResult =
  | { status: 'paid'; orderId: string }
  | { status: 'canceled' }
  | { status: 'failed'; error: unknown };

export async function checkoutWithApplePay(_plan: VipPlanItem): Promise<ApplePayCheckoutResult> {
  return {
    status: 'failed',
    error: new Error('Apple Pay is not offered; use In-App Purchase on iOS'),
  };
}

export function applePayDisplayPrice(plan: VipPlanItem): string {
  return formatPrice(plan.price_cents, plan.currency);
}
