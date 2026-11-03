import { Bot, session } from "grammy";
import type { LanguageCode } from "grammy/types";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { AppConfig } from "../config.js";
import {
  LOCALE_CODES,
  commandDescriptions,
  telegramLanguageCode,
} from "../i18n/index.js";
import { createAuthStore } from "../services/authStore.js";
import { createChatService } from "../services/chatService.js";
import { createEventLogger } from "../services/events.js";
import { createLocalePrefsStore } from "../services/localePrefs.js";
import { createSoulthreadApi } from "../services/soulthread-api.js";
import { createSupportService } from "../support/index.js";
import type { BotContext, BotServices, SessionData } from "./context.js";
import { handleApp } from "./commands/app.js";
import { handleBindCommand, handleChatCommand, handleEndCommand } from "./commands/chat.js";
import { handleCharacters } from "./commands/characters.js";
import { handleHelp } from "./commands/help.js";
import { handleLanguageCommand } from "./commands/language.js";
import { handleAffCommand, handleDropCommand, handleStatsCommand } from "./commands/ops.js";
import { handleVipCommand } from "./commands/vip.js";
import { handleAffiliateCommand } from "./commands/affiliate.js";
import { handleInviteCommand } from "./commands/invite.js";
import { handleRewardsCommand } from "./commands/rewards.js";
import { handleStart } from "./commands/start.js";
import { handleSupportCommand } from "./commands/support.js";
import { handleCallbacks } from "./handlers/callbacks.js";
import { handleChatMessage } from "./handlers/chat.js";
import { handlePreCheckout, handleSuccessfulPayment } from "./handlers/payments.js";
import { localeMiddleware } from "./middleware/locale.js";
import { requestLogMiddleware } from "./middleware/logging.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import { transcriptIntentMiddleware } from "./middleware/transcriptIntent.js";

export type { BotContext } from "./context.js";

/** grammy 默认不读 HTTPS_PROXY，需显式注入 agent */
export function telegramClientOptions(config: AppConfig) {
  if (!config.telegramProxyUrl) return undefined;
  return {
    baseFetchConfig: {
      agent: new HttpsProxyAgent(config.telegramProxyUrl),
      compress: true,
    },
  };
}

export function createBotServices(config: AppConfig): BotServices {
  const api = createSoulthreadApi(config);
  const auth = createAuthStore(config, api);
  const chat = createChatService({ config, api, auth });
  const localePrefs = createLocalePrefsStore(config.eventsDir);
  return {
    events: createEventLogger(config),
    api,
    auth,
    chat,
    support: createSupportService(config),
    localePrefs,
  };
}

export function attachCommonMiddleware(
  bot: Bot<BotContext>,
  config: AppConfig,
  services: BotServices,
  botKind: "main" | "support" | "custom" = "main",
) {
  bot.use(async (ctx, next) => {
    ctx.config = config;
    ctx.services = services;
    ctx.botKind = botKind;
    await next();
  });

  bot.use(
    session({
      initial: (): SessionData => ({}),
    }),
  );

  bot.use(localeMiddleware());
  bot.use(transcriptIntentMiddleware);
  bot.use(requestLogMiddleware);
  bot.use(
    rateLimitMiddleware({
      max: config.rateLimitMax,
      windowMs: config.rateLimitWindowMs,
    }),
  );
}

export function createBot(
  config: AppConfig,
  services: BotServices = createBotServices(config),
): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.botToken, {
    client: telegramClientOptions(config),
  });

  attachCommonMiddleware(bot, config, services);

  bot.command("start", (ctx) => handleStart(ctx));
  bot.command("help", (ctx) => handleHelp(ctx));
  bot.command("app", (ctx) => handleApp(ctx));
  bot.command("characters", (ctx) => handleCharacters(ctx));
  bot.command("chat", (ctx) => handleChatCommand(ctx));
  bot.command("support", (ctx) => handleSupportCommand(ctx));
  bot.command("end", (ctx) => handleEndCommand(ctx));
  bot.command("language", (ctx) => handleLanguageCommand(ctx));
  bot.command("lang", (ctx) => handleLanguageCommand(ctx));
  bot.command("bind", (ctx) => handleBindCommand(ctx));
  bot.command("vip", (ctx) => handleVipCommand(ctx));
  bot.command("invite", (ctx) => handleInviteCommand(ctx));
  bot.command("rewards", (ctx) => handleRewardsCommand(ctx));
  bot.command("affiliate", (ctx) => handleAffiliateCommand(ctx));
  bot.command("drop", (ctx) => handleDropCommand(ctx));
  bot.command("aff", (ctx) => handleAffCommand(ctx));
  bot.command("stats", (ctx) => handleStatsCommand(ctx));

  bot.on("pre_checkout_query", (ctx) => handlePreCheckout(ctx));
  bot.on("message:successful_payment", (ctx) => handleSuccessfulPayment(ctx));
  bot.on("callback_query:data", (ctx) => handleCallbacks(ctx));
  bot.on("message:text", (ctx) => handleChatMessage(ctx));

  bot.catch((err) => {
    console.error("[bot] error", err.error);
  });

  return bot;
}

export async function setupBotCommands(bot: Bot<BotContext>): Promise<void> {
  // Default (fallback) + per-language command menus (ISO 639-1 only)
  await bot.api.setMyCommands(commandDescriptions("en"));
  for (const locale of LOCALE_CODES) {
    const languageCode = telegramLanguageCode(locale);
    if (!languageCode || languageCode === "en") continue;
    try {
      await bot.api.setMyCommands(commandDescriptions(locale), {
        language_code: languageCode as LanguageCode,
      });
    } catch (err) {
      console.warn(`[boot] setMyCommands(${languageCode}) failed`, err);
    }
  }
}
