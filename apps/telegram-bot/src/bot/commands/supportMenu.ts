import { LOCALE_CODES, t } from "../../i18n/index.js";
import type { BotContext } from "../context.js";
import { supportMenuKeyboard } from "../keyboards.js";
import { sendRechargeGuidePhotos } from "../rechargeGuide.js";
import { logBotTranscript } from "../transcript.js";
import { handleVipCommand } from "./vip.js";

export type SupportMenuAction = "recharge" | "soul" | "feedback";

export function matchSupportMenuAction(
  text: string,
): SupportMenuAction | null {
  const raw = text.trim();
  if (!raw) return null;
  for (const locale of LOCALE_CODES) {
    if (raw === t(locale, "support.menuRecharge")) return "recharge";
    if (raw === t(locale, "support.menuSoul")) return "soul";
    if (raw === t(locale, "support.menuFeedback")) return "feedback";
  }
  return null;
}

export async function handleSupportMenuAction(
  ctx: BotContext,
  action: SupportMenuAction,
): Promise<void> {
  ctx.session.awaitingSoulUsd = false;
  ctx.session.soulPlanId = undefined;
  const kb = supportMenuKeyboard(ctx.locale);
  if (action === "recharge") {
    await sendRechargeGuidePhotos(ctx);
    const guide = ctx.t("support.rechargeGuide");
    await ctx.reply(guide, { reply_markup: kb });
    logBotTranscript(ctx, [
      { direction: "bot", eventName: "menu_recharge", content: guide },
    ]);
    await handleVipCommand(ctx);
    return;
  }
  if (action === "soul") {
    const body = ctx.t("support.soulExplain");
    await ctx.reply(body, { reply_markup: kb });
    logBotTranscript(ctx, [
      { direction: "bot", eventName: "menu_soul", content: body },
    ]);
    return;
  }
  const prompt = ctx.t("support.feedbackPrompt");
  await ctx.reply(prompt, { reply_markup: kb });
  logBotTranscript(ctx, [
    { direction: "bot", eventName: "menu_feedback", content: prompt },
  ]);
}
