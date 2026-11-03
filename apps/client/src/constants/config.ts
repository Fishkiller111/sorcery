import { Platform } from 'react-native';

// API host is baked at build time from EXPO_PUBLIC_API_HOST:
//   .env.development  → expo start
//   .env.production   → expo export --platform web
// Local overrides: .env.development.local / .env.production.local (gitignored)

function resolveApiHost(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_HOST?.trim();
  // 未配置时只连接本机，避免发行候选意外使用当前页面所在的原生产站点。
  if (!fromEnv) return 'http://localhost:8888';
  let parsed: URL;
  try {
    parsed = new URL(fromEnv);
  } catch {
    throw new Error('EXPO_PUBLIC_API_HOST 必须是有效的 HTTP(S) 地址');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || fromEnv.includes('?') || fromEnv.includes('#')) {
    throw new Error('EXPO_PUBLIC_API_HOST 只允许无凭据和查询参数的 HTTP(S) 地址');
  }
  return parsed.href.replace(/\/+$/, '');
}

export function getApiHost(): string {
  return resolveApiHost();
}

export function getApiBase(): string {
  return `${getApiHost()}/api/v1`;
}

export function getWsBase(): string {
  return getApiHost().replace(/^http/, 'ws');
}

export function getStaticBase(): string {
  return getApiHost();
}

/** 未配置素材源时留空，不能假定后端挂载了 /app-static。 */
export function getAppStaticBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_APP_STATIC_BASE?.trim();
  if (!fromEnv) return '';
  try {
    const url = new URL(fromEnv);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return '';
    return url.href.replace(/\/+$/, '');
  } catch { return ''; }
}

/** Google Analytics 4 measurement ID，由部署方自行配置。 */
export const GA_MEASUREMENT_ID = process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? '';

/**
 * Yandex Metrika counter，由部署方自行配置。
 * Empty = Metrika disabled until you create a dedicated App counter.
 */
export const YANDEX_METRIKA_ID = (() => {
  const raw = process.env.EXPO_PUBLIC_YANDEX_METRIKA_ID?.trim() ?? '';
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
})();

/** Show story debug tools (chapter progress reset). Dev or EXPO_PUBLIC_STORY_DEBUG=1 */
export const STORY_DEBUG_ENABLED =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  process.env.EXPO_PUBLIC_STORY_DEBUG === '1';

/** Regular users see beat quick phrases after this many user turns in the current beat. */
export const STORY_STUCK_ROUNDS_THRESHOLD = 10;

/** Google OAuth Web client ID. Used by web GSI and as native webClientId (id_token audience). */
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';

/** Google OAuth iOS client ID (native). From EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. */
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';

/** Apple Sign In Services ID (web). From EXPO_PUBLIC_APPLE_CLIENT_ID — must match Apple Developer Services ID. */
export const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID?.trim() ?? '';

/** Telegram bot numeric id (public; token prefix). Used by web Login Widget. */
export const TELEGRAM_BOT_ID = process.env.EXPO_PUBLIC_TELEGRAM_BOT_ID?.trim() ?? '';

/** Telegram bot username without @ (optional; docs / BotFather domain). */
export const TELEGRAM_BOT_USERNAME =
  process.env.EXPO_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ?? '';

/** Public app origin for OAuth redirect URIs (web). */
export const APP_SITE_URL = (process.env.EXPO_PUBLIC_APP_SITE_URL?.trim() ?? '').replace(/\/$/, '');

/** Cloudflare Turnstile site key. From EXPO_PUBLIC_TURNSTILE_SITE_KEY in env files. */
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';

export function isTurnstileEnabled(): boolean {
  return Platform.OS === 'web' && TURNSTILE_SITE_KEY.length > 0;
}

export function resolveStaticUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = getStaticBase();
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
