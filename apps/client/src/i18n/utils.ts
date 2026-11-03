import { LANG_FALLBACK } from './langs';
import { Lang, LocalizedString, Localized } from './types';

export function resolveLocalized(value: Localized | undefined, lang: Lang): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  for (const code of LANG_FALLBACK[lang]) {
    const text = value[code];
    if (typeof text === 'string' && text.length > 0) return text;
  }
  return '';
}

export function isLocalized(value: unknown): value is LocalizedString {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LocalizedString).zh === 'string' &&
    typeof (value as LocalizedString).en === 'string'
  );
}
