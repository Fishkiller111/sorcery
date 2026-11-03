import { config as loadDotenv } from "dotenv";
import { createHash } from "node:crypto";
import { z } from "zod";

loadDotenv();

// Public-facing links and API origins must not accept javascript:, file:, or embedded credentials.
const HttpUrl = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}, "must be an HTTP(S) URL without embedded credentials");
// Paths are appended to these base URLs, so query strings/fragments would corrupt them.
const BaseHttpUrl = HttpUrl.refine((value) => {
  try {
    const url = new URL(value);
    return !url.search && !url.hash;
  } catch {
    return false;
  }
}, "base URL must not include a query or fragment");

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
  WEBHOOK_DOMAIN: z.string().optional().default(""),
  WEBHOOK_SECRET: z.union([z.literal(""), z.string().regex(/^[A-Za-z0-9_-]{1,256}$/, "must contain 1–256 letters, digits, underscores or hyphens")]).default(""),
  PORT: z.coerce.number().int().positive().default(8080),
  WEB_APP_URL: BaseHttpUrl,
  MARKETING_URL: BaseHttpUrl,
  TG_CHANNEL_URL: z.union([HttpUrl, z.literal("")]).default(""),
  TG_GROUP_URL: z.union([HttpUrl, z.literal("")]).default(""),
  API_BASE_URL: BaseHttpUrl,
  STATIC_BASE_URL: z.string().optional().default(""),
  FEATURED_ROLE_IDS: z.string().optional().default(""),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  EVENTS_DIR: z.string().optional().default(".events"),
  UTM_CAMPAIGN: z.string().default("bot_mvp"),
  BOT_API_KEY: z.string().optional().default(""),
  DEV_CHAT_JWT: z.string().optional().default(""),
  CHAT_NUDGE_AFTER_TURNS: z.coerce.number().int().positive().default(3),
  BOT_MAX_TURNS_PER_DAY: z.coerce.number().int().positive().default(12),
  CHAT_REPLY_MAX_CHARS: z.coerce.number().int().positive().default(3500),
  /** Comma-separated Telegram user IDs allowed to use /drop /stats /aff */
  OPS_TELEGRAM_IDS: z.string().optional().default(""),
  /** Public bot username without @ (for deep links in /drop). Auto-filled at boot if empty. */
  BOT_USERNAME: z.string().optional().default(""),
  /** Optional voice preview hook on agent cards (default off) */
  TTS_PREVIEW_ENABLED: z
    .string()
    .optional()
    .default("false")
    .transform((v) => ["1", "true", "yes", "on"].includes(v.toLowerCase())),
  /** Catalog voice_id for TTS preview when role has no voice */
  TTS_PREVIEW_VOICE_ID: z.string().optional().default(""),
  /** Ammer Pay LIVE provider_token for Telegram Payments (sendInvoice) */
  PAYMENT_PROVIDER_TOKEN: z.string().optional().default(""),
  /** 独立客服 BotFather token；空则不启动第二只 bot */
  SUPPORT_BOT_TOKEN: z.string().optional().default(""),
  /** Optional override; otherwise filled from getMe() at boot */
  SUPPORT_BOT_USERNAME: z.string().optional().default(""),
  CUSTOM_AGENT_BOT_TOKEN: z.string().optional().default(""),
  CUSTOM_AGENT_BOT_USERNAME: z.string().optional().default(""),
  /**
   * 访问 api.telegram.org 的 HTTP/HTTPS 代理（国内本地开发常用）。
   * 未设置时回退 HTTPS_PROXY / HTTP_PROXY / https_proxy / http_proxy。
   */
  TELEGRAM_PROXY_URL: z.string().optional().default(""),
  /** 客服 LLM（OpenAI 兼容）；空则回退 OPENROUTER_API_KEY */
  SUPPORT_LLM_API_KEY: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  SUPPORT_LLM_BASE_URL: z.string().optional().default("https://openrouter.ai/api/v1"),
  /** 与后端正式配置对齐 */
  SUPPORT_LLM_MODEL: z.string().optional().default("deepseek/deepseek-v4-flash"),
});

export type AppConfig = {
  botToken: string;
  botMode: "polling" | "webhook";
  webhookDomain: string;
  webhookSecret: string;
  port: number;
  webAppUrl: string;
  marketingUrl: string;
  tgChannelUrl: string;
  tgGroupUrl: string;
  apiBaseUrl: string;
  staticBaseUrl: string;
  featuredRoleIds: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  eventsDir: string;
  utmCampaign: string;
  botApiKey: string;
  devChatJwt: string;
  chatNudgeAfterTurns: number;
  botMaxTurnsPerDay: number;
  chatReplyMaxChars: number;
  opsTelegramIds: Set<number>;
  botUsername: string;
  ttsPreviewEnabled: boolean;
  ttsPreviewVoiceId: string;
  paymentProviderToken: string;
  /** 独立客服 bot token；空表示未配置 */
  supportBotToken: string;
  /** 不含 @；启动时 getMe 可回填 */
  supportBotUsername: string;
  /** 客服 webhook 路径用的 secret（由 token 派生） */
  supportWebhookSecret: string;
  customAgentBotToken: string;
  customAgentBotUsername: string;
  customAgentWebhookSecret: string;
  /** 空字符串表示直连 */
  telegramProxyUrl: string;
  /** 客服 LLM；空表示未配置 */
  supportLlmApiKey: string;
  supportLlmBaseUrl: string;
  supportLlmModel: string;
};

/** 解析 Telegram API 代理：TELEGRAM_PROXY_URL 优先，其次标准代理环境变量 */
export function resolveTelegramProxyUrl(env: NodeJS.ProcessEnv = process.env): string {
  const candidates = [
    env.TELEGRAM_PROXY_URL,
    env.HTTPS_PROXY,
    env.https_proxy,
    env.HTTP_PROXY,
    env.http_proxy,
  ];
  for (const c of candidates) {
    const v = (c ?? "").trim();
    if (v) return v;
  }
  return "";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function deriveStaticBase(apiBaseUrl: string, explicit?: string): string {
  if (explicit && explicit.trim()) {
    return stripTrailingSlash(explicit.trim());
  }
  const u = new URL(apiBaseUrl);
  return `${u.protocol}//${u.host}`;
}

function defaultWebhookSecret(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

function parseOpsIds(raw: string): Set<number> {
  const set = new Set<number>();
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && n > 0) set.add(n);
  }
  return set;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid env: ${msg}`);
  }
  const e = parsed.data;
  if (e.BOT_MODE === "webhook") {
    if (!e.WEBHOOK_DOMAIN) {
      throw new Error("WEBHOOK_DOMAIN is required when BOT_MODE=webhook");
    }
    try {
      const url = new URL(e.WEBHOOK_DOMAIN);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
        throw new Error("invalid webhook URL");
      }
    } catch {
      throw new Error("WEBHOOK_DOMAIN must be an HTTPS URL without credentials, query or fragment");
    }
  }

  return {
    botToken: e.BOT_TOKEN,
    botMode: e.BOT_MODE,
    webhookDomain: stripTrailingSlash(e.WEBHOOK_DOMAIN ?? ""),
    webhookSecret: e.WEBHOOK_SECRET || defaultWebhookSecret(e.BOT_TOKEN),
    port: e.PORT,
    webAppUrl: stripTrailingSlash(e.WEB_APP_URL),
    marketingUrl: stripTrailingSlash(e.MARKETING_URL),
    tgChannelUrl: stripTrailingSlash(e.TG_CHANNEL_URL),
    tgGroupUrl: stripTrailingSlash(e.TG_GROUP_URL),
    apiBaseUrl: stripTrailingSlash(e.API_BASE_URL),
    staticBaseUrl: deriveStaticBase(e.API_BASE_URL, e.STATIC_BASE_URL),
    featuredRoleIds: (e.FEATURED_ROLE_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    rateLimitMax: e.RATE_LIMIT_MAX,
    rateLimitWindowMs: e.RATE_LIMIT_WINDOW_MS,
    eventsDir: e.EVENTS_DIR ?? "",
    utmCampaign: e.UTM_CAMPAIGN,
    botApiKey: e.BOT_API_KEY ?? "",
    devChatJwt: e.DEV_CHAT_JWT ?? "",
    chatNudgeAfterTurns: e.CHAT_NUDGE_AFTER_TURNS,
    botMaxTurnsPerDay: e.BOT_MAX_TURNS_PER_DAY,
    chatReplyMaxChars: e.CHAT_REPLY_MAX_CHARS,
    opsTelegramIds: parseOpsIds(e.OPS_TELEGRAM_IDS ?? ""),
    botUsername: (e.BOT_USERNAME ?? "").replace(/^@/, ""),
    ttsPreviewEnabled: Boolean(e.TTS_PREVIEW_ENABLED),
    ttsPreviewVoiceId: e.TTS_PREVIEW_VOICE_ID ?? "",
    paymentProviderToken: (e.PAYMENT_PROVIDER_TOKEN ?? "").trim(),
    supportBotToken: (e.SUPPORT_BOT_TOKEN ?? "").trim(),
    supportBotUsername: (e.SUPPORT_BOT_USERNAME ?? "").replace(/^@/, ""),
    supportWebhookSecret: (e.SUPPORT_BOT_TOKEN ?? "").trim()
      ? defaultWebhookSecret((e.SUPPORT_BOT_TOKEN ?? "").trim())
      : "",
    customAgentBotToken: (e.CUSTOM_AGENT_BOT_TOKEN ?? "").trim(),
    customAgentBotUsername: (e.CUSTOM_AGENT_BOT_USERNAME ?? "").replace(/^@/, ""),
    customAgentWebhookSecret: (e.CUSTOM_AGENT_BOT_TOKEN ?? "").trim()
      ? defaultWebhookSecret((e.CUSTOM_AGENT_BOT_TOKEN ?? "").trim())
      : "",
    telegramProxyUrl: (e.TELEGRAM_PROXY_URL ?? "").trim() || resolveTelegramProxyUrl(env),
    // 优先 SUPPORT_LLM_API_KEY；未设则用与后端相同的 OPENROUTER_API_KEY
    supportLlmApiKey:
      (e.SUPPORT_LLM_API_KEY ?? "").trim() || (e.OPENROUTER_API_KEY ?? "").trim(),
    supportLlmBaseUrl: stripTrailingSlash(
      (e.SUPPORT_LLM_BASE_URL ?? "https://openrouter.ai/api/v1").trim() ||
        "https://openrouter.ai/api/v1",
    ),
    supportLlmModel:
      (e.SUPPORT_LLM_MODEL ?? "").trim() || "deepseek/deepseek-v4-flash",
  };
}

export function isOpsUser(config: AppConfig, telegramUserId?: number): boolean {
  if (!telegramUserId) return false;
  // Empty allow-list ⇒ no ops commands (safer for public bots)
  if (config.opsTelegramIds.size === 0) return false;
  return config.opsTelegramIds.has(telegramUserId);
}
