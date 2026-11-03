import { apiFetch } from './client';

export type LeaderboardKind = 'soulmaker' | 'character';

export type LeaderboardItem = {
  rank: number;
  user_id?: string;
  nickname?: string;
  email?: string;
  avatar_url?: string;
  agents_like_total?: number;
  agents_follower_total?: number;
  agents_gift_points_total?: number;
  agents_view_total?: number;
  follower_count?: number;
  like_count?: number;
  published_agent_count?: number;
  role_id?: string;
  role_name?: string;
  role_avatar_url?: string;
  gift_points_total?: number;
  creator_user_id?: string;
};

export type LeaderboardResp = {
  items: LeaderboardItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

/** Public display: nickname → email; never raw user id. */
export function creatorDisplayName(item: Pick<LeaderboardItem, 'nickname' | 'email'>): string {
  const nick = item.nickname?.trim();
  if (nick) return nick;
  const email = item.email?.trim();
  if (email) return email;
  return '—';
}

/** `GET /api/v1/leaderboard/soulmaker|character` */
export async function getLeaderboard(
  kind: LeaderboardKind,
  opts?: { page?: number; pageSize?: number },
): Promise<LeaderboardResp> {
  const sp = new URLSearchParams();
  if (opts?.page) sp.set('page', String(opts.page));
  if (opts?.pageSize) sp.set('page_size', String(opts.pageSize));
  const q = sp.toString() ? `?${sp}` : '';
  return apiFetch<LeaderboardResp>(`/leaderboard/${kind}${q}`);
}
