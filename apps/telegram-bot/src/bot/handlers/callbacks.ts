import type { BotContext } from "../context.js";
import { handleCharacters } from "../commands/characters.js";
import {
  setUserLocale,
  showLanguagePicker,
} from "../commands/language.js";
import { handleVoicePreview } from "../commands/ops.js";
import { sendAgentCard } from "../commands/start.js";
import {
  handleSoulAmountCallback,
  handleSoulCustomCallback,
  handleSoulMenuCallback,
  handleVipBuyCallback,
  handleVipMenuCallback,
  handleVipPayCallback,
} from "../commands/vip.js";
import {
  handleMilestoneClaimCallback,
  handleRewardsRefreshCallback,
  handleTaskAckCallback,
  handleTaskClaimCallback,
} from "../commands/rewards.js";
import { beginRoleChat } from "./chat.js";
import { openAppKeyboard, supportMenuKeyboard } from "../keyboards.js";
import { LOCALE_CODES, type LocaleCode } from "../../i18n/index.js";

function isLocaleCode(v: string): v is LocaleCode {
  return (LOCALE_CODES as readonly string[]).includes(v);
}

export async function handleCallbacks(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  await ctx.services.events.track({
    name: "tg_bot_callback",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    meta: { data, locale: ctx.locale },
  });

  await ctx.answerCallbackQuery().catch(() => undefined);

  if (
    ctx.botKind === "support" &&
    (data === "chars:list" ||
      data === "chat:continue" ||
      (data.startsWith("chat:") && data !== "chat:end") ||
      data.startsWith("agent:") ||
      data.startsWith("voice:") ||
      data.startsWith("task:"))
  ) {
    return;
  }

  if (data === "lang:picker") {
    await showLanguagePicker(ctx);
    return;
  }

  if (data.startsWith("lang:")) {
    const code = data.slice("lang:".length).trim();
    if (isLocaleCode(code)) {
      await setUserLocale(ctx, code);
    }
    return;
  }

  if (data === "chars:list") {
    await handleCharacters(ctx);
    return;
  }

  if (data === "chat:end") {
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
      ctx.t(isSupport ? "support.endedShort" : "chat.endedShort", { name }),
      {
        reply_markup:
          ctx.botKind === "support"
            ? supportMenuKeyboard(ctx.locale)
            : openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
      },
    );
    return;
  }

  if (data === "chat:continue") {
    if (!ctx.session.activeRoleId) {
      await ctx.reply(ctx.t("chat.noActiveContinue"), {
        reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
      });
      return;
    }
    await ctx.reply(ctx.t("chat.listening"));
    return;
  }

  if (data.startsWith("voice:")) {
    const roleId = data.slice("voice:".length).trim();
    if (roleId) await handleVoicePreview(ctx, roleId);
    return;
  }

  if (data === "vip:menu") {
    await handleVipMenuCallback(ctx);
    return;
  }

  if (data === "vip:soul") {
    await handleSoulMenuCallback(ctx);
    return;
  }

  if (data === "vip:soul:custom") {
    await handleSoulCustomCallback(ctx);
    return;
  }

  if (data.startsWith("vip:soul:amt:")) {
    const usd = data.slice("vip:soul:amt:".length).trim();
    if (usd) await handleSoulAmountCallback(ctx, usd);
    return;
  }

  if (data.startsWith("vip:buy:")) {
    const planId = data.slice("vip:buy:".length).trim();
    if (planId) await handleVipBuyCallback(ctx, planId);
    return;
  }

  if (data === "vip:pay:stripe") {
    await handleVipPayCallback(ctx, "stripe");
    return;
  }

  if (data === "vip:pay:crypto") {
    await handleVipPayCallback(ctx, "nowpayments");
    return;
  }

  if (data === "task:refresh") {
    await handleRewardsRefreshCallback(ctx);
    return;
  }

  if (data.startsWith("task:claim:")) {
    const taskId = data.slice("task:claim:".length).trim();
    if (taskId) await handleTaskClaimCallback(ctx, taskId);
    return;
  }

  if (data.startsWith("task:ms:")) {
    const threshold = data.slice("task:ms:".length).trim();
    if (threshold) await handleMilestoneClaimCallback(ctx, threshold);
    return;
  }

  if (data.startsWith("task:ack:")) {
    const taskId = data.slice("task:ack:".length).trim();
    if (taskId) await handleTaskAckCallback(ctx, taskId);
    return;
  }

  if (data.startsWith("chat:")) {
    const roleId = data.slice("chat:".length).trim();
    if (roleId) {
      await beginRoleChat(ctx, roleId);
    }
    return;
  }

  if (data.startsWith("agent:")) {
    const roleId = data.slice("agent:".length).trim();
    if (roleId) {
      await sendAgentCard(ctx, roleId);
    }
  }
}
