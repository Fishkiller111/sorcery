import type { LocaleCode } from "./types.js";
import { LOCALE_CODES } from "./types.js";

/** Native labels for the language picker (always shown in that language). */
export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: "English",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  es: "Español",
  ru: "Русский",
};

const PICKER_TRIGGERS = new Set(
  [
    "language",
    "lang",
    "languages",
    "/language",
    "语言",
    "語言",
    "切换语言",
    "切換語言",
    "改语言",
    "改語言",
    "idioma",
    "idiomas",
    "cambiar idioma",
    "язык",
    "языки",
    "сменить язык",
    "change language",
    "change lang",
  ].map((s) => s.toLowerCase()),
);

/** Exact / near-exact phrases that set a locale directly. */
const DIRECT_LOCALE_ALIASES: Record<string, LocaleCode> = {
  en: "en",
  eng: "en",
  english: "en",
  "英文": "en",
  "英语": "en",
  "英語": "en",

  "zh-hans": "zh-Hans",
  "zh-cn": "zh-Hans",
  "zh_cn": "zh-Hans",
  "简体": "zh-Hans",
  "简体中文": "zh-Hans",
  "簡體": "zh-Hans",
  "簡體中文": "zh-Hans",
  "中文": "zh-Hans",
  chinese: "zh-Hans",

  "zh-hant": "zh-Hant",
  "zh-tw": "zh-Hant",
  "zh_tw": "zh-Hant",
  "zh-hk": "zh-Hant",
  "繁体": "zh-Hant",
  "繁體": "zh-Hant",
  "繁体中文": "zh-Hant",
  "繁體中文": "zh-Hant",

  es: "es",
  esp: "es",
  spanish: "es",
  español: "es",
  espanol: "es",
  "西班牙语": "es",
  "西班牙語": "es",

  ru: "ru",
  rus: "ru",
  russian: "ru",
  русский: "ru",
  "俄语": "ru",
  "俄語": "ru",
};

export type LanguageTextIntent =
  | { kind: "picker" }
  | { kind: "set"; locale: LocaleCode }
  | { kind: "none" };

export function parseLanguageText(raw: string): LanguageTextIntent {
  const text = raw.trim();
  if (!text) return { kind: "none" };

  const lower = text.toLowerCase();
  if (PICKER_TRIGGERS.has(lower)) return { kind: "picker" };

  // Native labels (exact)
  for (const code of LOCALE_CODES) {
    if (text === LOCALE_LABELS[code]) return { kind: "set", locale: code };
  }

  const alias = DIRECT_LOCALE_ALIASES[lower] ?? DIRECT_LOCALE_ALIASES[text];
  if (alias) return { kind: "set", locale: alias };

  return { kind: "none" };
}
