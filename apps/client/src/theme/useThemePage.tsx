import type { ComponentType } from 'react';
import { useTheme } from './system/ThemeContext';
import type { ThemeId } from './system/types';

type ThemePageMap<P extends object> = Partial<Record<ThemeId, ComponentType<P>>>;

/**
 * 页面级主题分发：当前 themeId 在 map 中有对应实现时返回该组件，否则返回 null（走 Soviet 原实现）。
 */
export function useThemePage<P extends object>(
  themeMap: ThemePageMap<P>,
): ComponentType<P> | null {
  const { themeId, loaded } = useTheme();
  if (!loaded) return null;
  return themeMap[themeId] ?? null;
}
