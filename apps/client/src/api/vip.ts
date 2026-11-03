import * as Linking from 'expo-linking';
import { apiFetch } from './client';
import { APP_SITE_URL } from '../constants/config';
import { VIP_LEGAL_READY } from '../constants/legal';
import type {
  VipCheckoutReq,
  VipCheckoutResp,
  VipMeResp,
  VipPlanListResp,
  VipVerifyCheckoutReq,
  VipVerifyCheckoutResp,
} from '../types/api';

export function vipCheckoutUrls() {
  // Prefer HTTPS app origin for Stripe redirect (more reliable than custom schemes on iOS).
  if (APP_SITE_URL) {
    return {
      success_url: `${APP_SITE_URL}/vip/success`,
      cancel_url: `${APP_SITE_URL}/vip/cancel`,
    };
  }
  return {
    success_url: Linking.createURL('/vip/success'),
    cancel_url: Linking.createURL('/vip/cancel'),
  };
}

export async function getVipMe(): Promise<VipMeResp> {
  return apiFetch<VipMeResp>('/vip/me');
}

export async function getVipPlans(
  productType?: 'entitlement' | 'points_pack' | 'welfare' | 'quota_pack',
): Promise<VipPlanListResp> {
  const q = productType ? `?product_type=${encodeURIComponent(productType)}` : '';
  return apiFetch<VipPlanListResp>(`/vip/plans${q}`);
}

/** Web / Android: Stripe or NOWPayments checkout. iOS App Store builds must not call this path. */
export async function checkoutVip(
  planId: string,
  paymentProvider: VipCheckoutReq['payment_provider'] = 'stripe',
  opts?: { grantPoints?: number },
): Promise<VipCheckoutResp> {
  // 防止其他充值入口绕过用户协议配置检查。
  if (!VIP_LEGAL_READY) throw new Error('Privacy policy and terms URLs must be configured before purchases.');
  const urls = vipCheckoutUrls();
  const body: VipCheckoutReq = {
    plan_id: planId,
    payment_provider: paymentProvider,
    success_url: urls.success_url,
    cancel_url: urls.cancel_url,
  };
  if (opts?.grantPoints != null && opts.grantPoints > 0) {
    body.grant_points = opts.grantPoints;
  }
  return apiFetch<VipCheckoutResp>('/vip/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function verifyVipCheckout(orderId: string): Promise<VipVerifyCheckoutResp> {
  return apiFetch<VipVerifyCheckoutResp>('/vip/checkout/verify', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId } satisfies VipVerifyCheckoutReq),
  });
}

export type VipAppleVerifyReq = {
  signed_transaction: string;
  product_id?: string;
};

export type VipAppleVerifyResp = {
  order_id: string;
  status: string;
  transaction_id: string;
  product_id: string;
  vip?: VipMeResp;
};

/** Verify a StoreKit 2 signed transaction and grant VIP entitlement. */
export async function verifyAppleIapPurchase(req: VipAppleVerifyReq): Promise<VipAppleVerifyResp> {
  return apiFetch<VipAppleVerifyResp>('/vip/apple/verify', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
