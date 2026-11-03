import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_THEME_ID, isThemeId } from './registry';
import type { ThemeId } from './types';

/** Must match authStore persist name */
const AUTH_PERSIST_KEY = '@soulthread_scene_auth';
export const THEME_STORAGE_KEY = '@soulthread_theme_id';

type AuthPersistState = {
  state?: {
    user?: { is_dev?: boolean } | null;
  };
};

export function isDevUserFromAuthPersist(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const user = (raw as AuthPersistState).state?.user;
  return user?.is_dev === true;
}

/** Non-dev users always use Soulthread; only dev accounts may keep an alternate theme. */
export async function resolveInitialThemeId(): Promise<ThemeId> {
  try {
    const [storedTheme, authRaw] = await Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(AUTH_PERSIST_KEY),
    ]);

    let isDev = false;
    if (authRaw) {
      try {
        isDev = isDevUserFromAuthPersist(JSON.parse(authRaw));
      } catch {
        isDev = false;
      }
    }

    if (isDev && storedTheme && isThemeId(storedTheme)) {
      return storedTheme;
    }
    return DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function canUseThemeId(themeId: ThemeId, isDevUser: boolean): boolean {
  return isDevUser || themeId === DEFAULT_THEME_ID;
}
