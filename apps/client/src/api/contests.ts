import { apiFetch } from './client';
import type {
  ContestDetailResp,
  ContestLeaderboardResp,
  ContestListResp,
} from '../types/api';

export function fetchLiveContests() {
  return apiFetch<ContestListResp>('/contests/live');
}

export function fetchContestDetail(slug: string) {
  return apiFetch<ContestDetailResp>(`/contests/${encodeURIComponent(slug)}`);
}

export function fetchContestLeaderboard(
  slug: string,
  page = 1,
  hideMature = false,
  pageSize = 50,
) {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    hide_mature: hideMature ? '1' : '0',
  });
  return apiFetch<ContestLeaderboardResp>(
    `/contests/${encodeURIComponent(slug)}/leaderboard?${qs.toString()}`,
  );
}
