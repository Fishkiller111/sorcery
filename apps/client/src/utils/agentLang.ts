import type { LangId, LocaleFields } from '../components/create-agent/types';
import { emptyLocale } from '../components/create-agent/types';
import type { Lang } from '../i18n/types';

const HAN = /[\u4e00-\u9fff]/;
const KANA = /[\u3040-\u30ff]/;
const CYRILLIC = /[\u0400-\u04ff]/;

/** Map App UI language to create-agent locale id (aligned with backend). */
export function appLangToAgentLang(lang: Lang): LangId {
  switch (lang) {
    case 'zh':
    case 'jp':
    case 'ru':
    case 'es':
    case 'en':
      return lang;
    default:
      return 'en';
  }
}

export function defaultAgentLangs(appLang: Lang): LangId[] {
  return [appLangToAgentLang(appLang)];
}

export function isEnglishAgentLang(lang: LangId): boolean {
  return lang === 'en';
}

/** Guess agent content language from script (when user types on the wrong tab). */
export function detectScriptLang(text: string): LangId | null {
  if (!text.trim()) return null;
  if (HAN.test(text)) return 'zh';
  if (KANA.test(text)) return 'jp';
  if (CYRILLIC.test(text)) return 'ru';
  return null;
}

export function localeTextBlob(fields: LocaleFields): string {
  return [
    fields.name,
    fields.introduction,
    fields.appearance,
    fields.sceneName,
    fields.sceneDesc,
    ...fields.personality,
  ].join('\n');
}

function hasLocaleContent(fields: LocaleFields): boolean {
  return (
    Boolean(fields.name.trim()) ||
    Boolean(fields.introduction.trim()) ||
    fields.personality.length > 0 ||
    Boolean(fields.appearance.trim()) ||
    Boolean(fields.sceneName.trim()) ||
    Boolean(fields.sceneDesc.trim())
  );
}

function mergeLocale(base: LocaleFields, overlay: LocaleFields): LocaleFields {
  return {
    name: overlay.name.trim() || base.name,
    introduction: overlay.introduction.trim() || base.introduction,
    personality: overlay.personality.length > 0 ? overlay.personality : base.personality,
    appearance: overlay.appearance.trim() || base.appearance,
    sceneName: overlay.sceneName.trim() || base.sceneName,
    sceneDesc: overlay.sceneDesc.trim() || base.sceneDesc,
  };
}

/**
 * Move CJK/Cyrillic content out of the English slot; drop empty language tabs.
 */
export function normalizeAgentLocales(
  supportedLangs: LangId[],
  locales: Record<LangId, LocaleFields>,
): { langs: LangId[]; locales: Record<LangId, LocaleFields> } {
  const out: Record<LangId, LocaleFields> = {
    en: { ...locales.en },
    zh: { ...locales.zh },
    jp: { ...locales.jp },
    ru: { ...locales.ru },
    es: { ...locales.es },
  };
  let langs = [...supportedLangs];

  if (langs.includes('en')) {
    const detected = detectScriptLang(localeTextBlob(out.en));
    if (detected && detected !== 'en') {
      out[detected] = mergeLocale(out[detected], out.en);
      out.en = emptyLocale();
      langs = langs.filter((l) => l !== 'en');
      if (!langs.includes(detected)) langs.push(detected);
    }
  }

  langs = langs.filter((lang) => hasLocaleContent(out[lang]));
  if (langs.length === 0) langs = ['en'];

  return { langs, locales: out };
}

export function targetLangForInput(activeLang: LangId, text: string): LangId {
  const detected = detectScriptLang(text);
  if (activeLang === 'en' && detected && detected !== 'en') return detected;
  return activeLang;
}

export { mergeLocale };
