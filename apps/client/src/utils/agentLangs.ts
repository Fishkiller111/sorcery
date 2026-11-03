import type { Lang } from '../i18n/types';
import { LANG_LABELS } from '../i18n/langs';

const LANG_BADGE: Record<string, Partial<Record<Lang, string>>> = {
  en: { zh: 'EN', en: 'EN', jp: 'EN', ru: 'EN', es: 'EN' },
  zh: { zh: '中文', en: '中文', jp: '中文', ru: '中文', es: '中文' },
  jp: { zh: 'JP', en: 'JP', jp: 'JP', ru: 'JP', es: 'JP' },
  ru: { zh: 'RU', en: 'RU', jp: 'RU', ru: 'RU', es: 'RU' },
  es: { zh: 'ES', en: 'ES', jp: 'ES', ru: 'ES', es: 'ES' },
};

export function normalizeSupportedLangs(langs?: string[]): string[] {
  if (!langs?.length) return ['en'];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of langs) {
    const code = raw.trim().toLowerCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out.length ? out : ['en'];
}

export function formatLangBadge(code: string, uiLang: Lang): string {
  const key = code.trim().toLowerCase();
  return LANG_BADGE[key]?.[uiLang] ?? key.toUpperCase();
}

export function formatSupportedLangsText(langs: string[] | undefined, uiLang: Lang): string {
  return normalizeSupportedLangs(langs)
    .map((code) => formatLangBadge(code, uiLang))
    .join(' · ');
}

export function formatLangNative(code: string): string {
  const key = code.trim().toLowerCase();
  if (key in LANG_LABELS) {
    return LANG_LABELS[key as Lang].native;
  }
  return key.toUpperCase();
}
