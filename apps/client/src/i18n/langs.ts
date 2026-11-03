import type { Lang } from './types';

/** App UI + user preference languages (aligned with backend codes). */
export const APP_LANGS: readonly Lang[] = ['zh', 'en', 'jp', 'ru', 'es'];

export const LANG_LABELS: Record<Lang, { native: string; short: string }> = {
  zh: { native: '中文', short: '中' },
  en: { native: 'English', short: 'EN' },
  jp: { native: '日本語', short: 'JP' },
  ru: { native: 'Русский', short: 'RU' },
  es: { native: 'Español', short: 'ES' },
};

export function isAppLang(value: string): value is Lang {
  return (APP_LANGS as readonly string[]).includes(value);
}

export function nextAppLang(current: Lang): Lang {
  const index = APP_LANGS.indexOf(current);
  const next = index < 0 ? 0 : (index + 1) % APP_LANGS.length;
  return APP_LANGS[next];
}

export function langDisplayName(lang: Lang): string {
  return LANG_LABELS[lang].native;
}

/** Fallback order when a UI string has no translation for the active lang. */
export const LANG_FALLBACK: Record<Lang, Lang[]> = {
  zh: ['zh', 'en'],
  en: ['en', 'zh'],
  jp: ['jp', 'en', 'zh'],
  ru: ['ru', 'en', 'zh'],
  es: ['es', 'en', 'zh'],
};
