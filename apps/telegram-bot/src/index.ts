import { loadConfig } from "./config.js";
import { createBot, createBotServices, setupBotCommands } from "./bot/createBot.js";
import { createSupportBot, setupSupportBotCommands } from "./bot/createSupportBot.js";
import { createCustomAgentBot, setupCustomAgentBotCommands } from "./bot/createCustomAgentBot.js";
import { startWebhookServer } from "./server/webhook.js";

async function main() {
  const config = loadConfig();
  const services = createBotServices(config);
  const bot = createBot(config, services);
  const supportBot = createSupportBot(config, services);
  const customAgentBot = createCustomAgentBot(config, services);

  if (config.telegramProxyUrl) {
    try {
      const u = new URL(config.telegramProxyUrl);
      console.log(`[boot] telegram proxy ${u.protocol}//${u.host}`);
    } catch {
      console.log("[boot] telegram proxy configured");
    }
  }

  await setupBotCommands(bot);

  if (!config.botUsername) {
    try {
      const me = await bot.api.getMe();
      if (me.username) {
        config.botUsername = me.username;
        console.log(`[boot] bot username @${me.username}`);
      }
    } catch (err) {
      console.warn("[boot] getMe failed (username for /drop links)", err);
    }
  }

  if (supportBot) {
    await setupSupportBotCommands(supportBot);
    try {
      const me = await supportBot.api.getMe();
      if (me.username) {
        config.supportBotUsername = me.username;
        console.log(`[boot] support bot @${me.username}`);
      }
    } catch (err) {
      console.warn("[boot] support getMe failed", err);
    }
  }

  if (customAgentBot) {
    await setupCustomAgentBotCommands(customAgentBot);
    try {
      const me = await customAgentBot.api.getMe();
      if (me.username) {
        config.customAgentBotUsername = me.username;
        console.log(`[boot] custom agent bot @${me.username}`);
      }
    } catch (err) {
      console.warn("[boot] custom agent getMe failed", err);
    }
  }

  console.log(
    `[boot] mode=${config.botMode} webApp=${config.webAppUrl} ttsPreview=${config.ttsPreviewEnabled} supportBot=${Boolean(supportBot)} customAgentBot=${Boolean(customAgentBot)}`,
  );

  if (config.botMode === "webhook") {
    await startWebhookServer(bot, config, supportBot, customAgentBot);
    return;
  }

  await bot.api.deleteWebhook({ drop_pending_updates: false });
  if (supportBot) {
    await supportBot.api.deleteWebhook({ drop_pending_updates: false });
  }
  if (customAgentBot) {
    await customAgentBot.api.deleteWebhook({ drop_pending_updates: false });
  }
  console.log("[boot] long polling…");
  const runners = [
    bot.start({
      onStart: (info) => {
        console.log(`[boot] @${info.username} ready (polling)`);
      },
    }),
  ];
  if (supportBot) {
    runners.push(
      supportBot.start({
        onStart: (info) => {
          console.log(`[boot] support @${info.username} ready (polling)`);
        },
      }),
    );
  }
  if (customAgentBot) {
    runners.push(
      customAgentBot.start({
        onStart: (info) => {
          console.log(`[boot] custom agent @${info.username} ready (polling)`);
        },
      }),
    );
  }
  await Promise.all(runners);
}

main().catch((err) => {
  console.error("[boot] fatal", err);
  process.exit(1);
});
