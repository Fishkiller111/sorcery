import { apiFetch } from './client';
import type {
  SoulPayoutAccountReq,
  SoulPayoutAccountResp,
  SoulRedeemReq,
  SoulRedeemResp,
  SoulStripeOnboardingReq,
  SoulStripeOnboardingResp,
  SoulWalletResp,
  SoulWithdrawalsResp,
  SoulWithdrawReq,
  SoulWithdrawResp,
} from '../types/api';

export async function getSoulWallet(): Promise<SoulWalletResp> {
  return apiFetch<SoulWalletResp>('/soul/wallet');
}

export async function redeemSoul(req: SoulRedeemReq): Promise<SoulRedeemResp> {
  return apiFetch<SoulRedeemResp>('/soul/redeem', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function requestSoulWithdraw(req: SoulWithdrawReq): Promise<SoulWithdrawResp> {
  return apiFetch<SoulWithdrawResp>('/soul/withdrawals', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function listSoulWithdrawals(page = 1, limit = 20): Promise<SoulWithdrawalsResp> {
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiFetch<SoulWithdrawalsResp>(`/soul/withdrawals?${q.toString()}`);
}

export async function updateSoulPayoutAccount(
  req: SoulPayoutAccountReq,
): Promise<SoulPayoutAccountResp> {
  return apiFetch<SoulPayoutAccountResp>('/soul/payout-account', {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

export async function startSoulStripeOnboarding(
  req: SoulStripeOnboardingReq = {},
): Promise<SoulStripeOnboardingResp> {
  return apiFetch<SoulStripeOnboardingResp>('/soul/stripe/onboarding', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
