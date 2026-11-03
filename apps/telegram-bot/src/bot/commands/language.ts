import type { BotContext } from "../context.js";
import { languagePickerKeyboard, supportMenuKeyboard } from "../keyboards.js";
import { LOCALE_LABELS, makeT, type LocaleCode } from "../../i18n/index.js";
import { parseLanguageText } from "../../i18n/languageText.js";
import { syncChatCommands } from "./syncChatCommands.js";

export function applyLocale(ctx: BotContext, locale: LocaleCode): void {
  ctx.locale = locale;
  ctx.t = makeT(locale);
  ctx.session.locale = locale;
  if (ctx.from) {
    void ctx.services.localePrefs.set(ctx.from.id, locale);
  }
}

export async function showLanguagePicker(ctx: BotContext): Promise<void> {
  const current = LOCALE_LABELS[ctx.locale];
  await ctx.reply(
    [ctx.t("lang.prompt"), "", ctx.t("lang.current", { language: current }), "", ctx.t("lang.hint")].join(
      "\n",
    ),
    {
      reply_markup: languagePickerKeyboard(ctx.locale),
    },
  );
}

export async function setUserLocale(ctx: BotContext, locale: LocaleCode): Promise<void> {
  applyLocale(ctx, locale);
  await syncChatCommands(ctx, locale);
  await ctx.services.events.track({
    name: "tg_bot_language_set",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    meta: { locale },
  });
  await ctx.reply(
    [
      ctx.t("lang.changed", { language: LOCALE_LABELS[locale] }),
      "",
      ctx.t("lang.changedHint"),
      ctx.t("lang.menuSynced"),
    ].join("\n"),
    {
      reply_markup:
        ctx.botKind === "support"
          ? supportMenuKeyboard(locale)
          : languagePickerKeyboard(locale),
    },
  );
}

export async function handleLanguageCommand(ctx: BotContext): Promise<void> {
  const match = ctx.match;
  const arg =
    typeof match === "string" ? match.trim() : Array.isArray(match) ? String(match[0] ?? "").trim() : "";

  if (arg) {
    const intent = parseLanguageText(arg);
    if (intent.kind === "set") {
      await setUserLocale(ctx, intent.locale);
      return;
    }
  }

  await showLanguagePicker(ctx);
}
