import type { LocaleCode } from "./types.js";

/**
 * Map Telegram `language_code` → supported bot locale.
 * @see https://core.telegram.org/bots/api#user
 */
export function resolveLocale(languageCode?: string | null): LocaleCode {
  const raw = (languageCode ?? "en").trim().toLowerCase().replace(/_/g, "-");
  if (!raw) return "en";

  if (raw.startsWith("zh")) {
    if (
      raw.includes("hant") ||
      raw === "zh-tw" ||
      raw === "zh-hk" ||
      raw === "zh-mo" ||
      raw.startsWith("zh-tw") ||
      raw.startsWith("zh-hk") ||
      raw.startsWith("zh-mo")
    ) {
      return "zh-Hant";
    }
    return "zh-Hans";
  }

  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("ru")) return "ru";
  if (raw.startsWith("en")) return "en";

  return "en";
}

/** Telegram Bot API `language_code` for setMyCommands (ISO 639-1 only). */
export function telegramLanguageCode(locale: LocaleCode): string | null {
  switch (locale) {
    case "zh-Hans":
      return "zh";
    case "zh-Hant":
      // Bot API has no zh-Hant slot; Traditional UI still works via language_code → locale.
      return null;
    case "en":
      return "en";
    case "es":
      return "es";
    case "ru":
      return "ru";
  }
}

