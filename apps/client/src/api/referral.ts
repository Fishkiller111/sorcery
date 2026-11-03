import { apiFetch } from './client';
import type {
  PointsBalanceResp,
  PointsLedgerListResp,
  ReferralInviteListResp,
  ReferralMeResp,
  ReferralValidateResp,
} from '../types/api';

export async function validateReferral(code: string): Promise<ReferralValidateResp> {
  const q = new URLSearchParams({ code: code.trim() });
  return apiFetch<ReferralValidateResp>(`/referral/validate?${q.toString()}`);
}

export async function getReferralMe(): Promise<ReferralMeResp> {
  return apiFetch<ReferralMeResp>('/referral/me');
}

export async function listReferralInvites(page = 1, limit = 20): Promise<ReferralInviteListResp> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch<ReferralInviteListResp>(`/referral/invites?${q.toString()}`);
}

export async function getPointsBalance(): Promise<PointsBalanceResp> {
  return apiFetch<PointsBalanceResp>('/points/balance');
}

export async function listPointsLedger(page = 1, limit = 20): Promise<PointsLedgerListResp> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch<PointsLedgerListResp>(`/points/ledger?${q.toString()}`);
}
