import type { ThemeId, ThemeMeta, ThemeRegistry } from './types';

export const themeMeta: ThemeRegistry = {
  default: {
    id: 'default',
    name: 'Soulthread',
    previewColor: '#BA3C47',
    default: true,
  },
  soviet: {
    id: 'soviet',
    name: 'Soviet Archive',
    previewColor: '#8B1A1A',
    default: false,
  },
  modern: {
    id: 'modern',
    name: 'Modern Soul',
    previewColor: '#1a1a2e',
    default: false,
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'default';

export const THEME_IDS = Object.keys(themeMeta) as ThemeId[];

export function getThemeMeta(themeId: ThemeId): ThemeMeta {
  return themeMeta[themeId] ?? themeMeta[DEFAULT_THEME_ID];
}

export function isThemeId(value: string): value is ThemeId {
  return value in themeMeta;
}
