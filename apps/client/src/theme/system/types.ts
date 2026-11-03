export type ThemeId = 'soviet' | 'modern' | 'default';

export type ThemeMeta = {
  id: ThemeId;
  name: string;
  previewColor: string;
  default: boolean;
};

export type ThemeRegistry = Record<ThemeId, ThemeMeta>;
