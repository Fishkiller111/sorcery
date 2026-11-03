import type { UserInfo } from '../types/api';
import { isIosSafeContentMode } from './matureOptIn';

export type WorldMatureGateResult =
  | { ok: true }
  | { ok: false; reason: 'vip_required' | 'confirm_mature' };

/** Pre-check before enter world/level for r / r18 / mature ratings. */
export function checkWorldMatureGate(
  contentRating: string | undefined,
  user: UserInfo | null | undefined,
): WorldMatureGateResult {
  const rating = (contentRating || 'standard').toLowerCase();
  const isMature = rating === 'r18' || rating === 'mature';
  const isR = rating === 'r';
  if (isIosSafeContentMode() && (isR || isMature)) {
    if (!user?.vip?.permissions?.mature_mode) {
      return { ok: false, reason: 'vip_required' };
    }
    return { ok: false, reason: 'confirm_mature' };
  }
  if (rating !== 'r' && !isMature) {
    return { ok: true };
  }
  if (isMature) {
    if (!user?.vip?.permissions?.mature_mode) {
      return { ok: false, reason: 'vip_required' };
    }
    if (user.content_tier !== 'mature') {
      return { ok: false, reason: 'confirm_mature' };
    }
  }
  return { ok: true };
}
