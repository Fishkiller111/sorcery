import type { BotContext } from "../context.js";
import { ApiError } from "../../services/soulthread-api.js";

/** Approve checkout quickly — Telegram requires answer within ~10s. */
export async function handlePreCheckout(ctx: BotContext): Promise<void> {
  const q = ctx.preCheckoutQuery;
  if (!q) return;

  const orderId = (q.invoice_payload ?? "").trim();
  if (!orderId) {
    await ctx.answerPreCheckoutQuery(false, {
      error_message: ctx.t("vip.preCheckoutBad"),
    });
    return;
  }

  await ctx.answerPreCheckoutQuery(true);
}

export async function handleSuccessfulPayment(ctx: BotContext): Promise<void> {
  const payment = ctx.message?.successful_payment;
  const from = ctx.from;
  if (!payment || !from) return;

  const orderId = (payment.invoice_payload ?? "").trim();
  const chargeId = payment.telegram_payment_charge_id;
  const totalAmount = payment.total_amount;
  const currency = (payment.currency ?? "").toUpperCase();

  await ctx.services.events.track({
    name: "tg_bot_vip_paid",
    at: new Date().toISOString(),
    telegramUserId: from.id,
    telegramUsername: from.username,
    chatId: ctx.chat?.id,
    meta: { orderId, chargeId, totalAmount, currency },
  });

  try {
    const result = await ctx.services.api.confirmTelegramPayment({
      orderId,
      telegramPaymentChargeId: chargeId,
      telegramUserId: from.id,
      totalAmount,
      currency,
    });

    if (result.productType === "points_pack") {
      await ctx.reply(ctx.t("vip.paidPoints"));
    } else {
      await ctx.reply(ctx.t("vip.paidVip"));
    }
  } catch (err) {
    console.error("[vip] confirm failed", err);
    const detail =
      err instanceof ApiError ? `HTTP ${err.status}` : "confirm_error";
    await ctx.reply(ctx.t("vip.paidConfirmFailed", { detail }));
  }
}
