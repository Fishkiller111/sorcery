import { InlineKeyboard, Keyboard } from "grammy";
import type { AppConfig } from "../config.js";
import type { LocaleCode } from "../i18n/index.js";
import { LOCALE_CODES, LOCALE_LABELS, t } from "../i18n/index.js";
import type { ExploreRole } from "../services/soulthread-api.js";
import type { ParsedStartPayload } from "../services/startPayload.js";
import {
  exploreMiniAppUrl,
  homeMiniAppUrl,
  roleChatMiniAppUrl,
} from "../services/urls.js";

type AttrSession = { pendingAffCode?: string; pendingSrc?: string };

export function openAppKeyboard(
  config: AppConfig,
  payload?: ParsedStartPayload,
  session?: AttrSession,
  locale: LocaleCode = "en",
): InlineKeyboard {
  const url = homeMiniAppUrl(config, payload, "open_app", session);
  return new InlineKeyboard().webApp(t(locale, "kb.openApp"), url);
}

export function welcomeKeyboard(
  config: AppConfig,
  payload?: ParsedStartPayload,
  session?: AttrSession,
  locale: LocaleCode = "en",
): InlineKeyboard {
  const url = homeMiniAppUrl(config, payload, "start_welcome", session);
  const kb = new InlineKeyboard()
    .webApp(t(locale, "kb.openApp"), url)
    .row()
    .text(t(locale, "kb.pickCharacter"), "chars:list")
    .text(t(locale, "kb.language"), "lang:picker");
  if (config.tgChannelUrl || config.tgGroupUrl) {
    kb.row();
    if (config.tgChannelUrl) kb.url(t(locale, "kb.channel"), config.tgChannelUrl);
    if (config.tgGroupUrl) kb.url(t(locale, "kb.group"), config.tgGroupUrl);
  }
  if (config.customAgentBotUsername) {
    kb.row().url(t(locale, "kb.customCharacter"), `https://t.me/${config.customAgentBotUsername}`);
  }
  return kb;
}

export function languagePickerKeyboard(current?: LocaleCode): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const code of LOCALE_CODES) {
    const mark = current === code ? "✓ " : "";
    kb.text(`${mark}${LOCALE_LABELS[code]}`, `lang:${code}`).row();
  }
  return kb;
}

export function charactersKeyboard(
  config: AppConfig,
  roles: ExploreRole[],
  session?: AttrSession,
  locale: LocaleCode = "en",
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const role of roles) {
    kb.text(truncate(role.name, 28), `agent:${role.id}`).row();
  }
  kb.webApp(t(locale, "kb.browseAll"), exploreMiniAppUrl(config, session));
  return kb;
}

/** Per-character card under a portrait thumbnail. */
export function characterCardKeyboard(
  roleId: string,
  locale: LocaleCode = "en",
): InlineKeyboard {
  return new InlineKeyboard().text(t(locale, "kb.quickChat"), `chat:${roleId}`);
}

export function charactersBrowseKeyboard(
  config: AppConfig,
  session?: AttrSession,
  locale: LocaleCode = "en",
): InlineKeyboard {
  return new InlineKeyboard().webApp(
    t(locale, "kb.browseAll"),
    exploreMiniAppUrl(config, session),
  );
}

export function agentCardKeyboard(
  config: AppConfig,
  roleId: string,
  session?: AttrSession,
  locale: LocaleCode = "en",
): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(t(locale, "kb.quickChat"), `chat:${roleId}`)
    .row()
    .webApp(
      t(locale, "kb.fullChat"),
      roleChatMiniAppUrl(config, roleId, "agent_card", session),
    );
  if (config.ttsPreviewEnabled && config.ttsPreviewVoiceId) {
    kb.row().text(t(locale, "kb.voicePreview"), `voice:${roleId}`);
  }
  kb.row().text(t(locale, "kb.moreCharacters"), "chars:list");
  return kb;
}

export function chatActiveKeyboard(
  config: AppConfig,
  roleId: string,
  session?: AttrSession,
  locale: LocaleCode = "en",
): InlineKeyboard {
  return new InlineKeyboard()
    .webApp(
      t(locale, "kb.continueInApp"),
      roleChatMiniAppUrl(config, roleId, "chat_cta", session),
    )
    .row()
    .text(t(locale, "kb.endChat"), "chat:end")
    .text(t(locale, "kb.switchCharacter"), "chars:list");
}

export function chatNudgeKeyboard(
  config: AppConfig,
  roleId: string,
  session?: AttrSession,
  locale: LocaleCode = "en",
): InlineKeyboard {
  return new InlineKeyboard()
    .webApp(
      t(locale, "kb.openFull"),
      roleChatMiniAppUrl(config, roleId, "chat_nudge", session),
    )
    .row()
    .text(t(locale, "kb.keepChatting"), "chat:continue")
    .text(t(locale, "kb.end"), "chat:end");
}

/** 软订阅提醒：订阅会员 / 稍后再说（可继续轻聊） */
export function chatSoftUpsellKeyboard(locale: LocaleCode = "en"): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(locale, "kb.subscribe"), "vip:menu")
    .row()
    .text(t(locale, "kb.softUpsellLater"), "chat:continue");
}

/** 配额硬拦截：仅订阅会员 */
export function chatQuotaSubscribeKeyboard(locale: LocaleCode = "en"): InlineKeyboard {
  return new InlineKeyboard().text(t(locale, "kb.subscribe"), "vip:menu");
}

/** 客服会话键盘：结束 + 打开 App（付费等完整能力在 Web） */
export function supportActiveKeyboard(
  config: AppConfig,
  session?: AttrSession,
  locale: LocaleCode = "en",
): InlineKeyboard {
  return new InlineKeyboard()
    .webApp(t(locale, "kb.openApp"), homeMiniAppUrl(config, undefined, "support_cta", session))
    .row()
    .text(t(locale, "kb.endSupport"), "chat:end");
}

export function openSupportBotKeyboard(username: string, locale: LocaleCode = "en"): InlineKeyboard {
  const handle = username.replace(/^@/, "");
  return new InlineKeyboard().url(
    t(locale, "kb.openSupportBot"),
    `https://t.me/${handle}`,
  );
}

/** 独立客服 bot 底部菜单：充值 / Soul / 反馈 */
export function supportMenuKeyboard(locale: LocaleCode = "en"): Keyboard {
  return new Keyboard()
    .text(t(locale, "support.menuRecharge"))
    .row()
    .text(t(locale, "support.menuSoul"))
    .row()
    .text(t(locale, "support.menuFeedback"))
    .resized()
    .persistent();
}

function truncate(s: string, max: number): string {
  const t0 = s.trim();
  if (t0.length <= max) return t0;
  return `${t0.slice(0, max - 1)}…`;
}
