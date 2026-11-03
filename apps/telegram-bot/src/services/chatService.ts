import type { AppConfig } from "../config.js";
import type { LocaleCode } from "../i18n/index.js";
import { t } from "../i18n/index.js";
import type { AuthStore } from "./authStore.js";
import { ApiError, type SoulthreadApi } from "./soulthread-api.js";

export type ChatTurnResult =
  | {
      ok: true;
      reply: string;
      turnInSession: number;
      turnsToday: number;
      quotaLabel: string;
      nudgeMiniApp: boolean;
      /** 免费用户本会话超过 10 轮：弹一次软订阅提醒 */
      softUpsell: boolean;
      hardStop: boolean;
    }
  | {
      ok: false;
      reason: "no_auth" | "quota" | "api" | "empty" | "daily_cap";
      message: string;
    };

/** 与 App Free Chat 对齐：玩家轮次超过该值触发软提醒 */
export const FREE_CHAT_SOFT_UPSELL_AFTER = 10;

function dayKeyUTC(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function formatQuota(locale: LocaleCode, hint: number, unlimited: boolean): string {
  if (unlimited) return t(locale, "quota.unlimited");
  return t(locale, "quota.left", { count: Math.max(0, hint) });
}

function clip(text: string, max: number): string {
  const s = text.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

type ChatSession = {
  chatMode?: "character" | "support";
  activeRoleId?: string;
  activeRoleName?: string;
  chatSessionId?: string;
  jwt?: string;
  turnsInSession?: number;
  turnsToday?: number;
  turnsDayKey?: string;
  softUpsellShown?: boolean;
  pendingAffCode?: string;
  pendingSrc?: string;
  pendingChannelCode?: string;
  pendingStartPayload?: string;
  supportHistory?: unknown;
};

export function createChatService(opts: {
  config: AppConfig;
  api: SoulthreadApi;
  auth: AuthStore;
}) {
  const { config, api, auth } = opts;

  function invalidateAuth(session: ChatSession, telegramId: number): void {
    auth.clear(telegramId);
    session.jwt = undefined;
    session.chatSessionId = undefined;
  }

  function isAuthKick(err: unknown): boolean {
    return err instanceof ApiError && (err.status === 401 || err.status === 403);
  }

  function apiErrorCode(err: unknown): string {
    if (!(err instanceof ApiError) || !err.body || typeof err.body !== "object") {
      return "";
    }
    const rec = err.body as { error_code?: unknown };
    return typeof rec.error_code === "string" ? rec.error_code : "";
  }

  function isGeneratingBusy(err: unknown): boolean {
    return err instanceof ApiError && err.status === 429 && apiErrorCode(err) === "CHAT_003";
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mint (or reuse) JWT + chat session. On AUTH_008 / kicked JWT, clear cache and remint once.
   * Mini App login rotates login_session_id and invalidates the bot's cached token.
   */
  async function ensureSession(
    session: ChatSession,
    telegram: TelegramUser,
    opts?: { forceRefresh?: boolean },
  ): Promise<{ token: string; sessionId: string }> {
    if (!session.activeRoleId) {
      throw new Error("no active role");
    }

    const mint = async (force: boolean) => {
      if (force) invalidateAuth(session, telegram.id);
      const { token } = await auth.getTokenForTelegramUser({
        telegramId: telegram.id,
        username: telegram.username,
        firstName: telegram.first_name,
        lastName: telegram.last_name,
        languageCode: telegram.language_code,
        aff: session.pendingAffCode,
        channelCode: session.pendingChannelCode,
        startPayload: session.pendingStartPayload,
        entry: "bot",
      });
      session.jwt = token;
      if (!session.chatSessionId) {
        session.chatSessionId = await api.getOrCreateChatSession(
          token,
          session.activeRoleId!,
        );
        session.turnsInSession = 0;
      }
      return { token, sessionId: session.chatSessionId };
    };

    try {
      return await mint(Boolean(opts?.forceRefresh));
    } catch (err) {
      if (!opts?.forceRefresh && isAuthKick(err)) {
        console.warn("[chat] auth kicked, reminting JWT", err);
        return await mint(true);
      }
      throw err;
    }
  }

  function bumpDaily(session: ChatSession): number {
    const key = dayKeyUTC();
    if (session.turnsDayKey !== key) {
      session.turnsDayKey = key;
      session.turnsToday = 0;
    }
    session.turnsToday = (session.turnsToday ?? 0) + 1;
    return session.turnsToday;
  }

  async function beginChat(
    session: ChatSession,
    roleId: string,
    roleName: string,
    telegram: TelegramUser,
    locale: LocaleCode = "en",
    opts?: { mode?: "character" | "support" },
  ): Promise<{ quotaLabel: string }> {
    // 进入新会话前清掉旧 chatSession，避免串角色/客服上下文
    session.chatMode = opts?.mode ?? "character";
    session.activeRoleId = roleId;
    session.activeRoleName = roleName;
    session.chatSessionId = undefined;
    session.turnsInSession = 0;
    session.softUpsellShown = false;
    session.supportHistory = undefined;

    const { token } = await ensureSession(session, telegram);
    let quotaLabel = t(locale, "quota.unknown");
    try {
      const q = await api.getChatQuota(token);
      quotaLabel = formatQuota(locale, q.remainingHint, q.unlimited);
    } catch (err) {
      console.warn("[chat] quota fetch failed", err);
    }
    return { quotaLabel };
  }

  async function sendUserMessage(
    session: ChatSession,
    text: string,
    telegram: TelegramUser,
    locale: LocaleCode = "en",
  ): Promise<ChatTurnResult> {
    const content = text.trim();
    if (!content) {
      return { ok: false, reason: "empty", message: t(locale, "err.emptyMessage") };
    }
    if (!session.activeRoleId) {
      return {
        ok: false,
        reason: "empty",
        message: t(locale, "err.pickCharacter"),
      };
    }

    const key = dayKeyUTC();
    if (session.turnsDayKey !== key) {
      session.turnsDayKey = key;
      session.turnsToday = 0;
    }
    if ((session.turnsToday ?? 0) >= config.botMaxTurnsPerDay) {
      return {
        ok: false,
        reason: "daily_cap",
        message: t(locale, "err.dailyCap", { max: config.botMaxTurnsPerDay }),
      };
    }

    let token: string;
    let sessionId: string;
    try {
      ({ token, sessionId } = await ensureSession(session, telegram));
    } catch (err) {
      console.error("[chat] auth/session failed", err);
      return {
        ok: false,
        reason: "no_auth",
        message: t(locale, "err.noAuth"),
      };
    }

    let quotaLabel = t(locale, "quota.unknown");
    let quotaUnlimited = false;
    try {
      const q = await api.getChatQuota(token);
      quotaUnlimited = q.unlimited;
      quotaLabel = formatQuota(locale, q.remainingHint, q.unlimited);
      if (!q.unlimited && q.remainingHint <= 0) {
        return {
          ok: false,
          reason: "quota",
          message: t(locale, "err.quota"),
        };
      }
    } catch (err) {
      console.warn("[chat] quota check failed", err);
    }

    const sendOnce = async (tok: string, sid: string) =>
      api.sendChatText({
        token: tok,
        sessionId: sid,
        roleId: session.activeRoleId!,
        content,
      });

    const sendWithBusyRetry = async (tok: string, sid: string) => {
      let last: unknown;
      for (let i = 0; i < 4; i++) {
        try {
          return await sendOnce(tok, sid);
        } catch (err) {
          last = err;
          if (!isGeneratingBusy(err) || i === 3) throw err;
          await sleep(400 * (i + 1));
        }
      }
      throw last;
    };

    try {
      let reply: string;
      try {
        ({ reply } = await sendWithBusyRetry(token, sessionId));
      } catch (err) {
        if (!isAuthKick(err)) throw err;
        console.warn("[chat] send kicked, reminting JWT", err);
        ({ token, sessionId } = await ensureSession(session, telegram, {
          forceRefresh: true,
        }));
        ({ reply } = await sendWithBusyRetry(token, sessionId));
      }

      if (!reply) {
        return {
          ok: false,
          reason: "api",
          message: t(locale, "err.emptyReply"),
        };
      }

      session.turnsInSession = (session.turnsInSession ?? 0) + 1;
      const turnsToday = bumpDaily(session);
      const turnInSession = session.turnsInSession;
      const nudgeMiniApp = turnInSession >= config.chatNudgeAfterTurns;
      const hardStop = turnsToday >= config.botMaxTurnsPerDay;

      try {
        const q = await api.getChatQuota(token);
        quotaUnlimited = q.unlimited;
        quotaLabel = formatQuota(locale, q.remainingHint, q.unlimited);
      } catch {
        /* keep previous */
      }

      // 免费用户：本会话超过 10 轮弹一次软提醒（不阻断继续聊）
      let softUpsell = false;
      if (
        !quotaUnlimited &&
        turnInSession > FREE_CHAT_SOFT_UPSELL_AFTER &&
        !session.softUpsellShown
      ) {
        session.softUpsellShown = true;
        softUpsell = true;
      }

      return {
        ok: true,
        reply: clip(reply, config.chatReplyMaxChars),
        turnInSession,
        turnsToday,
        quotaLabel,
        nudgeMiniApp,
        softUpsell,
        hardStop,
      };
    } catch (err) {
      console.error("[chat] send failed", err);
      if (isAuthKick(err)) {
        invalidateAuth(session, telegram.id);
      }
      // 后端 CHAT_008：配额硬拦截，文案与预检一致
      if (err instanceof ApiError && apiErrorCode(err) === "CHAT_008") {
        return {
          ok: false,
          reason: "quota",
          message: t(locale, "err.quota"),
        };
      }
      if (isGeneratingBusy(err) || (err instanceof ApiError && err.status === 429)) {
        return {
          ok: false,
          reason: "api",
          message: t(locale, isGeneratingBusy(err) ? "err.generating" : "rateLimit"),
        };
      }
      const detail =
        err instanceof ApiError ? `API ${err.status}` : "network/API error";
      return {
        ok: false,
        reason: "api",
        message: t(locale, "err.api", { detail }),
      };
    }
  }

  function endChat(session: ChatSession): void {
    session.chatMode = undefined;
    session.activeRoleId = undefined;
    session.activeRoleName = undefined;
    session.chatSessionId = undefined;
    session.turnsInSession = 0;
    session.softUpsellShown = false;
    session.supportHistory = undefined;
  }

  return { beginChat, sendUserMessage, endChat };
}

export type ChatService = ReturnType<typeof createChatService>;
