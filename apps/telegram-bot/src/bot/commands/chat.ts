import type { BotContext } from "../context.js";
import { openAppKeyboard } from "../keyboards.js";
import { beginRoleChat } from "../handlers/chat.js";
import { handleCharacters } from "./characters.js";

export async function handleChatCommand(ctx: BotContext): Promise<void> {
  const match = ctx.match;
  const arg =
    typeof match === "string" ? match.trim() : Array.isArray(match) ? String(match[0] ?? "").trim() : "";

  if (arg) {
    await beginRoleChat(ctx, arg);
    return;
  }

  // 客服会话中：提示去 /support 或先结束
  if (ctx.session.chatMode === "support" && ctx.session.activeRoleId) {
    await ctx.reply(ctx.t("support.active", {
      name: ctx.session.activeRoleName ?? ctx.t("support.defaultName"),
    }));
    await ctx.reply(ctx.t("chat.pickToStart"));
    await handleCharacters(ctx);
    return;
  }

  if (ctx.session.activeRoleId) {
    await ctx.reply(
      ctx.t("chat.active", {
        name: ctx.session.activeRoleName ?? ctx.t("companion.a"),
      }),
      {
        reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
      },
    );
    return;
  }

  await ctx.reply(ctx.t("chat.pickToStart"));
  await handleCharacters(ctx);
}

export async function handleEndCommand(ctx: BotContext): Promise<void> {
  if (!ctx.session.activeRoleId && ctx.session.chatMode !== "support") {
    await ctx.reply(ctx.t("chat.endNone"));
    return;
  }
  const isSupport = ctx.session.chatMode === "support";
  const name =
    ctx.session.activeRoleName ??
    (isSupport ? ctx.t("support.defaultName") : ctx.t("companion.default"));
  if (isSupport) {
    ctx.services.support.endSupport(ctx.session);
  } else {
    ctx.services.chat.endChat(ctx.session);
  }
  await ctx.reply(
    ctx.t(isSupport ? "support.ended" : "chat.ended", { name }),
    {
      reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    },
  );
}

export async function handleBindCommand(ctx: BotContext): Promise<void> {
  const hasApiKey = Boolean(ctx.config.botApiKey);
  const lines = [
    ctx.t("bind.title"),
    "",
    hasApiKey ? ctx.t("bind.configured") : ctx.t("bind.notConfigured"),
    "",
    ctx.t("bind.emailSteps"),
  ];

  await ctx.services.events.track({
    name: "tg_bot_bind_info",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    meta: { locale: ctx.locale },
  });

  await ctx.reply(lines.join("\n"), {
    reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    link_preview_options: { is_disabled: true },
  });
}
