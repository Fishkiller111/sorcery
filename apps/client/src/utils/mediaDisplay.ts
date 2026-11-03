import { resolveStaticUrl } from '../constants/config';
import { isSessionRevealed, mediaRevealKey } from './mediaRevealSession';
import { isIosSafeContentMode } from './matureOptIn';

export const MATURE_LOCKED_REASON = 'mature_required';
export const PAID_LOCKED_REASON = 'need_unlock';
export const GALLERY_PACK_LOCKED_REASON = 'gallery_pack_required';
export const AFFECTION_LOCKED_REASON = 'affection_required';
export const VIP_LOCKED_REASON = 'vip_required';

type MediaBlurFields = {
  locked_reason?: string;
  need_blur?: boolean;
  locked?: boolean;
  content_rating?: string;
  media_type?: string;
  mime_type?: string;
  file_url?: string;
  cover_url?: string;
  blur_url?: string;
  blur_cover_url?: string;
  media_id?: string;
};

type PostImageBlurFields = {
  locked_reason?: string;
  need_blur?: boolean;
  locked?: boolean;
  content_rating?: string;
  image_url?: string;
  blur_url?: string;
  media_id?: string;
};

export function isRRated(item: { content_rating?: string }): boolean {
  return (item.content_rating || '').toLowerCase() === 'r';
}

export function isMatureRated(item: { content_rating?: string }): boolean {
  return (item.content_rating || '').toLowerCase() === 'mature';
}

function isPaidLockReason(reason?: string): boolean {
  return reason === PAID_LOCKED_REASON;
}

/** Hard gate: originals stripped / VIP mature required. On iOS safe mode, R is also locked. */
export function isMatureMediaLocked(
  item: MediaBlurFields,
  canSeeMature = false,
): boolean {
  if (canSeeMature) return false;
  if (isIosSafeContentMode() && isRRated(item)) return true;
  if (isRRated(item)) return false;
  if (item.locked_reason === MATURE_LOCKED_REASON) return true;
  if (item.need_blur && item.locked_reason !== PAID_LOCKED_REASON) return true;
  return false;
}

/**
 * Stale redacted mature payload after the user already enabled Mature mode
 * (e.g. cache from before content_tier flip). Needs a network refresh for clear URLs.
 */
export function needsMatureMediaRefresh(
  item: MediaBlurFields,
  canSeeMature: boolean,
): boolean {
  if (!canSeeMature) return false;
  if (item.locked_reason === MATURE_LOCKED_REASON) return true;
  if (!isMatureRated(item)) return false;
  return !item.file_url && !item.cover_url;
}

export function needsMaturePostImageRefresh(
  img: PostImageBlurFields,
  canSeeMature: boolean,
): boolean {
  if (!canSeeMature) return false;
  if (img.locked_reason === MATURE_LOCKED_REASON) return true;
  if (!isMatureRated(img)) return false;
  return !img.image_url;
}

/**
 * Soft blur for Mature when the viewer already has Mature mode — same tap-to-reveal UX as R.
 * Also used while a stale mature payload is waiting for refresh (blur assets only).
 */
export function isRoleMediaMatureBlurred(
  item: MediaBlurFields & { media_id?: string },
  canSeeMature: boolean,
  revealedOverride?: boolean,
): boolean {
  if (!canSeeMature) return false;
  if (!isMatureRated(item) && item.locked_reason !== MATURE_LOCKED_REASON) return false;
  if (item.locked && isPaidLockReason(item.locked_reason)) return false;
  const key = item.media_id ? mediaRevealKey('media', item.media_id) : '';
  const revealed =
    revealedOverride ?? (key ? isSessionRevealed(key) : false);
  return !revealed;
}

export function isPostImageHardLocked(
  img: PostImageBlurFields,
  canSeeMature = false,
): boolean {
  if (isPaidLockReason(img.locked_reason)) return true;
  if (img.locked && isPaidLockReason(img.locked_reason)) return true;
  if (img.locked_reason === MATURE_LOCKED_REASON) {
    // Mature mode on → soft blur / refresh, not a hard Unlock gate.
    return !canSeeMature;
  }
  if (isIosSafeContentMode() && isRRated(img) && !canSeeMature) {
    return true;
  }
  if (img.locked_reason === PAID_LOCKED_REASON) return true;
  if (img.locked && !isRRated(img) && !canSeeMature) return true;
  // Legacy mature soft-flag without locked_reason — not R.
  if (img.need_blur && !isRRated(img) && !isPaidLockReason(img.locked_reason)) {
    if (canSeeMature && (isMatureRated(img) || img.locked_reason === MATURE_LOCKED_REASON)) {
      return false;
    }
    if (!img.image_url || img.locked) return true;
    if (isMatureRated(img)) return true;
  }
  return false;
}

/** @deprecated Prefer isPostImageHardLocked; kept for call sites that mean VIP/paid lock. */
export function isPostImageLocked(img: PostImageBlurFields): boolean {
  return isPostImageHardLocked(img);
}

export function isRoleMediaRBlurred(
  item: MediaBlurFields & { media_id?: string },
  revealedOverride?: boolean,
): boolean {
  if (!isRRated(item)) return false;
  if (isMatureMediaLocked(item)) return false;
  if (item.locked && isPaidLockReason(item.locked_reason)) return false;
  const key = item.media_id ? mediaRevealKey('media', item.media_id) : '';
  const revealed =
    revealedOverride ?? (key ? isSessionRevealed(key) : false);
  return !revealed;
}

/** R soft-blur, or Mature soft-blur once Mature mode is on. */
export function isRoleMediaSoftBlurred(
  item: MediaBlurFields & { media_id?: string },
  opts: { canSeeMature?: boolean; revealed?: boolean } = {},
): boolean {
  if (isRoleMediaRBlurred(item, opts.revealed)) return true;
  return isRoleMediaMatureBlurred(item, Boolean(opts.canSeeMature), opts.revealed);
}

export function isPostImageRBlurred(
  img: PostImageBlurFields,
  postId: string,
  revealedOverride?: boolean,
): boolean {
  if (!isRRated(img) || isPostImageHardLocked(img)) return false;
  const id = img.media_id || `${postId}:0`;
  const key = mediaRevealKey('post', id);
  const revealed = revealedOverride ?? isSessionRevealed(key);
  return !revealed;
}

export function isPostImageMatureBlurred(
  img: PostImageBlurFields,
  postId: string,
  canSeeMature: boolean,
  revealedOverride?: boolean,
): boolean {
  if (!canSeeMature) return false;
  if (!isMatureRated(img) && img.locked_reason !== MATURE_LOCKED_REASON) return false;
  if (isPaidLockReason(img.locked_reason)) return false;
  const id = img.media_id || `${postId}:0`;
  const key = mediaRevealKey('post', id);
  const revealed = revealedOverride ?? isSessionRevealed(key);
  return !revealed;
}

export function isPostImageSoftBlurred(
  img: PostImageBlurFields,
  postId: string,
  opts: { canSeeMature?: boolean; revealed?: boolean } = {},
): boolean {
  if (isPostImageRBlurred(img, postId, opts.revealed)) return true;
  return isPostImageMatureBlurred(img, postId, Boolean(opts.canSeeMature), opts.revealed);
}

export function resolveRoleMediaThumbUrl(
  item: MediaBlurFields,
  opts?: { revealed?: boolean; canSeeMature?: boolean },
): string | undefined {
  const canSeeMature = Boolean(opts?.canSeeMature);
  if (isMatureMediaLocked(item, canSeeMature)) {
    const blur = resolveStaticUrl(item.blur_cover_url || item.blur_url || '');
    return blur || undefined;
  }
  // Stale mature payload: prefer blur until refresh lands clear URLs.
  if (needsMatureMediaRefresh(item, canSeeMature)) {
    const blur = resolveStaticUrl(item.blur_cover_url || item.blur_url || '');
    if (blur) return blur;
  }
  if (isRoleMediaSoftBlurred(item, { canSeeMature, revealed: opts?.revealed })) {
    const blur = resolveStaticUrl(item.blur_cover_url || item.blur_url || '');
    if (blur) return blur;
    // Fall back to clear URL; caller should apply blurRadius.
    const cover = resolveStaticUrl(item.cover_url || '');
    if (cover) return cover;
    if (isRoleMediaVideo(item)) return undefined;
    return resolveStaticUrl(item.file_url || '') || undefined;
  }
  const cover = resolveStaticUrl(item.cover_url || '');
  if (cover) return cover;
  if (isRoleMediaVideo(item)) return undefined;
  return resolveStaticUrl(item.file_url || '') || undefined;
}

/** Playable original for unlocked video / full-res image preview. */
export function resolveRoleMediaFileUrl(
  item: MediaBlurFields,
  opts?: { revealed?: boolean; canSeeMature?: boolean },
): string | undefined {
  const canSeeMature = Boolean(opts?.canSeeMature);
  if (isMatureMediaLocked(item, canSeeMature) || needsMatureMediaRefresh(item, canSeeMature)) {
    return undefined;
  }
  if (isRoleMediaSoftBlurred(item, { canSeeMature, revealed: opts?.revealed })) {
    // Soft blur: clear URL is available for reveal; thumb path preferred until then.
    return undefined;
  }
  const clear = resolveStaticUrl(item.file_url || item.cover_url || '');
  return clear || undefined;
}

export function isRoleMediaVideo(item: {
  media_type?: string;
  mime_type?: string;
  file_url?: string;
}): boolean {
  if ((item.media_type || '').toLowerCase() === 'video') return true;
  if ((item.mime_type || '').toLowerCase().startsWith('video/')) return true;
  const url = (item.file_url || '').toLowerCase();
  return /\.(mp4|webm|mov|m4v)(\?|$)/.test(url);
}

export function resolvePostImageDisplayUrl(
  img: PostImageBlurFields,
  opts?: { postId?: string; revealed?: boolean; canSeeMature?: boolean },
): string | undefined {
  const canSeeMature = Boolean(opts?.canSeeMature);
  if (isPostImageHardLocked(img, canSeeMature)) {
    const blur = resolveStaticUrl(img.blur_url || '');
    return blur || undefined;
  }
  if (
    opts?.postId &&
    needsMaturePostImageRefresh(img, canSeeMature)
  ) {
    const blur = resolveStaticUrl(img.blur_url || '');
    if (blur) return blur;
  }
  if (opts?.postId && isPostImageSoftBlurred(img, opts.postId, {
    canSeeMature,
    revealed: opts.revealed,
  })) {
    const blur = resolveStaticUrl(img.blur_url || '');
    if (blur) return blur;
    return resolveStaticUrl(img.image_url || '') || undefined;
  }
  const clear = resolveStaticUrl(img.image_url || '');
  return clear || undefined;
}

/** Client-side blur when pre-generated blur asset is missing. */
export function softBlurRadius(hasBlurAsset: boolean, softBlurred: boolean): number {
  if (!softBlurred) return 0;
  return hasBlurAsset ? 0 : 28;
}

export type MediaUnlockRequirementsView = {
  min_affection_tier?: string;
  affection_met?: boolean;
  price_points?: number;
  points_met?: boolean;
  min_vip_tier?: number;
  vip_met?: boolean;
};

export type UnlockGateMedia = {
  locked_reason?: string;
  unlock_requirements?: MediaUnlockRequirementsView;
};

/** 真人分身好感 / 会员门槛未满足：应弹窗而不是走付费解锁。 */
export function isRealPersonUnlockGateBlocked(item: UnlockGateMedia): boolean {
  const reason = item.locked_reason;
  if (reason === AFFECTION_LOCKED_REASON || reason === VIP_LOCKED_REASON) return true;
  const req = item.unlock_requirements;
  if (!req) return false;
  if (req.affection_met === false) return true;
  if (req.vip_met === false) return true;
  return false;
}
