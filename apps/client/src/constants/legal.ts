/** 自建运营方必须配置自己的 HTTPS 法律文档。 */
function legalUrl(raw?: string): string {
  if (!raw?.trim()) return '';
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : '';
  } catch { return ''; }
}
export const VIP_PRIVACY_URL = legalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL);
export const VIP_TERMS_URL = legalUrl(process.env.EXPO_PUBLIC_TERMS_URL);
export const VIP_LEGAL_READY = Boolean(VIP_PRIVACY_URL && VIP_TERMS_URL);
