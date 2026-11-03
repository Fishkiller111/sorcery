import type { VipPlanItem } from '../types/api';
import { formatPrice } from '../utils/vipPlans';

/** Web: Apple Pay / Platform Pay not used. */
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
  return { status: 'failed', error: new Error('Apple Pay is not available on web') };
}

export function applePayDisplayPrice(plan: VipPlanItem): string {
  return formatPrice(plan.price_cents, plan.currency);
}
