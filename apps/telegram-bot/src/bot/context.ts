import type { Context, SessionFlavor } from "grammy";
import type { LocaleCode, TranslateFn } from "../i18n/index.js";
import type { AppConfig } from "../config.js";
import type { AuthStore } from "../services/authStore.js";
import type { ChatService } from "../services/chatService.js";
import type { EventLogger } from "../services/events.js";
import type { LocalePrefsStore } from "../services/localePrefs.js";
import type { SoulthreadApi } from "../services/soulthread-api.js";
import type { SupportService } from "../support/index.js";
import type { SupportHistoryItem } from "../support/service.js";

export type BotServices = {
  events: EventLogger;
  api: SoulthreadApi;
  auth: AuthStore;
  chat: ChatService;
  support: SupportService;
  localePrefs: LocalePrefsStore;
};

/** 轻聊 vs 客服：同一时刻只允许一种 */
export type ChatMode = "character" | "support";

export type SessionData = {
  /** 当前会话模式；有 activeRoleId 时应与之对应 */
  chatMode?: ChatMode;
  activeRoleId?: string;
  activeRoleName?: string;
  chatSessionId?: string;
  jwt?: string;
  turnsInSession?: number;
  turnsToday?: number;
  turnsDayKey?: string;
  /** RevShare aff from deep link — passed on auth + Mini App URLs */
  pendingAffCode?: string;
  pendingSrc?: string;
  pendingChannelCode?: string;
  pendingStartPayload?: string;
  /** User-selected UI locale (overrides Telegram language_code) */
  locale?: LocaleCode;
  /** Last locale pushed to chat-scoped BotCommand menu */
  commandsLocale?: LocaleCode;
  /** Last bot that pushed chat-scoped commands (avoids leftover official menus on the support bot) */
  commandsKind?: "main" | "support" | "custom";
  /** Custom character / world wizard */
  customProductKind?: "character" | "world";
  customStep?: "name" | "appearance" | "personality" | "background" | "plot" | "notes" | "photos" | "confirm";
  customBrief?: {
    name?: string;
    appearance?: string;
    personality?: string;
    background?: string;
    plot?: string;
    notes?: string;
    references?: string[];
  };
  pendingReviseOrderId?: string;
  /** Custom Soul recharge: waiting for user to type USD amount */
  awaitingSoulUsd?: boolean;
  /** Custom Soul recharge plan id while picking / typing amount */
  soulPlanId?: string;
  /** Plan id waiting for Stripe vs crypto choice */
  pendingCheckoutPlanId?: string;
  /** Soul grant_points for pending checkout (custom recharge) */
  pendingCheckoutGrantPoints?: number;
  /** Display label for pending checkout (VIP name or Soul amount) */
  pendingCheckoutLabel?: string;
  softUpsellShown?: boolean;
  /** 客服本地多轮历史（不连 Soulthread chat session） */
  supportHistory?: SupportHistoryItem[];
};

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    config: AppConfig;
    services: BotServices;
    locale: LocaleCode;
    t: TranslateFn;
    /** main = 官方轻聊 bot；support = 独立客服 bot；custom = 角色卡定制 */
    botKind: "main" | "support" | "custom";
  };
