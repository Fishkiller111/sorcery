import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config.js";
import type { SoulthreadApi } from "./soulthread-api.js";

export type CachedAuth = {
  token: string;
  expiresAt: number;
  /** Aff already sent on last mint — avoid reminting just for aff */
  lastAff?: string;
  /** Channel already sent on last mint — remint for first-touch backfill */
  lastChannel?: string;
};

type CacheFile = {
  byTelegramId: Record<string, CachedAuth>;
};

export function createAuthStore(config: AppConfig, api: SoulthreadApi) {
  const memory = new Map<number, CachedAuth>();
  const filePath = config.eventsDir
    ? path.join(config.eventsDir, "auth-cache.json")
    : "";

  async function loadDisk(): Promise<void> {
    if (!filePath) return;
    try {
      const raw = await readFile(filePath, "utf8");
      const data = JSON.parse(raw) as CacheFile;
      for (const [k, v] of Object.entries(data.byTelegramId ?? {})) {
        memory.set(Number(k), v);
      }
    } catch {
      /* first run */
    }
  }

  let loaded = loadDisk();

  async function persist(): Promise<void> {
    if (!filePath) return;
    await mkdir(path.dirname(filePath), { recursive: true });
    const byTelegramId: Record<string, CachedAuth> = {};
    for (const [k, v] of memory.entries()) {
      byTelegramId[String(k)] = v;
    }
    await writeFile(filePath, JSON.stringify({ byTelegramId }, null, 2), "utf8");
  }

  function stillValid(auth: CachedAuth | undefined): auth is CachedAuth {
    if (!auth?.token) return false;
    return auth.expiresAt * 1000 > Date.now() + 120_000;
  }

  async function getTokenForTelegramUser(input: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
    aff?: string;
    channelCode?: string;
    startPayload?: string;
    entry?: string;
  }): Promise<{ token: string; source: "cache" | "bot_api" | "dev_jwt" }> {
    await loaded;

    const aff = (input.aff ?? "").trim();
    const channelCode = (input.channelCode ?? "").trim();
    const cached = memory.get(input.telegramId);

    // Remint when new aff/channel arrives so API can first-touch bind returning users
    const needAffRefresh = Boolean(aff && cached && cached.lastAff !== aff);
    const needChannelRefresh = Boolean(
      channelCode && cached && cached.lastChannel !== channelCode,
    );

    if (stillValid(cached) && !needAffRefresh && !needChannelRefresh) {
      return { token: cached.token, source: "cache" };
    }

    if (config.botApiKey) {
      const auth = await api.authTelegramBot({
        ...input,
        aff,
        channelCode,
        startPayload: input.startPayload,
        entry: input.entry ?? "bot",
      });
      memory.set(input.telegramId, {
        token: auth.token,
        expiresAt: auth.expiresAt,
        lastAff: aff || cached?.lastAff,
        lastChannel: channelCode || cached?.lastChannel,
      });
      await persist().catch((err) => console.warn("[auth] persist failed", err));
      return { token: auth.token, source: "bot_api" };
    }

    if (config.devChatJwt) {
      return { token: config.devChatJwt, source: "dev_jwt" };
    }

    throw new Error(
      "Chat auth unavailable: set BOT_API_KEY (recommended) or DEV_CHAT_JWT for local smoke tests.",
    );
  }

  function clear(telegramId: number): void {
    memory.delete(telegramId);
  }

  return { getTokenForTelegramUser, clear };
}

export type AuthStore = ReturnType<typeof createAuthStore>;
