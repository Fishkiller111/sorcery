import express from "express";
import { webhookCallback } from "grammy";
import type { Bot } from "grammy";
import type { AppConfig } from "../config.js";
import type { BotContext } from "../bot/context.js";
import { listEventDays, summarizeFunnel } from "../services/funnel.js";

function authorizeOpsHttp(req: express.Request, config: AppConfig): boolean {
  const key = String(req.headers["x-soulthread-bot-key"] ?? "");
  // 运营密钥只允许从请求头传入，避免 URL 被代理或访问日志记录。
  return Boolean(config.botApiKey && key && key === config.botApiKey);
}

function readFunnelDay(req: express.Request): string | null {
  const day = String(req.query.day ?? new Date().toISOString().slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : null;
}

export async function startWebhookServer(
  bot: Bot<BotContext>,
  config: AppConfig,
  supportBot?: Bot<BotContext> | null,
  customAgentBot?: Bot<BotContext> | null,
): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true, service: "soulthread-bot" });
  });

  app.get("/ops/funnel", async (req, res) => {
    if (!authorizeOpsHttp(req, config)) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    const day = readFunnelDay(req);
    if (!day) {
      res.status(400).json({ ok: false, error: "invalid_day" });
      return;
    }
    try {
      const summary = await summarizeFunnel(config, day);
      const days = await listEventDays(config);
      res.json({ ok: true, summary, days });
    } catch (err) {
      console.error("[ops/funnel]", err);
      res.status(500).json({ ok: false, error: "failed" });
    }
  });

  const path = `/telegram/webhook/${config.webhookSecret}`;
  app.post(path, webhookCallback(bot, "express", { secretToken: config.webhookSecret }));

  let supportPath = "";
  if (supportBot && config.supportWebhookSecret) {
    supportPath = `/telegram/webhook/support/${config.supportWebhookSecret}`;
    app.post(supportPath, webhookCallback(supportBot, "express", { secretToken: config.supportWebhookSecret }));
  }

  let customPath = "";
  if (customAgentBot && config.customAgentWebhookSecret) {
    customPath = `/telegram/webhook/custom/${config.customAgentWebhookSecret}`;
    app.post(customPath, webhookCallback(customAgentBot, "express", { secretToken: config.customAgentWebhookSecret }));
  }

  app.use((_req, res) => {
    res.status(404).json({ ok: false });
  });

  await new Promise<void>((resolve) => {
    app.listen(config.port, () => {
      console.log(`[server] listening on :${config.port}`);
      resolve();
    });
  });

  const webhookUrl = `${config.webhookDomain}${path}`;
  await bot.api.setWebhook(webhookUrl, {
    secret_token: config.webhookSecret,
    drop_pending_updates: false,
    allowed_updates: ["message", "callback_query"],
  });
  console.log("[server] main webhook set");

  if (supportBot && supportPath) {
    const supportWebhookUrl = `${config.webhookDomain}${supportPath}`;
    await supportBot.api.setWebhook(supportWebhookUrl, {
      secret_token: config.supportWebhookSecret,
      drop_pending_updates: false,
      allowed_updates: ["message", "callback_query"],
    });
    console.log("[server] support webhook set");
  }

  if (customAgentBot && customPath) {
    const customWebhookUrl = `${config.webhookDomain}${customPath}`;
    await customAgentBot.api.setWebhook(customWebhookUrl, {
      secret_token: config.customAgentWebhookSecret,
      drop_pending_updates: false,
      allowed_updates: ["message", "callback_query"],
    });
    console.log("[server] custom agent webhook set");
  }

  console.log(`[server] ops funnel → GET /ops/funnel?day=YYYY-MM-DD`);
}

/** Local polling mode still exposes funnel HTTP on PORT when ENABLE_OPS_HTTP=1 — optional helper */
export async function startOpsHttpOnly(config: AppConfig): Promise<void> {
  const app = express();
  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  app.get("/ops/funnel", async (req, res) => {
    if (!authorizeOpsHttp(req, config)) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    const day = readFunnelDay(req);
    if (!day) {
      res.status(400).json({ ok: false, error: "invalid_day" });
      return;
    }
    const summary = await summarizeFunnel(config, day);
    res.json({ ok: true, summary, days: await listEventDays(config) });
  });
  await new Promise<void>((resolve) => {
    app.listen(config.port, () => {
      console.log(`[ops-http] :${config.port}/ops/funnel`);
      resolve();
    });
  });
}
