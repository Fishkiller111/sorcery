import type { BotContext } from "../context.js";
import { welcomeKeyboard, agentCardKeyboard } from "../keyboards.js";
import { parseStartPayload } from "../../services/startPayload.js";
import { sendWelcomeBanner } from "../welcomeBanner.js";
import { syncChatCommands } from "./syncChatCommands.js";

function buildWelcomeCaption(ctx: BotContext): string {
  return [
    ctx.t("welcome.title"),
    "",
    ctx.t("welcome.body"),
    "",
    ctx.t("welcome.howHeader"),
    ctx.t("welcome.how1"),
    ctx.t("welcome.how2"),
    ctx.t("welcome.how3"),
    ctx.t("welcome.how4"),
    "",
    ctx.t("welcome.web", { url: ctx.config.marketingUrl }),
    ...(ctx.config.tgChannelUrl ? [ctx.t("welcome.channel", { url: ctx.config.tgChannelUrl })] : []),
    ...(ctx.config.tgGroupUrl ? [ctx.t("welcome.group", { url: ctx.config.tgGroupUrl })] : []),
    ...(ctx.config.customAgentBotUsername
      ? [ctx.t("welcome.custom", { url: `https://t.me/${ctx.config.customAgentBotUsername}` })]
      : []),
  ].join("\n");
}

function clipIntro(intro: string | undefined, fallback: string, max = 280): string {
  if (!intro) return fallback;
  const s = intro.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function applyAttribution(ctx: BotContext, payload: ReturnType<typeof parseStartPayload>) {
  if (payload.raw) {
    ctx.session.pendingStartPayload = payload.raw;
  }
  if (payload.affCode) {
    ctx.session.pendingAffCode = payload.affCode;
  }
  const channel = payload.channelCode || payload.source;
  if (channel) {
    ctx.session.pendingChannelCode = channel;
    ctx.session.pendingSrc = channel;
  }
}

export async function handleStart(ctx: BotContext): Promise<void> {
  const match = ctx.match;
  const rawPayload = typeof match === "string" ? match : Array.isArray(match) ? match[0] : undefined;
  const payload = parseStartPayload(rawPayload);
  const userId = ctx.from?.id;

  applyAttribution(ctx, payload);
  await syncChatCommands(ctx, ctx.locale);

  await ctx.services.events.track({
    name: "tg_bot_start",
    at: new Date().toISOString(),
    telegramUserId: userId,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    payload,
    meta: {
      language_code: ctx.from?.language_code,
      locale: ctx.locale,
      is_premium: ctx.from?.is_premium ?? false,
    },
  });

  if (payload.kind === "agent" && payload.agentId) {
    await sendAgentCard(ctx, payload.agentId);
    return;
  }

  let extra = "";
  if (payload.kind === "aff" && payload.affCode) {
    extra = `\n\n${ctx.t("welcome.aff", { affCode: payload.affCode })}`;
  } else if (payload.kind === "src" && payload.source) {
    extra = `\n\n${ctx.t("welcome.source", { source: payload.source })}`;
  } else if (payload.kind === "unknown" && payload.raw) {
    extra = `\n\n${ctx.t("welcome.openedWith", { raw: payload.raw })}`;
  }

  if ((payload.affCode || payload.channelCode || payload.source) && ctx.from && ctx.config.botApiKey) {
    try {
      await ctx.services.auth.getTokenForTelegramUser({
        telegramId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        languageCode: ctx.from.language_code,
        aff: payload.affCode,
        channelCode: payload.channelCode || payload.source,
        startPayload: payload.raw,
        entry: "bot",
      });
    } catch (err) {
      console.warn("[start] early attribution auth failed", err);
    }
  }

  const roles = await ctx.services.api.getRecommendedRoles(3);
  let picks = "";
  if (roles.length > 0) {
    picks =
      `\n\n${ctx.t("welcome.picksHeader")}\n` +
      roles.map((r, i) => `${i + 1}. ${r.name}`).join("\n") +
      `\n\n${ctx.t("welcome.picksFooter")}`;
  }

  const caption = buildWelcomeCaption(ctx) + extra;
  const kb = welcomeKeyboard(ctx.config, payload, ctx.session, ctx.locale);

  // Banner video + short “how it works” caption (Lucid Dreams–style open)
  const sent = await sendWelcomeBanner(ctx, caption, kb);
  if (!sent) {
    await ctx.reply(caption + picks, {
      reply_markup: kb,
      link_preview_options: { is_disabled: true },
    });
    return;
  }

  if (picks) {
    await ctx.reply(picks.trim(), {
      link_preview_options: { is_disabled: true },
    });
  }
}

export async function sendAgentCard(ctx: BotContext, roleId: string): Promise<void> {
  await ctx.services.events.track({
    name: "tg_bot_agent_card",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    payload: {
      raw: `agent_${roleId}`,
      kind: "agent",
      agentId: roleId,
      affCode: ctx.session.pendingAffCode,
      refCode: ctx.session.pendingAffCode,
    },
    meta: { roleId, locale: ctx.locale },
  });

  let role = null as Awaited<ReturnType<typeof ctx.services.api.getExploreRole>>;
  try {
    let token: string | undefined;
    if (ctx.from) {
      try {
        ({ token } = await ctx.services.auth.getTokenForTelegramUser({
          telegramId: ctx.from.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          languageCode: ctx.from.language_code,
          aff: ctx.session.pendingAffCode,
          channelCode: ctx.session.pendingChannelCode,
          startPayload: ctx.session.pendingStartPayload,
          entry: "bot",
        }));
      } catch (err) {
        console.warn("[start] auth for getExploreRole failed", err);
      }
    }
    role = await ctx.services.api.getExploreRole(roleId, token);
  } catch (err) {
    console.warn("[start] getExploreRole failed", err);
  }

  const name = role?.name ?? ctx.t("agent.fallbackName");
  const intro = clipIntro(role?.introduction, ctx.t("agent.introFallback"));
  const text = [
    ctx.t("agent.meet", { name }),
    "",
    intro,
    "",
    ctx.t("agent.cta"),
  ].join("\n");

  const opts = {
    reply_markup: agentCardKeyboard(ctx.config, roleId, ctx.session, ctx.locale),
    link_preview_options: { is_disabled: true as const },
  };

  if (role?.avatarUrl) {
    try {
      await ctx.replyWithPhoto(role.avatarUrl, { caption: text, ...opts });
      return;
    } catch (err) {
      console.warn("[start] replyWithPhoto failed, falling back to text", err);
    }
  }

  await ctx.reply(text, opts);
}
