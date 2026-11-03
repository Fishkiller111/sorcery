import { Platform } from 'react-native';

import { GA_MEASUREMENT_ID, YANDEX_METRIKA_ID } from '../constants/config';
import { APP_SITE_URL } from '../constants/seo';
import {
  getUtmEventParams,
  hasInternalTestSession,
  isInternalTestUtm,
  markInternalTestSession,
} from './utm';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

/** Metrica JS Goals — must match Goals on the **App** counter (not marketing 110876717).
 * All of these are dual-written to GA4 via `trackGaEvent` / `trackPageView` (same event names).
 */
export const METRIKA_GOALS = {
  campaignLanding: 'campaign_landing',
  registerTabClick: 'register_tab_click',
  registerButtonClick: 'register_button_click',
  registerComplete: 'register_complete',
  signUp: 'sign_up',
  login: 'login',
  keyPageClick: 'key_page_click',
} as const;

/** Fire Yandex Metrica goal on App counter (no-op if ID unset). */
export function reachMetrikaGoal(
  goalId: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!canTrackMetrika()) return;
  try {
    window.ym?.(YANDEX_METRIKA_ID, 'reachGoal', goalId, {
      ...getUtmEventParams(),
      ...params,
    });
  } catch {
    // analytics must never break UX
  }
}

function canTrackMetrika(): boolean {
  if (!YANDEX_METRIKA_ID) return false;
  if (!canTrack()) return false;
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return false;
  return true;
}

/** GA4 重点页面标识，便于在报告中筛选 */
export type GaKeyPage =
  | 'login'
  | 'mode_select'
  | 'profile'
  | 'free_chat'
  | 'create_agent'
  | 'explore'
  | 'vip';

export interface GaPageMeta {
  keyPage: GaKeyPage;
  /** GA4 自定义事件名 */
  eventName: string;
  /** page_view / 报告中的页面标题 */
  pageTitle: string;
  /** 子页面，如 chat / detail / shop */
  subScreen?: string;
}

const KEY_PAGE_LABELS: Record<GaKeyPage, string> = {
  login: 'Login / Register',
  mode_select: 'Mode Select',
  profile: 'Profile',
  free_chat: 'Free Chat',
  create_agent: 'Create Agent',
  explore: 'Explore',
  vip: 'VIP Subscription',
};

function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0].split('#')[0];
  if (!path || path === '/') return '/';
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}

function getAllowedTrackingHostname(): string {
  if (!APP_SITE_URL) return '';
  try {
    return new URL(APP_SITE_URL).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** True for localhost, .local, or raw IPv4 hostnames. */
function isLocalOrDirectIpHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.local')) return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * Whether client-side GA should run (web App production host only).
 * Kill switch: EXPO_PUBLIC_GA_ENABLED=false
 */
export function shouldTrackAnalytics(): boolean {
  if (process.env.EXPO_PUBLIC_GA_ENABLED === 'false') return false;
  if (Platform.OS !== 'web' || !GA_MEASUREMENT_ID) return false;
  if (typeof window === 'undefined') return false;

  if (isInternalTestUtm()) {
    markInternalTestSession();
    return false;
  }
  if (hasInternalTestSession()) return false;

  const host = window.location.hostname.toLowerCase();
  if (isLocalOrDirectIpHost(host)) return false;

  const allowedHost = getAllowedTrackingHostname();
  if (allowedHost && host !== allowedHost) return false;

  return true;
}

function canTrack(): boolean {
  return shouldTrackAnalytics();
}

function buildKeyPageParams(
  keyPage: GaKeyPage,
  path: string,
  subScreen = 'main',
  extra?: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  return {
    ...getUtmEventParams(),
    page_name: keyPage,
    page_title: KEY_PAGE_LABELS[keyPage],
    page_path: path,
    sub_screen: subScreen,
    content_group: 'key_page',
    ...extra,
  };
}

/** 将 Expo Router 路径映射为重点页面埋点元数据；非重点页面返回 null */
export function resolveGaPageMeta(pathname: string): GaPageMeta | null {
  const path = normalizePath(pathname);

  if (path === '/login') {
    return {
      keyPage: 'login',
      eventName: 'view_login',
      pageTitle: KEY_PAGE_LABELS.login,
    };
  }

  if (path === '/mode-select') {
    return {
      keyPage: 'mode_select',
      eventName: 'view_mode_select',
      pageTitle: KEY_PAGE_LABELS.mode_select,
    };
  }

  if (path === '/profile') {
    return {
      keyPage: 'profile',
      eventName: 'view_profile',
      pageTitle: KEY_PAGE_LABELS.profile,
    };
  }

  if (path === '/create-agent') {
    return {
      keyPage: 'create_agent',
      eventName: 'view_create_agent',
      pageTitle: KEY_PAGE_LABELS.create_agent,
    };
  }

  if (path === '/' || path === '/explore') {
    return {
      keyPage: 'explore',
      eventName: 'view_explore',
      pageTitle: KEY_PAGE_LABELS.explore,
      subScreen: 'list',
    };
  }

  if (path === '/free-chat') {
    return {
      keyPage: 'free_chat',
      eventName: 'view_free_chat',
      pageTitle: KEY_PAGE_LABELS.free_chat,
      subScreen: 'list',
    };
  }
  if (path.startsWith('/free-chat/')) {
    const rest = path.slice('/free-chat/'.length);
    const subScreen = rest.startsWith('worldview/') ? 'worldview' : 'chat';
    return {
      keyPage: 'free_chat',
      eventName: 'view_free_chat',
      pageTitle: `${KEY_PAGE_LABELS.free_chat} - ${subScreen}`,
      subScreen,
    };
  }

  if (path.startsWith('/explore/')) {
    return {
      keyPage: 'explore',
      eventName: 'view_explore',
      pageTitle: `${KEY_PAGE_LABELS.explore} - Detail`,
      subScreen: 'detail',
    };
  }

  if (path === '/vip/shop' || path === '/vip/success' || path === '/vip/cancel') {
    const subScreen = path.split('/').pop() ?? 'shop';
    const titles: Record<string, string> = {
      shop: KEY_PAGE_LABELS.vip,
      success: 'VIP Subscription - Success',
      cancel: 'VIP Subscription - Cancel',
    };
    return {
      keyPage: 'vip',
      eventName: 'view_vip',
      pageTitle: titles[subScreen] ?? KEY_PAGE_LABELS.vip,
      subScreen,
    };
  }

  return null;
}

/** Map nav route to key page for key_page_click. */
export function resolveKeyPageFromRoute(route: string): GaKeyPage | null {
  const path = normalizePath(route);
  if (path === '/' || path === '/explore' || path.startsWith('/explore/')) return 'explore';
  if (path === '/mode-select') return 'mode_select';
  if (path === '/free-chat' || path.startsWith('/free-chat/') || path.startsWith('/agent/')) {
    return 'free_chat';
  }
  if (path === '/create-agent') return 'create_agent';
  if (path === '/profile') return 'profile';
  if (path === '/login') return 'login';
  return null;
}

/** GA4 User-ID — same backend user id across sessions (not email). */
export function setGaUserId(userId: string): void {
  if (!canTrack() || !userId) return;
  try {
    window.gtag?.('config', GA_MEASUREMENT_ID, { user_id: userId });
  } catch {
    // analytics must never break UX
  }
  if (canTrackMetrika()) {
    try {
      window.ym?.(YANDEX_METRIKA_ID, 'setUserID', userId);
    } catch {
      // ignore
    }
  }
}

export function setGaUserProperties(props: Record<string, string | boolean | undefined>): void {
  if (!canTrack()) return;
  const cleaned: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined && value !== '') cleaned[key] = value;
  }
  if (Object.keys(cleaned).length === 0) return;
  try {
    window.gtag?.('set', 'user_properties', cleaned);
  } catch {
    // analytics must never break UX
  }
  if (canTrackMetrika()) {
    try {
      window.ym?.(YANDEX_METRIKA_ID, 'userParams', cleaned);
    } catch {
      // ignore
    }
  }
}

export function clearGaIdentity(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (GA_MEASUREMENT_ID) {
    try {
      window.gtag?.('set', { user_id: null });
      window.gtag?.('set', 'user_properties', {
        membership_tier: null,
        is_dev: null,
      });
    } catch {
      // analytics must never break UX
    }
  }
}

/** GA4 custom event — web App only; merges session UTM when present. Dual-writes Metrika Goals. */
export function trackGaEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!canTrack()) return;
  const merged = {
    ...getUtmEventParams(),
    ...params,
  };
  try {
    window.gtag?.('event', eventName, merged);
  } catch {
    // analytics must never break UX
  }
  reachMetrikaGoal(eventName, params);
}

/** 广告 / 外链落地：首次捕获到 UTM 时上报一次，便于按 campaign_source 筛渠道 */
export function trackCampaignLanding(): void {
  const utm = getUtmEventParams();
  if (!utm.campaign_source && !utm.campaign_medium && !utm.campaign_name) return;
  trackGaEvent(METRIKA_GOALS.campaignLanding, {
    ...utm,
    page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
  });
}

export type AuthMethod = 'email' | 'google' | 'apple' | 'telegram';

/** GA4 recommended login event */
export function trackAuthLogin(method: AuthMethod): void {
  trackGaEvent('login', { method });
}

/** GA4 recommended sign_up event */
export function trackAuthSignUp(method: AuthMethod): void {
  trackGaEvent('sign_up', { method });
}

/** 用户切换到「注册」Tab */
export function trackRegisterTabClick(): void {
  trackGaEvent('register_tab_click', { funnel_step: 'register_tab' });
}

/** 用户点击注册主按钮（邮箱提交或 Google / Apple 注册） */
export function trackRegisterButtonClick(method: AuthMethod): void {
  trackGaEvent('register_button_click', {
    funnel_step: 'register_submit',
    auth_method: method,
  });
}

/** 注册成功（可与 register_button_click 对比完成率） */
export function trackRegisterComplete(method: AuthMethod): void {
  trackGaEvent('register_complete', {
    funnel_step: 'register_complete',
    auth_method: method,
  });
  trackAuthSignUp(method);
}

/** 主导航点击重点页面入口 */
export function trackKeyPageClick(
  keyPage: GaKeyPage,
  route: string,
  clickSource: 'bottom_nav' | 'side_nav' | 'modern_nav',
): void {
  trackGaEvent(
    'key_page_click',
    buildKeyPageParams(keyPage, normalizePath(route), 'main', {
      click_source: clickSource,
      interaction: 'nav_click',
    }),
  );
}

function fireKeyPageViewEvents(meta: GaPageMeta, path: string): void {
  const params = buildKeyPageParams(meta.keyPage, path, meta.subScreen ?? 'main', {
    interaction: 'page_view',
  });

  try {
    window.gtag?.('event', meta.eventName, params);
  } catch {
    // analytics must never break UX
  }
  // Same Goal ID as GA event name (Metrica App counter).
  reachMetrikaGoal(meta.eventName, params);
}

/** 路由变化时上报 page_view；重点页面额外上报 view_*（GA + Metrica 双写） */
export function trackPageView(pathname: string): void {
  if (!canTrack()) return;

  const path = normalizePath(pathname);
  const meta = resolveGaPageMeta(path);
  const pageTitle = meta?.pageTitle ?? path;
  const href = window.location.href;

  try {
    window.gtag?.('config', GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: pageTitle,
      page_location: href,
    });

    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_title: pageTitle,
      page_location: href,
      ...getUtmEventParams(),
    });
  } catch {
    // analytics must never break UX
  }

  // SPA route change → Metrika virtual page hit (parity with GA page_view).
  if (canTrackMetrika()) {
    try {
      window.ym?.(YANDEX_METRIKA_ID, 'hit', href, {
        title: pageTitle,
        referer: typeof document !== 'undefined' ? document.referrer : '',
      });
    } catch {
      // ignore
    }
  }

  if (meta) {
    fireKeyPageViewEvents(meta, path);
  }
}

/** 手动上报重点页面（页面内二次曝光时使用；GA + Metrica） */
export function trackKeyPage(keyPage: GaKeyPage, subScreen = 'main'): void {
  if (!canTrack()) return;

  const path = normalizePath(window.location.pathname);
  const eventName = `view_${keyPage}`;
  const params = buildKeyPageParams(keyPage, path, subScreen, {
    interaction: 'manual',
  });

  try {
    window.gtag?.('event', eventName, params);
  } catch {
    // analytics must never break UX
  }
  reachMetrikaGoal(eventName, params);
}

/** Sync GA identity after auth restore or user refresh. */
export function syncGaIdentityFromUser(user: {
  id: string;
  is_dev?: boolean;
  vip?: { plan_code?: string; is_active?: boolean };
} | null): void {
  if (!user?.id) {
    clearGaIdentity();
    return;
  }
  setGaUserId(user.id);
  const tier = user.vip?.is_active ? user.vip.plan_code || 'vip' : 'free';
  setGaUserProperties({
    membership_tier: tier,
    is_dev: user.is_dev === true,
  });
}
