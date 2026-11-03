import { useEffect } from 'react';

import { useAuthStore } from '../../stores/authStore';
import { DEFAULT_THEME_ID } from './registry';
import { useTheme } from './ThemeContext';

/** Keeps non-dev users on Soulthread; dev users may switch themes. */
export function ThemeAccessSync() {
  const isRestored = useAuthStore((s) => s.isRestored);
  const isDevUser = useAuthStore((s) => s.user?.is_dev === true);
  const { themeId, setThemeId, loaded } = useTheme();

  useEffect(() => {
    if (!loaded || !isRestored || isDevUser) return;
    if (themeId !== DEFAULT_THEME_ID) {
      setThemeId(DEFAULT_THEME_ID);
    }
  }, [isDevUser, isRestored, loaded, setThemeId, themeId]);

  return null;
}
