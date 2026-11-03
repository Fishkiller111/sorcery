import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config.js";
import type { ParsedStartPayload } from "./startPayload.js";

export type BotEventName =
  | "tg_bot_start"
  | "tg_bot_app_command"
  | "tg_bot_characters"
  | "tg_bot_agent_card"
  | "tg_bot_rate_limited"
  | "tg_bot_callback"
  | "tg_bot_chat_start"
  | "tg_bot_chat_turn"
  | "tg_bot_chat_error"
  | "tg_bot_support_start"
  | "tg_bot_support_turn"
  | "tg_bot_support_error"
  | "tg_bot_bind_info"
  | "tg_bot_drop_generated"
  | "tg_bot_aff_pack"
  | "tg_bot_stats"
  | "tg_bot_voice_preview"
  | "tg_bot_language_set"
  | "tg_bot_vip_open"
  | "tg_bot_vip_invoice"
  | "tg_bot_vip_paid"
  | "tg_bot_affiliate_command";

export type BotEvent = {
  name: BotEventName;
  at: string;
  telegramUserId?: number;
  telegramUsername?: string;
  chatId?: number;
  payload?: ParsedStartPayload;
  meta?: Record<string, unknown>;
};

export function createEventLogger(config: AppConfig) {
  let ensured = false;

  async function ensureDir() {
    if (!config.eventsDir || ensured) return;
    await mkdir(config.eventsDir, { recursive: true });
    ensured = true;
  }

  async function track(event: BotEvent): Promise<void> {
    const line = JSON.stringify(event);
    console.log(`[event] ${line}`);
    if (!config.eventsDir) return;
    try {
      await ensureDir();
      const file = path.join(
        config.eventsDir,
        `events-${new Date().toISOString().slice(0, 10)}.jsonl`,
      );
      await appendFile(file, `${line}\n`, "utf8");
    } catch (err) {
      console.error("[event] failed to persist", err);
    }
  }

  return { track };
}

export type EventLogger = ReturnType<typeof createEventLogger>;
