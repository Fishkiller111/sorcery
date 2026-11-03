export type SocialPlatform = 'x' | 'telegram';
export type SocialLink = { platform: SocialPlatform; url: string; label: string };

// 未配置时关闭外链，避免自建实例误跳到原运营账号。
function configuredHttpsUrl(raw?: string): string {
  if (!raw?.trim()) return '';
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : '';
  } catch { return ''; }
}
const xUrl = configuredHttpsUrl(process.env.EXPO_PUBLIC_SOCIAL_X_URL);
const telegramUrl = configuredHttpsUrl(process.env.EXPO_PUBLIC_SOCIAL_TELEGRAM_URL);
export const SOCIAL_LINKS: SocialLink[] = [
  ...(xUrl ? [{ platform: 'x' as const, url: xUrl, label: 'X' }] : []),
  ...(telegramUrl ? [{ platform: 'telegram' as const, url: telegramUrl, label: 'Telegram' }] : []),
];
const configuredBot = (process.env.EXPO_PUBLIC_SUPPORT_BOT_USERNAME || '').trim().replace(/^@/, '');
export const SUPPORT_BOT_USERNAME = /^[A-Za-z0-9_]{5,32}$/.test(configuredBot) ? configuredBot : '';
export const SUPPORT_BOT_URL = SUPPORT_BOT_USERNAME ? `https://t.me/${SUPPORT_BOT_USERNAME}` : '';
export const MARKETING_SITE_URL = configuredHttpsUrl(process.env.EXPO_PUBLIC_MARKETING_SITE_URL);
