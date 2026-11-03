import type { BotContext } from "../context.js";
import { openAppKeyboard } from "../keyboards.js";
import { homeMiniAppUrl } from "../../services/urls.js";

export async function handleApp(ctx: BotContext): Promise<void> {
  await ctx.services.events.track({
    name: "tg_bot_app_command",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    meta: { locale: ctx.locale },
  });

  const url = homeMiniAppUrl(ctx.config, undefined, "app_command", ctx.session);
  await ctx.reply(ctx.t("app.body", { url }), {
    reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    link_preview_options: { is_disabled: true },
  });
}
