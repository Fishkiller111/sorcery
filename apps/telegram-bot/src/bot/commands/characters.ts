import type { BotContext } from "../context.js";
import {
  characterCardKeyboard,
  charactersBrowseKeyboard,
  charactersKeyboard,
  openAppKeyboard,
} from "../keyboards.js";

function clipIntro(intro: string | undefined, max = 120): string {
  const s = (intro ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export async function handleCharacters(ctx: BotContext): Promise<void> {
  await ctx.services.events.track({
    name: "tg_bot_characters",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    meta: { locale: ctx.locale },
  });

  const roles = await ctx.services.api.getRecommendedRoles(5);
  if (roles.length === 0) {
    await ctx.reply(ctx.t("characters.empty"), {
      reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    });
    return;
  }

  const withAvatar = roles.filter((r) => Boolean(r.avatarUrl));
  // Telegram inline buttons cannot show images — send portrait cards when possible.
  if (withAvatar.length > 0) {
    await ctx.reply(ctx.t("characters.header"), {
      link_preview_options: { is_disabled: true },
    });

    for (const role of roles) {
      const intro = clipIntro(role.introduction);
      const caption = intro ? `${role.name}\n${intro}` : role.name;
      const markup = characterCardKeyboard(role.id, ctx.locale);

      if (role.avatarUrl) {
        try {
          await ctx.replyWithPhoto(role.avatarUrl, {
            caption: caption.slice(0, 1024),
            reply_markup: markup,
          });
          continue;
        } catch (err) {
          console.warn("[characters] replyWithPhoto failed", role.id, err);
        }
      }

      await ctx.reply(caption, {
        reply_markup: markup,
        link_preview_options: { is_disabled: true },
      });
    }

    await ctx.reply(ctx.t("characters.footer"), {
      reply_markup: charactersBrowseKeyboard(ctx.config, ctx.session, ctx.locale),
      link_preview_options: { is_disabled: true },
    });
    return;
  }

  // Fallback: text list + name buttons when no avatars are available.
  const lines = roles.map((r, i) => {
    const intro = clipIntro(r.introduction, 60);
    const snippet = intro ? ` — ${intro}` : "";
    return `${i + 1}. ${r.name}${snippet}`;
  });

  await ctx.reply(
    [ctx.t("characters.header"), "", ...lines, "", ctx.t("characters.footer")].join("\n"),
    {
      reply_markup: charactersKeyboard(ctx.config, roles, ctx.session, ctx.locale),
      link_preview_options: { is_disabled: true },
    },
  );
}
