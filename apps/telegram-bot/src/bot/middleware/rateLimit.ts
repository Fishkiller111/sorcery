import type { MiddlewareFn } from "grammy";
import type { BotContext } from "../context.js";

type Bucket = { timestamps: number[] };

/**
 * Simple in-memory per-user rate limit (Sprint 1).
 * Enough to blunt spam; replace with Redis if multi-instance.
 */
export function rateLimitMiddleware(opts: {
  max: number;
  windowMs: number;
}): MiddlewareFn<BotContext> {
  const buckets = new Map<number, Bucket>();

  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }

    const now = Date.now();
    const bucket = buckets.get(userId) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < opts.windowMs);

    if (bucket.timestamps.length >= opts.max) {
      buckets.set(userId, bucket);
      await ctx.services.events.track({
        name: "tg_bot_rate_limited",
        at: new Date().toISOString(),
        telegramUserId: userId,
        telegramUsername: ctx.from?.username,
        chatId: ctx.chat?.id,
        meta: { max: opts.max, windowMs: opts.windowMs },
      });
      try {
        await ctx.reply(ctx.t("rateLimit"), { reply_markup: undefined });
      } catch {
        /* ignore */
      }
      return;
    }

    bucket.timestamps.push(now);
    buckets.set(userId, bucket);
    await next();
  };
}
