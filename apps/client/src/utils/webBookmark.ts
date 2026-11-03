import { Platform } from 'react-native';

export const BOOKMARK_APP_TASK_TYPE = 'bookmark_app';

export function isWebPlatform(): boolean {
  return Platform.OS === 'web';
}

/** Native iOS / Android already have a home-screen icon — hide this task. */
export function shouldShowBookmarkAppTask(): boolean {
  return isWebPlatform();
}

export function isMobileWeb(): boolean {
  if (!isWebPlatform() || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPod|iPad|Mobile/i.test(ua)) return true;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900;
  }
  return false;
}

/** Already launched as an installed PWA / iOS Add to Home Screen. */
export function isStandaloneWebApp(): boolean {
  if (!isWebPlatform() || typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
}
