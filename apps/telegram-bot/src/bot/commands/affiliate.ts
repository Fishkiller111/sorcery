import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import type { LocaleCode } from "../../i18n/index.js";

/** Map bot locale → marketing site locale path for /affiliate/apply/. */
function marketingApplyPath(locale: LocaleCode): string {
  switch (locale) {
    case "zh-Hans":
    case "zh-Hant":
      return "/zh-hant/affiliate/apply/";
    case "ru":
      return "/ru/affiliate/apply/";
    case "es":
      return "/es/affiliate/apply/";
    default:
      return "/affiliate/apply/";
  }
}

function marketingDetailsPath(locale: LocaleCode): string {
  switch (locale) {
    case "zh-Hans":
    case "zh-Hant":
      return "/zh-hant/affiliate/";
    case "ru":
      return "/ru/affiliate/";
    case "es":
      return "/es/affiliate/";
    default:
      return "/affiliate/";
  }
}

function affiliateApplyUrl(ctx: BotContext): string {
  const base = `${ctx.config.marketingUrl}${marketingApplyPath(ctx.locale)}`;
  const params = new URLSearchParams({ source: "telegram_bot" });
  if (ctx.from?.id) params.set("tg_id", String(ctx.from.id));
  if (ctx.from?.username) params.set("tg_user", ctx.from.username);
  if (ctx.locale) params.set("locale", ctx.locale);
  return `${base}?${params.toString()}`;
}

export async function handleAffiliateCommand(ctx: BotContext): Promise<void> {
  await ctx.services.events.track({
    name: "tg_bot_affiliate_command",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    meta: { locale: ctx.locale },
  });

  const applyUrl = affiliateApplyUrl(ctx);
  const detailsUrl = `${ctx.config.marketingUrl}${marketingDetailsPath(ctx.locale)}`;
  const keyboard = new InlineKeyboard()
    .url(ctx.t("affiliate.applyButton"), applyUrl)
    .row()
    .url(ctx.t("affiliate.detailsButton"), detailsUrl);

  await ctx.reply(ctx.t("affiliate.body", { detailsUrl }), {
    reply_markup: keyboard,
    link_preview_options: { is_disabled: true },
  });
}
