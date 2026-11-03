import { apiFetch } from './client';
import type { WorldviewDetailResp, WorldviewListResp } from '../types/api';

export async function listWorldviews(): Promise<WorldviewListResp> {
  return apiFetch<WorldviewListResp>('/worldviews');
}

export async function getWorldview(worldviewId: string): Promise<WorldviewDetailResp> {
  return apiFetch<WorldviewDetailResp>(`/worldviews/${worldviewId}`);
}
