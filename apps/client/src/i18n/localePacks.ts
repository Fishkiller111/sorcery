import type { Lang } from './types';
import { LANG_FALLBACK } from './langs';
import jp from './locales/jp.json';
import ru from './locales/ru.json';
import es from './locales/es.json';

const LOCALE_PACKS: Partial<Record<Lang, Record<string, string>>> = {
  jp,
  ru,
  es,
};

export function getLocalePackText(lang: Lang, key: string): string | undefined {
  const pack = LOCALE_PACKS[lang];
  if (!pack) return undefined;
  const direct = pack[key];
  if (direct) return direct;
  for (const code of LANG_FALLBACK[lang]) {
    if (code === lang) continue;
    const fallback = LOCALE_PACKS[code as Lang]?.[key];
    if (fallback) return fallback;
  }
  return undefined;
}
