import { apiFetch } from './client';
import type {
  ConsumePointsReq,
  ConsumePointsResp,
  PointsBalanceResp,
  PointsCatalogListResp,
  PointsLedgerListResp,
  PointsUnlockListResp,
} from '../types/api';

export async function getPointsCatalog(category?: string): Promise<PointsCatalogListResp> {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<PointsCatalogListResp>(`/points/catalog${q}`);
}

export async function getPointsUnlocks(): Promise<PointsUnlockListResp> {
  return apiFetch<PointsUnlockListResp>('/points/unlocks');
}

export async function consumePoints(req: ConsumePointsReq): Promise<ConsumePointsResp> {
  return apiFetch<ConsumePointsResp>('/points/consume', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export {
  getPointsBalance,
  listPointsLedger,
} from './referral';

export type { PointsBalanceResp, PointsLedgerListResp };
