import type { BotContext } from "../bot/context.js";

export type TranscriptTurn = {
  direction: "user" | "bot";
  eventName: string;
  content: string;
};

function transcriptBotKind(ctx: BotContext): "main" | "support" {
  if (ctx.botKind === "support" || ctx.session.chatMode === "support") {
    return "support";
  }
  return "main";
}

/** Fire-and-forget: persist user↔bot turns for Admin Bot 管理. */
export function logBotTranscript(ctx: BotContext, turns: TranscriptTurn[]): void {
  if (ctx.botKind === "custom") return;
  if (!ctx.from || !turns.length) return;
  const cleaned = turns
    .map((t) => ({
      ...t,
      content: t.content.trim(),
    }))
    .filter((t) => t.content);
  if (!cleaned.length) return;
  void ctx.services.api
    .ingestBotTranscript({
      botKind: transcriptBotKind(ctx),
      telegramUserId: ctx.from.id,
      telegramUsername: ctx.from.username,
      chatId: ctx.chat?.id,
      locale: ctx.locale,
      turns: cleaned,
    })
    .catch((err) => {
      console.warn("[transcript] ingest failed", err);
    });
}
