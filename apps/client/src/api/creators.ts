import { apiFetch } from './client';
import type { CreatorProfileResp, MeFollowingCreatorsResp } from '../types/api';

/** `GET /api/v1/creators/:userId` — creator social stats (likes / fans / agents). */
export async function getCreatorProfile(userId: string): Promise<CreatorProfileResp> {
  return apiFetch<CreatorProfileResp>(`/creators/${encodeURIComponent(userId)}`);
}

/** `GET /api/v1/me/following/creators` — creators the current user follows. */
export async function listMeFollowingCreators(params?: {
  page?: number;
  page_size?: number;
}): Promise<MeFollowingCreatorsResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const query = qs.toString();
  return apiFetch<MeFollowingCreatorsResp>(`/me/following/creators${query ? `?${query}` : ''}`);
}
