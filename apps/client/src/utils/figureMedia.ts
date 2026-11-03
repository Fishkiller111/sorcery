/** Detect MP4 / common video figure asset URLs. */
export function isVideoFigureUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.split('?')[0]?.toLowerCase() ?? '';
  return lower.endsWith('.mp4') || lower.endsWith('.m4v') || lower.includes('video/mp4');
}

/** GIF figure URL (animated still treated as image by most Image components). */
export function isGifFigureUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.split('?')[0]?.toLowerCase() ?? '';
  return lower.endsWith('.gif');
}
