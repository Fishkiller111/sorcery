import type { MiddlewareFn } from "grammy";
import type { BotContext } from "../context.js";
import { matchSupportMenuAction } from "../commands/supportMenu.js";
import { logBotTranscript } from "../transcript.js";

function commandName(text: string): string {
  const m = text.match(/^\/([a-zA-Z0-9_]+)/);
  return m?.[1]?.toLowerCase() ?? "";
}

function clickLabel(label: string): string {
  return `菜单点击：${label}`;
}

function describeCallback(
  ctx: BotContext,
  data: string,
): { eventName: string; content: string } {
  if (data === "chars:list") {
    return { eventName: "cb_chars", content: clickLabel(ctx.t("kb.pickCharacter")) };
  }
  if (data === "lang:picker") {
    return { eventName: "cb_lang", content: clickLabel(ctx.t("kb.language")) };
  }
  if (data.startsWith("lang:")) {
    const code = data.slice("lang:".length).trim();
    return { eventName: "cb_lang", content: clickLabel(`${ctx.t("kb.language")} ${code}`) };
  }
  if (data === "chat:end") {
    const key = ctx.session.chatMode === "support" ? "kb.endSupport" : "kb.endChat";
    return { eventName: "cb_chat_end", content: clickLabel(ctx.t(key)) };
  }
  if (data === "chat:continue") {
    return { eventName: "cb_chat", content: clickLabel(ctx.t("kb.keepChatting")) };
  }
  if (data.startsWith("voice:")) {
    return { eventName: "cb_voice", content: clickLabel(ctx.t("kb.voicePreview")) };
  }
  if (data === "vip:menu") {
    return { eventName: "cb_vip", content: clickLabel("VIP") };
  }
  if (data === "vip:soul") {
    return { eventName: "cb_soul", content: clickLabel("Soul Coin") };
  }
  if (data === "vip:soul:custom") {
    return { eventName: "cb_soul", content: clickLabel(ctx.t("vip.soulCustomButton")) };
  }
  if (data.startsWith("vip:soul:amt:")) {
    const usd = data.slice("vip:soul:amt:".length).trim();
    return { eventName: "cb_soul", content: clickLabel(`Soul $${usd}`) };
  }
  if (data.startsWith("vip:buy:")) {
    return { eventName: "cb_vip_buy", content: clickLabel("购买套餐") };
  }
  if (data === "vip:pay:stripe") {
    return { eventName: "cb_vip_pay", content: clickLabel("Stripe 卡支付") };
  }
  if (data === "vip:pay:crypto") {
    return { eventName: "cb_vip_pay", content: clickLabel("加密货币支付") };
  }
  if (data === "task:refresh") {
    return { eventName: "cb_task", content: clickLabel("刷新任务") };
  }
  if (data.startsWith("task:claim:")) {
    return { eventName: "cb_task", content: clickLabel("领取任务") };
  }
  if (data.startsWith("task:ms:")) {
    return { eventName: "cb_task", content: clickLabel("领取里程碑") };
  }
  if (data.startsWith("task:ack:")) {
    return { eventName: "cb_task", content: clickLabel("确认任务") };
  }
  if (data.startsWith("chat:")) {
    return { eventName: "cb_chat_start", content: clickLabel(ctx.t("kb.quickChat")) };
  }
  if (data.startsWith("agent:")) {
    return { eventName: "cb_agent", content: clickLabel("角色卡片") };
  }
  return { eventName: "cb_other", content: clickLabel(data.slice(0, 80)) };
}

function logUserIntent(ctx: BotContext): void {
  if (!ctx.from) return;

  const cb = ctx.callbackQuery?.data?.trim();
  if (cb) {
    const { eventName, content } = describeCallback(ctx, cb);
    logBotTranscript(ctx, [{ direction: "user", eventName, content }]);
    return;
  }

  const text = ctx.message?.text?.trim();
  if (!text) return;

  if (text.startsWith("/")) {
    const cmd = commandName(text);
    if (!cmd) return;
    logBotTranscript(ctx, [
      {
        direction: "user",
        eventName: `cmd_${cmd}`.slice(0, 64),
        content: text.slice(0, 200),
      },
    ]);
    return;
  }

  const menu = matchSupportMenuAction(text);
  if (menu) {
    logBotTranscript(ctx, [
      { direction: "user", eventName: `menu_${menu}`, content: text },
    ]);
  }
}

/** Persist slash-menu, reply-keyboard, and inline-button clicks for Admin Bot 管理. */
export const transcriptIntentMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  logUserIntent(ctx);
  await next();
};
