import { apiFetch } from './client';

export type EroticSceneStatItem = {
  category: string;
  label: string;
  hit_count: number;
};

export type EroticAddictionItem = {
  category: string;
  label: string;
  status: string;
  unlocked_at?: string;
  last_fed_at?: string;
  freshness?: string;
};

export type EroticKinksMeResp = {
  role_id: string;
  stats: EroticSceneStatItem[];
  addictions: EroticAddictionItem[];
  active_count: number;
  reward_tiers_claimed: string[];
  maintain_pressure: string;
};

export type EroticAddictionUnlockedPayload = {
  role_id: string;
  category: string;
  label: string;
  active_count: number;
  is_first_for_role: boolean;
  all9_achieved: boolean;
  reward_points: number;
};

/** `GET /api/v1/explore/roles/:id/erotic-kinks/me` */
export function getEroticKinksMe(roleId: string): Promise<EroticKinksMeResp> {
  return apiFetch(`/explore/roles/${encodeURIComponent(roleId)}/erotic-kinks/me`);
}
