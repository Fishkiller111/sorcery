import type { MiddlewareFn } from "grammy";
import type { BotContext } from "../context.js";

export const requestLogMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const kind =
    ctx.update.message?.text?.slice(0, 40) ??
    ctx.update.callback_query?.data ??
    Object.keys(ctx.update).find((k) => k !== "update_id") ??
    "update";
  const uid = ctx.from?.id ?? "-";
  console.log(`[tg] update=${ctx.update.update_id} user=${uid} ${kind}`);
  await next();
};
