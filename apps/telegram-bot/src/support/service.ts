import type { AppConfig } from "../config.js";
import type { LocaleCode } from "../i18n/index.js";
import { t } from "../i18n/index.js";
import { formatSupportAgentBlock, supportAgent } from "./agent.js";
import { chatCompletion, type LlmMessage, SupportLlmError } from "./llm.js";

export type SupportHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type SupportTurnResult =
  | { ok: true; reply: string; turn: number }
  | { ok: false; reason: "no_llm" | "empty" | "llm"; message: string };

type SupportSession = {
  chatMode?: "character" | "support";
  activeRoleId?: string;
  activeRoleName?: string;
  chatSessionId?: string;
  turnsInSession?: number;
  supportHistory?: SupportHistoryItem[];
};

function clip(text: string, max: number): string {
  const s = text.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function createSupportService(config: AppConfig) {
  function isLlmConfigured(): boolean {
    return Boolean(config.supportLlmApiKey);
  }

  /** 进入客服：清掉轻聊 API 会话，初始化本地历史（无每日轮次上限） */
  function beginSupport(session: SupportSession): { name: string } {
    session.chatMode = "support";
    session.activeRoleId = supportAgent.id;
    session.activeRoleName = supportAgent.name;
    session.chatSessionId = undefined;
    session.turnsInSession = 0;
    session.supportHistory = [];
    return { name: supportAgent.name };
  }

  function endSupport(session: SupportSession): void {
    if (session.chatMode === "support") {
      session.chatMode = undefined;
      session.activeRoleId = undefined;
      session.activeRoleName = undefined;
      session.chatSessionId = undefined;
      session.turnsInSession = 0;
      session.supportHistory = undefined;
    }
  }

  async function sendSupportMessage(
    session: SupportSession,
    text: string,
    locale: LocaleCode = "en",
  ): Promise<SupportTurnResult> {
    const content = text.trim();
    if (!content) {
      return { ok: false, reason: "empty", message: t(locale, "err.emptyMessage") };
    }
    if (!isLlmConfigured()) {
      return {
        ok: false,
        reason: "no_llm",
        message: t(locale, "support.notConfigured"),
      };
    }

    const system: LlmMessage = {
      role: "system",
      content: [
        formatSupportAgentBlock(supportAgent)
          .replaceAll("{{WEB_APP_URL}}", config.webAppUrl)
          .replaceAll("{{MARKETING_URL}}", config.marketingUrl)
          .replaceAll("{{BOT_USERNAME}}", config.botUsername ? `@${config.botUsername}` : "当前 Bot"),
        "",
        "## 输出",
        "- 直接给用户可读的纯文本回复，不要 JSON、不要提及「知识库」「system」。",
        `- 用户界面语言偏好：${locale}`,
      ].join("\n"),
    };

    const history = session.supportHistory ?? [];
    const messages: LlmMessage[] = [
      system,
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content },
    ];

    try {
      const reply = await chatCompletion(
        {
          apiKey: config.supportLlmApiKey,
          baseUrl: config.supportLlmBaseUrl,
          model: config.supportLlmModel,
          referer: config.marketingUrl,
        },
        messages,
      );

      const clipped = clip(reply, config.chatReplyMaxChars);
      const nextHistory: SupportHistoryItem[] = [
        ...history,
        { role: "user", content },
        { role: "assistant", content: clipped },
      ];
      session.supportHistory = nextHistory.slice(-20);
      session.turnsInSession = (session.turnsInSession ?? 0) + 1;

      return { ok: true, reply: clipped, turn: session.turnsInSession };
    } catch (err) {
      console.error("[support] llm failed", err);
      const detail =
        err instanceof SupportLlmError ? err.message : "network/LLM error";
      return {
        ok: false,
        reason: "llm",
        message: t(locale, "support.llmFailed", { detail }),
      };
    }
  }

  return {
    isLlmConfigured,
    beginSupport,
    endSupport,
    sendSupportMessage,
    agentName: supportAgent.name,
  };
}

export type SupportService = ReturnType<typeof createSupportService>;
