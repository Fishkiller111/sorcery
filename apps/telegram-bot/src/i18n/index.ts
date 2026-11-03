import { en } from "./locales/en.js";
import { es } from "./locales/es.js";
import { ru } from "./locales/ru.js";
import { zhHans } from "./locales/zh-Hans.js";
import { zhHant } from "./locales/zh-Hant.js";
import { LOCALE_LABELS } from "./languageText.js";
import { resolveLocale, telegramLanguageCode } from "./resolveLocale.js";
import {
  LOCALE_CODES,
  type LocaleCode,
  type MessageCatalog,
  type MessageKey,
  type MessageParams,
  type TranslateFn,
} from "./types.js";

export type { LocaleCode, MessageKey, MessageParams, TranslateFn };
export { LOCALE_CODES, LOCALE_LABELS, resolveLocale, telegramLanguageCode };

const catalogs: Record<LocaleCode, MessageCatalog> = {
  en,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  es,
  ru,
};

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = params[key];
    return v === undefined || v === null ? `{{${key}}}` : String(v);
  });
}

export function t(
  locale: LocaleCode,
  key: MessageKey,
  params?: MessageParams,
): string {
  const catalog = catalogs[locale] ?? catalogs.en;
  const template = catalog[key] ?? catalogs.en[key] ?? key;
  return interpolate(template, params);
}

export function makeT(locale: LocaleCode): TranslateFn {
  return (key, params) => t(locale, key, params);
}

export function commandDescriptions(locale: LocaleCode): {
  command: string;
  description: string;
}[] {
  return [
    { command: "start", description: t(locale, "cmd.start") },
    { command: "app", description: t(locale, "cmd.app") },
    { command: "characters", description: t(locale, "cmd.characters") },
    { command: "chat", description: t(locale, "cmd.chat") },
    { command: "support", description: t(locale, "cmd.support") },
    { command: "end", description: t(locale, "cmd.end") },
    { command: "language", description: t(locale, "cmd.language") },
    { command: "bind", description: t(locale, "cmd.bind") },
    { command: "vip", description: t(locale, "cmd.vip") },
    { command: "invite", description: t(locale, "cmd.invite") },
    { command: "rewards", description: t(locale, "cmd.rewards") },
    { command: "affiliate", description: t(locale, "cmd.affiliate") },
    { command: "help", description: t(locale, "cmd.help") },
  ];
}

export function supportBotCommandDescriptions(locale: LocaleCode): {
  command: string;
  description: string;
}[] {
  return [
    { command: "recharge", description: t(locale, "cmd.supportRecharge") },
    { command: "soul", description: t(locale, "cmd.supportSoul") },
    { command: "feedback", description: t(locale, "cmd.supportFeedback") },
  ];
}
