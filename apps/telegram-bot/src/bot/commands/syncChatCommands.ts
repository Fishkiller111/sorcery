import type { BotContext } from "../context.js";
import { commandDescriptions, supportBotCommandDescriptions, type LocaleCode } from "../../i18n/index.js";
import { customCommandDescriptions, resolveCustomLocale } from "../../custom-agent/i18n.js";

/**
 * Telegram's global command menus follow the *app UI language*, not
 * User.language_code / our bot locale. Chat-scoped commands override that
 * for this private chat so /language actually changes the slash menu.
 */
export async function syncChatCommands(
  ctx: BotContext,
  locale: LocaleCode = ctx.locale,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const commands =
    ctx.botKind === "support"
      ? supportBotCommandDescriptions(locale)
      : ctx.botKind === "custom"
        ? customCommandDescriptions(resolveCustomLocale(locale))
        : commandDescriptions(locale);
  try {
    if (ctx.botKind === "support" || ctx.botKind === "custom") {
      await ctx.api.deleteMyCommands({
        scope: { type: "chat", chat_id: chatId },
      });
    }
    await ctx.api.setMyCommands(commands, {
      scope: { type: "chat", chat_id: chatId },
    });
    ctx.session.commandsLocale = locale;
    ctx.session.commandsKind = ctx.botKind ?? "main";
  } catch (err) {
    console.warn("[commands] setMyCommands(chat) failed", err);
  }
}
