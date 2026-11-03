import { Bot } from "grammy";
import type { LanguageCode } from "grammy/types";
import type { AppConfig } from "../config.js";
import {
  LOCALE_CODES,
  supportBotCommandDescriptions,
  telegramLanguageCode,
} from "../i18n/index.js";
import type { BotContext, BotServices } from "./context.js";
import { handleSupportCommand } from "./commands/support.js";
import {
  handleSupportMenuAction,
  matchSupportMenuAction,
} from "./commands/supportMenu.js";
import { handleCallbacks } from "./handlers/callbacks.js";
import { handleChatMessage } from "./handlers/chat.js";
import { attachCommonMiddleware, telegramClientOptions } from "./createBot.js";
import { openAppKeyboard } from "./keyboards.js";

/**
 * Independent customer-support Telegram bot.
 * Menu: recharge / Soul / feedback. Other text → support agent.
 */
export function createSupportBot(
  config: AppConfig,
  services: BotServices,
): Bot<BotContext> | null {
  if (!config.supportBotToken) return null;

  const bot = new Bot<BotContext>(config.supportBotToken, {
    client: telegramClientOptions(config),
  });

  attachCommonMiddleware(bot, config, services, "support");

  bot.command("start", (ctx) => handleSupportCommand(ctx));
  bot.command("support", (ctx) => handleSupportCommand(ctx));
  bot.command("help", (ctx) => handleSupportCommand(ctx));
  bot.command("end", (ctx) => handleSupportCommand(ctx));
  bot.command("recharge", (ctx) => handleSupportMenuAction(ctx, "recharge"));
  bot.command("soul", (ctx) => handleSupportMenuAction(ctx, "soul"));
  bot.command("feedback", (ctx) => handleSupportMenuAction(ctx, "feedback"));
  bot.command("vip", (ctx) => handleSupportMenuAction(ctx, "recharge"));

  bot.on("callback_query:data", (ctx) => handleCallbacks(ctx));
  bot.on("message:text", async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text || text.startsWith("/")) return;

    const menu = matchSupportMenuAction(text);
    if (menu) {
      await handleSupportMenuAction(ctx, menu);
      return;
    }

    if (ctx.session.chatMode !== "support") {
      if (!ctx.services.support.isLlmConfigured()) {
        await ctx.reply(ctx.t("support.notConfigured"), {
          reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
        });
        return;
      }
      ctx.services.support.beginSupport(ctx.session);
    }
    await handleChatMessage(ctx);
  });

  bot.catch((err) => {
    console.error("[support-bot] error", err.error);
  });

  return bot;
}

export async function setupSupportBotCommands(bot: Bot<BotContext>): Promise<void> {
  await bot.api.deleteMyCommands();
  await bot.api.setMyCommands(supportBotCommandDescriptions("en"));
  for (const locale of LOCALE_CODES) {
    const languageCode = telegramLanguageCode(locale);
    if (!languageCode || languageCode === "en") continue;
    try {
      await bot.api.deleteMyCommands({ language_code: languageCode as LanguageCode });
      await bot.api.setMyCommands(supportBotCommandDescriptions(locale), {
        language_code: languageCode as LanguageCode,
      });
    } catch (err) {
      console.warn(`[boot] support setMyCommands(${languageCode}) failed`, err);
    }
  }
}
