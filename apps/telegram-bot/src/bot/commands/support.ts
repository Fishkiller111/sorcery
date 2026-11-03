import type { BotContext } from "../context.js";
import { openAppKeyboard, openSupportBotKeyboard, supportActiveKeyboard, supportMenuKeyboard } from "../keyboards.js";
import { syncChatCommands } from "./syncChatCommands.js";
import { logBotTranscript } from "../transcript.js";

function isDedicatedSupportBot(ctx: BotContext): boolean {
  if (ctx.botKind === "support") return true;
  const dedicated = (ctx.config.supportBotUsername || "").trim();
  const me = ctx.me?.username?.replace(/^@/, "") ?? "";
  return Boolean(dedicated && me && dedicated.toLowerCase() === me.toLowerCase());
}

/**
 * /support — 主 bot：有独立客服 bot 时引导过去；否则本会话进入客服 Agent。
 */
export async function handleSupportCommand(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;

  const dedicated = (ctx.config.supportBotUsername || "").trim();
  if (dedicated && !isDedicatedSupportBot(ctx)) {
    await ctx.reply(ctx.t("support.goToBot", { username: dedicated }), {
      reply_markup: openSupportBotKeyboard(dedicated, ctx.locale),
      link_preview_options: { is_disabled: true },
    });
    return;
  }

  if (!ctx.services.support.isLlmConfigured()) {
    await ctx.reply(ctx.t("support.notConfigured"), {
      reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    });
    return;
  }

  const name = ctx.services.support.agentName;
  const dedicatedBot = isDedicatedSupportBot(ctx);
  const menu = dedicatedBot
    ? supportMenuKeyboard(ctx.locale)
    : supportActiveKeyboard(ctx.config, ctx.session, ctx.locale);

  if (dedicatedBot) {
    await syncChatCommands(ctx, ctx.locale);
  }

  if (ctx.session.chatMode === "support") {
    const active = ctx.t("support.active", { name });
    await ctx.reply(active, {
      reply_markup: menu,
    });
    logBotTranscript(ctx, [
      { direction: "bot", eventName: "support_start", content: active },
    ]);
    return;
  }

  // 切出角色轻聊（若有）
  if (ctx.session.chatMode === "character" || ctx.session.activeRoleId) {
    ctx.services.chat.endChat(ctx.session);
  }

  await ctx.services.events.track({
    name: "tg_bot_support_start",
    at: new Date().toISOString(),
    telegramUserId: ctx.from.id,
    telegramUsername: ctx.from.username,
    chatId: ctx.chat?.id,
    meta: { agentId: "bot_support", roleName: name, locale: ctx.locale },
  });

  ctx.services.support.beginSupport(ctx.session);

  const body = [ctx.t("support.beginTitle", { name }), ctx.t("support.helpBody")].join("\n");
  await ctx.reply(body, {
    reply_markup: menu,
    link_preview_options: { is_disabled: true },
  });
  logBotTranscript(ctx, [
    { direction: "bot", eventName: "support_start", content: body },
  ]);
}
