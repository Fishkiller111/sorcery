import type { BotContext } from "../context.js";
import {
  chatActiveKeyboard,
  chatNudgeKeyboard,
  chatQuotaSubscribeKeyboard,
  chatSoftUpsellKeyboard,
  openAppKeyboard,
  supportActiveKeyboard,
  supportMenuKeyboard,
} from "../keyboards.js";
import { parseLanguageText } from "../../i18n/languageText.js";
import { setUserLocale, showLanguagePicker } from "../commands/language.js";
import { tryHandleSoulUsdMessage } from "../commands/vip.js";
import { logBotTranscript } from "../transcript.js";

export async function beginRoleChat(
  ctx: BotContext,
  roleId: string,
  roleName?: string,
): Promise<void> {
  if (!ctx.from) return;

  // 进入轻聊前结束本地客服
  if (ctx.session.chatMode === "support") {
    ctx.services.support.endSupport(ctx.session);
  }

  let name = roleName;
  if (!name) {
    try {
      let token: string | undefined;
      try {
        ({ token } = await ctx.services.auth.getTokenForTelegramUser({
          telegramId: ctx.from.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          languageCode: ctx.from.language_code,
          aff: ctx.session.pendingAffCode,
          channelCode: ctx.session.pendingChannelCode,
          startPayload: ctx.session.pendingStartPayload,
          entry: "bot",
        }));
      } catch {
        /* ignore — getExploreRole has public-list fallback */
      }
      const role = await ctx.services.api.getExploreRole(roleId, token);
      name = role?.name;
    } catch {
      /* ignore */
    }
  }
  name = name ?? ctx.t("companion.default");

  await ctx.services.events.track({
    name: "tg_bot_chat_start",
    at: new Date().toISOString(),
    telegramUserId: ctx.from.id,
    telegramUsername: ctx.from.username,
    chatId: ctx.chat?.id,
    meta: { roleId, roleName: name, locale: ctx.locale },
  });

  try {
    const { quotaLabel } = await ctx.services.chat.beginChat(
      ctx.session,
      roleId,
      name,
      ctx.from,
      ctx.locale,
      { mode: "character" },
    );

    await ctx.reply(
      [
        ctx.t("chat.beginTitle", { name }),
        ctx.t("chat.beginHint"),
        "",
        quotaLabel,
        ctx.t("chat.beginCap", { max: ctx.config.botMaxTurnsPerDay }),
        "",
        ctx.t("chat.beginMiniApp"),
      ].join("\n"),
      {
        reply_markup: chatActiveKeyboard(ctx.config, roleId, ctx.session, ctx.locale),
        link_preview_options: { is_disabled: true },
      },
    );
  } catch (err) {
    console.error("[chat] begin failed", err);
    await ctx.reply(ctx.t("chat.beginFailed"), {
      reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    });
  }
}

export async function handleChatMessage(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text || !ctx.from) return;
  if (text.startsWith("/")) return;

  const langIntent = parseLanguageText(text);
  if (langIntent.kind === "picker") {
    await showLanguagePicker(ctx);
    return;
  }
  if (langIntent.kind === "set") {
    await setUserLocale(ctx, langIntent.locale);
    return;
  }

  if (await tryHandleSoulUsdMessage(ctx)) {
    return;
  }

  // —— 客服：本地 Agent + LLM（等待时用「正在回复…」占位）——
  if (ctx.session.chatMode === "support") {
    const dedicated = ctx.botKind === "support";
    const inlineKb = dedicated
      ? undefined
      : supportActiveKeyboard(ctx.config, ctx.session, ctx.locale);
    const pending = await ctx.reply(ctx.t("support.thinking"), inlineKb ? { reply_markup: inlineKb } : undefined);

    const result = await ctx.services.support.sendSupportMessage(
      ctx.session,
      text,
      ctx.locale,
    );

    await ctx.services.events.track({
      name: result.ok ? "tg_bot_support_turn" : "tg_bot_support_error",
      at: new Date().toISOString(),
      telegramUserId: ctx.from.id,
      telegramUsername: ctx.from.username,
      chatId: ctx.chat?.id,
      meta: result.ok
        ? { turn: result.turn, locale: ctx.locale }
        : { reason: result.reason, locale: ctx.locale },
    });

    const finalText = result.ok
      ? `${result.reply}\n\n${ctx.t("support.turnFooter", { turn: result.turn })}`
      : result.message;

    logBotTranscript(ctx, [
      { direction: "user", eventName: "support_turn", content: text },
      {
        direction: "bot",
        eventName: result.ok ? "support_turn" : "support_error",
        content: result.ok ? result.reply : result.message,
      },
    ]);

    try {
      await ctx.api.editMessageText(ctx.chat!.id, pending.message_id, finalText, inlineKb ? { reply_markup: inlineKb } : undefined);
    } catch {
      await ctx.reply(finalText, {
        reply_markup: dedicated ? supportMenuKeyboard(ctx.locale) : inlineKb,
      });
    }
    return;
  }

  if (!ctx.session.activeRoleId) {
    return;
  }

  await ctx.replyWithChatAction("typing").catch(() => undefined);

  const result = await ctx.services.chat.sendUserMessage(
    ctx.session,
    text,
    ctx.from,
    ctx.locale,
  );

  await ctx.services.events.track({
    name: result.ok ? "tg_bot_chat_turn" : "tg_bot_chat_error",
    at: new Date().toISOString(),
    telegramUserId: ctx.from.id,
    telegramUsername: ctx.from.username,
    chatId: ctx.chat?.id,
    meta: result.ok
      ? {
          roleId: ctx.session.activeRoleId,
          mode: "character",
          turn: result.turnInSession,
          turnsToday: result.turnsToday,
          locale: ctx.locale,
        }
      : {
          reason: result.reason,
          mode: "character",
          locale: ctx.locale,
        },
  });

  if (!result.ok) {
    const kb =
      result.reason === "quota"
        ? chatQuotaSubscribeKeyboard(ctx.locale)
        : result.reason === "daily_cap"
          ? openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale)
          : ctx.session.activeRoleId
            ? chatActiveKeyboard(
                ctx.config,
                ctx.session.activeRoleId,
                ctx.session,
                ctx.locale,
              )
            : openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale);
    await ctx.reply(result.message, { reply_markup: kb });
    logBotTranscript(ctx, [
      { direction: "user", eventName: "chat_turn", content: text },
      { direction: "bot", eventName: "chat_error", content: result.message },
    ]);
    if (result.reason === "daily_cap") {
      ctx.services.chat.endChat(ctx.session);
    }
    return;
  }

  const footer = `\n\n${ctx.t("chat.turnFooter", {
    quota: result.quotaLabel,
    turn: result.turnInSession,
  })}`;
  let body = `${result.reply}${footer}`;

  logBotTranscript(ctx, [
    { direction: "user", eventName: "chat_turn", content: text },
    { direction: "bot", eventName: "chat_turn", content: result.reply },
  ]);

  if (result.hardStop) {
    body += `\n\n${ctx.t("chat.hardStop")}`;
    await ctx.reply(body, {
      reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    });
    ctx.services.chat.endChat(ctx.session);
    return;
  }

  // 软提醒优先于旧 Mini App nudge：本会话超过 10 轮、免费用户弹一次
  if (result.softUpsell) {
    body += `\n\n${ctx.t("chat.softUpsell")}`;
    await ctx.reply(body, {
      reply_markup: chatSoftUpsellKeyboard(ctx.locale),
    });
    return;
  }

  if (result.nudgeMiniApp) {
    body += `\n\n${ctx.t("chat.nudge")}`;
    await ctx.reply(body, {
      reply_markup: chatNudgeKeyboard(
        ctx.config,
        ctx.session.activeRoleId!,
        ctx.session,
        ctx.locale,
      ),
    });
    return;
  }

  await ctx.reply(body, {
    reply_markup: chatActiveKeyboard(
      ctx.config,
      ctx.session.activeRoleId!,
      ctx.session,
      ctx.locale,
    ),
  });
}
