/**
 * 主题运行时 Context：管理当前 themeId、元数据、持久化用户选择。
 *
 * 页面级主题分发见 useThemePage；各主题页面自行管理视觉 token。
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '../../stores/authStore';
import {
  DEFAULT_THEME_ID,
  getThemeMeta,
} from './registry';
import {
  canUseThemeId,
  resolveInitialThemeId,
  THEME_STORAGE_KEY,
} from './themeAccess';
import type { ThemeId, ThemeMeta } from './types';

/** useTheme() 返回的上下文结构 */
type ThemeContextValue = {
  themeId: ThemeId;
  loaded: boolean;
  setThemeId: (themeId: ThemeId) => void;
  meta: ThemeMeta;
};

const defaultMeta = getThemeMeta(DEFAULT_THEME_ID);

/** Provider 未挂载时的兜底值，避免 useTheme 在边界情况下抛错 */
const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  loaded: false,
  setThemeId: () => {},
  meta: defaultMeta,
});

type ThemeProviderProps = {
  children: React.ReactNode;
  /** 测试或 Storybook 用：指定初始主题并跳过 AsyncStorage 读取 */
  initialThemeId?: ThemeId;
};

export function ThemeProvider({ children, initialThemeId }: ThemeProviderProps) {
  const [themeId, setThemeIdState] = useState<ThemeId>(initialThemeId ?? DEFAULT_THEME_ID);
  const [loaded, setLoaded] = useState(initialThemeId != null);

  useEffect(() => {
    if (initialThemeId != null) {
      return;
    }

    let mounted = true;
    resolveInitialThemeId()
      .then((resolved) => {
        if (!mounted) return;
        setThemeIdState(resolved);
        setLoaded(true);
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, [initialThemeId]);

  const setThemeId = useCallback((next: ThemeId) => {
    const isDevUser = useAuthStore.getState().user?.is_dev === true;
    const effective = canUseThemeId(next, isDevUser) ? next : DEFAULT_THEME_ID;
    setThemeIdState(effective);
    AsyncStorage.setItem(THEME_STORAGE_KEY, effective).catch(() => {});
  }, []);

  const meta = useMemo(() => getThemeMeta(themeId), [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      loaded,
      setThemeId,
      meta,
    }),
    [themeId, loaded, setThemeId, meta],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** 读取当前主题；须在 ThemeProvider 子树内使用 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
