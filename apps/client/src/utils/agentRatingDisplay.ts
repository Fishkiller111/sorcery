/** Agent-level content rating helpers for home / explore cards. */

import { isSessionRevealed, mediaRevealKey } from './mediaRevealSession';
import { isIosSafeContentMode } from './matureOptIn';
import { isVerifiedRealPerson } from './verifiedRealPerson';

export type AgentContentRating = 'standard' | 'r' | 'mature';

/**
 * Normalize catalog ratings.
 * Worlds use `r18` for Mature; agents historically use `mature`. Both map to mature.
 */
export function normalizeAgentContentRating(raw?: string | null): AgentContentRating {
  const v = (raw || '').toLowerCase().trim();
  if (v === 'r') return 'r';
  if (v === 'mature' || v === 'r18') return 'mature';
  return 'standard';
}

/** R18 filter chip: only Mature / r18 is gated; R stays visible (soft-blur when filter off). */
export function isMatureCatalogRating(raw?: string | null): boolean {
  return normalizeAgentContentRating(raw) === 'mature';
}

export function canUserSeeMature(user?: {
  content_tier?: string;
  vip?: { permissions?: { mature_mode?: boolean } } | null;
} | null): boolean {
  if (isIosSafeContentMode()) return false;
  return user?.content_tier === 'mature' && Boolean(user?.vip?.permissions?.mature_mode);
}

/** Mature agents stay locked until mature mode is on. 真人分身在 iOS 安全模式下不再豁免。 */
export function isAgentMatureLocked(
  rating: string | undefined,
  canSeeMature: boolean,
  item?: {
    verified_real_person?: boolean;
    official_subtype?: string;
    source?: string;
  } | null,
): boolean {
  if (!isIosSafeContentMode() && isVerifiedRealPerson(item)) return false;
  const n = normalizeAgentContentRating(rating);
  if (isIosSafeContentMode()) {
    return (n === 'mature' || n === 'r') && !canSeeMature;
  }
  return n === 'mature' && !canSeeMature;
}

/**
 * R agents soft-blur until session reveal.
 * When R18 / Mature mode is on (`canSeeMature`), blur is cleared entirely.
 */
export function isAgentRBlurred(
  rating: string | undefined,
  roleId: string,
  revealedOverride?: boolean,
  canSeeMature = false,
): boolean {
  if (canSeeMature) return false;
  if (normalizeAgentContentRating(rating) !== 'r') return false;
  const key = mediaRevealKey('role', roleId);
  const revealed = revealedOverride ?? isSessionRevealed(key);
  return !revealed;
}

/**
 * R worlds soft-blur until session reveal.
 * When R18 / Mature mode is on (`canSeeMature`), blur is cleared entirely.
 */
export function isWorldRBlurred(
  rating: string | undefined,
  worldId: string,
  revealedOverride?: boolean,
  canSeeMature = false,
): boolean {
  if (canSeeMature) return false;
  if (normalizeAgentContentRating(rating) !== 'r') return false;
  const key = mediaRevealKey('world', worldId);
  const revealed = revealedOverride ?? isSessionRevealed(key);
  return !revealed;
}

/** Badge label for explore cards. */
export function contentRatingBadgeLabel(raw?: string | null): string | null {
  const n = normalizeAgentContentRating(raw);
  if (n === 'r') return 'R';
  if (n === 'mature') return 'R18';
  return null;
}

