import { apiFetch } from './client';

export type ExploreCatalogKind = 'all' | 'world' | 'simulator';

export type ExploreWorldItem = {
  kind?: ExploreCatalogKind | 'world' | 'simulator';
  world_id?: string;
  simulator_id?: string;
  code: string;
  title: string;
  tagline?: string;
  cover_image?: string;
  tags?: string[];
  content_rating: string;
  owner_user_id: string;
  published_at?: number;
};

export type ExploreWorldListResp = {
  items: ExploreWorldItem[];
  total: number;
  page: number;
  page_size: number;
};

export async function listExploreWorlds(opts?: {
  q?: string;
  contentRating?: string;
  excludeMature?: boolean;
  kind?: ExploreCatalogKind;
  page?: number;
  pageSize?: number;
  lang?: string;
}): Promise<ExploreWorldListResp> {
  const q = new URLSearchParams();
  if (opts?.q) q.set('q', opts.q);
  if (opts?.contentRating) q.set('content_rating', opts.contentRating);
  if (opts?.excludeMature) q.set('exclude_mature', 'true');
  if (opts?.kind && opts.kind !== 'all') q.set('kind', opts.kind);
  if (opts?.lang) q.set('lang', opts.lang);
  q.set('page', String(opts?.page ?? 1));
  q.set('page_size', String(opts?.pageSize ?? 20));
  return apiFetch<ExploreWorldListResp>(`/explore/worlds?${q.toString()}`);
}

export async function getExploreWorld(
  worldId: string,
  opts?: { lang?: string },
): Promise<{ world: ExploreWorldItem }> {
  const q = new URLSearchParams();
  if (opts?.lang) q.set('lang', opts.lang);
  const qs = q.toString();
  return apiFetch(`/explore/worlds/${worldId}${qs ? `?${qs}` : ''}`);
}
