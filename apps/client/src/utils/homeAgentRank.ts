import type { ExploreRoleItem } from '../types/api';
import { isMatureCatalogRating, normalizeAgentContentRating } from './agentRatingDisplay';
import { isIosSafeContentMode } from './matureOptIn';
import { isVerifiedRealPerson } from './verifiedRealPerson';

export type HomeAgentRankRow = {
  item: ExploreRoleItem;
  index: number;
  isOfficial: boolean;
};

/** Matches API exploreThinMaturePredicate: media < 6 AND views < 20 AND likes < 3. */
const THIN_MATURE_MEDIA = 6;
const THIN_MATURE_VIEWS = 20;
const THIN_MATURE_LIKES = 3;

function parseExploreAgentGender(attributes?: string): string {
  if (!attributes) return '';
  try {
    const attrs = JSON.parse(attributes) as { gender?: unknown };
    return String(attrs.gender || '')
      .trim()
      .toLowerCase();
  } catch {
    return '';
  }
}

function isOfficialAgent(row: HomeAgentRankRow): boolean {
  if (row.isOfficial) return true;
  return (row.item.source || '').trim().toLowerCase() === 'official';
}

export function isThinMatureCatalog(item: ExploreRoleItem): boolean {
  const rating = normalizeAgentContentRating(item.content_rating);
  if (rating !== 'mature') return false;
  return (
    (item.media_count ?? 0) < THIN_MATURE_MEDIA &&
    (item.view_count ?? 0) < THIN_MATURE_VIEWS &&
    (item.like_count ?? 0) < THIN_MATURE_LIKES
  );
}

/**
 * Home ranking buckets.
 * R18: quality Mature → R → official → standard UGC → thin Mature
 * Safe: official → R → standard (Mature is filtered out before sort)
 */
export function homeAgentBucket(row: HomeAgentRankRow, r18: boolean): number {
  if (isVerifiedRealPerson(row.item)) return -1;
  const rating = normalizeAgentContentRating(row.item.content_rating);
  const official = isOfficialAgent(row);
  const thinMature = isThinMatureCatalog(row.item);
  if (r18) {
    if (rating === 'mature' && !thinMature) return 0;
    if (rating === 'r') return 1;
    if (official) return 2;
    if (rating === 'mature' && thinMature) return 4;
    return 3;
  }
  if (official) return 0;
  if (rating === 'r') return 1;
  return 2;
}

function engagementViews(item: ExploreRoleItem): number {
  return item.view_count ?? 0;
}

function engagementLikes(item: ExploreRoleItem): number {
  return item.like_count ?? 0;
}

function engagementMedia(item: ExploreRoleItem): number {
  return item.media_count ?? 0;
}

function engagementGifts(item: ExploreRoleItem): number {
  return item.gift_points_total ?? 0;
}

function recencyTs(item: ExploreRoleItem): number {
  return item.published_at ?? 0;
}

/** 首页卡片排序：模式桶 → 偏好性别 → 浏览 / 点赞 / 媒体 → 送礼 → 新创建 */
export function compareHomeAgentRank(
  a: HomeAgentRankRow,
  b: HomeAgentRankRow,
  preferred: 'male' | 'female' | '',
  r18: boolean,
): number {
  const bucketDiff = homeAgentBucket(a, r18) - homeAgentBucket(b, r18);
  if (bucketDiff !== 0) return bucketDiff;

  if (isVerifiedRealPerson(a.item) && isVerifiedRealPerson(b.item)) {
    const pinDiff = (a.item.pin_order ?? 0) - (b.item.pin_order ?? 0);
    if (pinDiff !== 0) return pinDiff;
  }

  const genderA = preferred
    ? parseExploreAgentGender(a.item.attributes) === preferred
      ? 0
      : 1
    : 0;
  const genderB = preferred
    ? parseExploreAgentGender(b.item.attributes) === preferred
      ? 0
      : 1
    : 0;
  if (genderA !== genderB) return genderA - genderB;

  const viewDiff = engagementViews(b.item) - engagementViews(a.item);
  if (viewDiff !== 0) return viewDiff;
  const likeDiff = engagementLikes(b.item) - engagementLikes(a.item);
  if (likeDiff !== 0) return likeDiff;
  const mediaDiff = engagementMedia(b.item) - engagementMedia(a.item);
  if (mediaDiff !== 0) return mediaDiff;
  const giftDiff = engagementGifts(b.item) - engagementGifts(a.item);
  if (giftDiff !== 0) return giftDiff;

  const recencyDiff = recencyTs(b.item) - recencyTs(a.item);
  if (recencyDiff !== 0) return recencyDiff;

  return a.index - b.index;
}

/** Apply Home/Explore pin ranking to a raw explore list (server already pins; client re-sorts a page). */
export function sortExploreRolesPinned(
  items: ExploreRoleItem[],
  preferred: 'male' | 'female' | '',
  r18: boolean,
): ExploreRoleItem[] {
  const ranked: HomeAgentRankRow[] = items.map((item, index) => ({
    item,
    index,
    isOfficial: (item.source || '').trim().toLowerCase() === 'official',
  }));
  ranked.sort((a, b) => compareHomeAgentRank(a, b, preferred, r18));
  return ranked.map((row) => row.item);
}

/** R18 off hides Mature catalog rows, except 真人分身 who stay pinned (Web).
 * iOS safe mode also hides R and does not exempt 真人分身. */
export function keepExploreRoleForCatalog(item: ExploreRoleItem, r18: boolean): boolean {
  if (r18) return true;
  const n = normalizeAgentContentRating(item.content_rating);
  if (isIosSafeContentMode()) {
    return n !== 'r' && n !== 'mature';
  }
  if (isVerifiedRealPerson(item)) return true;
  return !isMatureCatalogRating(item.content_rating);
}
