/** 原生端可能存在 window 却没有 location；只有 Web 才读取页面地址。 */
export function resolveShareOrigin(
  configured: string,
  platform: string,
  location?: { origin?: string } | null,
): string {
  const raw = configured.trim() || (platform === 'web' ? location?.origin?.trim() : '') || '';
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return '';
    return url.href.replace(/\/+$/, '');
  } catch {
    return '';
  }
}
