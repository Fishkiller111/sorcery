import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { VipPaymentProvider } from '../types/api';

/** Card / Stripe Checkout — Web / Android only (App Store 3.1.1). */
export function isStripeVipCheckoutEnabled(): boolean {
  return Platform.OS !== 'ios';
}

/**
 * NOWPayments crypto invoice — same platforms as Stripe.
 * iOS digital goods stay on App Store IAP.
 */
export function isNowPaymentsCheckoutEnabled(): boolean {
  return Platform.OS !== 'ios';
}

/** @deprecated Amount floor is NOWPAYMENTS_MIN_USD; network is no longer locked to BSC. */
export const NOWPAYMENTS_BSC_THRESHOLD_USD = 11.8;

/**
 * Listed-price floor for showing crypto checkout. API may add $0.05 network gas
 * when the SKU sits under the ~$12 BSC hosted min (must stay ≤ PREMIUM $11.99).
 */
export const NOWPAYMENTS_MIN_USD = 11.8;

/** Whether a plan/pack price can use crypto checkout. */
export function isNowPaymentsAmountAllowed(priceCents: number): boolean {
  return isNowPaymentsCheckoutEnabled() && priceCents + 0.001 >= NOWPAYMENTS_MIN_USD * 100;
}

/** Native App Store In-App Purchase (StoreKit) on iOS. */
export function isAppleIapEnabled(): boolean {
  return Platform.OS === 'ios';
}

/** Web/Android external checkout providers (card or crypto). */
export type VipExternalPayMethod = Extract<VipPaymentProvider, 'stripe' | 'nowpayments'>;

export function isExternalVipCheckoutEnabled(): boolean {
  return isStripeVipCheckoutEnabled() || isNowPaymentsCheckoutEnabled();
}

/** @deprecated use isStripeVipCheckoutEnabled / isAppleIapEnabled */
export function isInAppVipCheckoutEnabled(): boolean {
  return isExternalVipCheckoutEnabled() || isAppleIapEnabled();
}

export async function openCheckoutUrl(url: string): Promise<void> {
  // Do not rely on Linking.canOpenURL for https — it can fail on iOS without query schemes.
  await Linking.openURL(url);
}
