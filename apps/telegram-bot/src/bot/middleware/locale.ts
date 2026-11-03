import type { MiddlewareFn } from "grammy";
import { makeT, resolveLocale, type LocaleCode, type TranslateFn } from "../../i18n/index.js";
import { syncChatCommands } from "../commands/syncChatCommands.js";
import type { BotContext } from "../context.js";

export function localeMiddleware(): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    let locale: LocaleCode | undefined = ctx.session.locale;

    if (!locale && ctx.from) {
      locale = await ctx.services.localePrefs.get(ctx.from.id);
      if (locale) ctx.session.locale = locale;
    }

    if (!locale) {
      locale = resolveLocale(ctx.from?.language_code);
    }

    ctx.locale = locale;
    ctx.t = makeT(locale) as TranslateFn;

    // Push chat-scoped slash menu when locale or bot kind differs
    const kind = ctx.botKind ?? "main";
    if (
      ctx.chat?.id &&
      (ctx.session.commandsLocale !== locale || ctx.session.commandsKind !== kind)
    ) {
      void syncChatCommands(ctx, locale);
    }

    await next();
  };
}
