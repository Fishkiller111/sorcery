import { InputFile } from "grammy";
import { isOpsUser } from "../../config.js";
import { affiliateSharePack, buildChannelDrop } from "../../services/channelDrop.js";
import { formatFunnelForTelegram, summarizeFunnel } from "../../services/funnel.js";
import type { BotContext } from "../context.js";
import { openAppKeyboard } from "../keyboards.js";

function denyOps(ctx: BotContext): Promise<unknown> {
  return ctx.reply(
    "Ops only. Add your Telegram user id to OPS_TELEGRAM_IDS in the bot .env.",
  );
}

export async function handleDropCommand(ctx: BotContext): Promise<void> {
  if (!isOpsUser(ctx.config, ctx.from?.id)) {
    await denyOps(ctx);
    return;
  }

  const match = ctx.match;
  const raw =
    typeof match === "string" ? match.trim() : Array.isArray(match) ? String(match[0] ?? "").trim() : "";
  const parts = raw.split(/\s+/).filter(Boolean);
  const roleId = parts[0];
  const affCode = parts[1]?.replace(/^(aff|ref)[_-]/i, "");

  if (!roleId) {
    await ctx.reply(
      [
        "Usage: /drop <roleId> [affCode]",
        "Generates a channel Character Drop caption + copyable links.",
        "Example: /drop d9etf7qkgqq9c6um0rs0 partner01",
      ].join("\n"),
    );
    return;
  }

  const role = await ctx.services.api.getExploreRole(roleId);
  if (!role) {
    await ctx.reply(`Role not found: ${roleId}`);
    return;
  }

  let botUsername = ctx.config.botUsername;
  if (!botUsername) {
    const me = await ctx.api.getMe();
    botUsername = me.username ?? "";
  }

  // Prefer API-rendered Chinese channel template (same as Admin TG 频道)
  const apiPreview = await ctx.services.api.previewTgChannelAnnounce(roleId);
  let caption: string;
  let linksBlock: string;
  let avatarUrl: string | undefined;
  let miniAppUrl: string;
  let botDeepLink: string;

  if (apiPreview?.fullText) {
    caption = apiPreview.caption || apiPreview.fullText.slice(0, 1024);
    avatarUrl = apiPreview.imageUrl || role.avatarUrl;
    miniAppUrl = apiPreview.miniappUrl;
    botDeepLink = apiPreview.botDeepLink;
    if (affCode) {
      const start = `agent_${roleId}__aff_${affCode}`;
      botDeepLink = `https://t.me/${botUsername.replace(/^@/, "")}?start=${encodeURIComponent(start)}`;
      try {
        const u = new URL(miniAppUrl);
        u.searchParams.set("aff", affCode);
        miniAppUrl = u.toString();
      } catch {
        /* keep */
      }
    }
    linksBlock = [
      `Name: ${apiPreview.roleName}`,
      `Role ID: ${apiPreview.roleId}`,
      `Bot deep link: ${botDeepLink}`,
      `Mini App: ${miniAppUrl}`,
      affCode ? `Aff: ${affCode}` : "Aff: (none)",
      "",
      "— Full channel post —",
      apiPreview.fullText,
    ].join("\n");
  } else {
    const pack = buildChannelDrop({
      config: ctx.config,
      botUsername,
      role,
      affCode,
      sourceTag: "channel_drop",
    });
    caption = pack.caption;
    linksBlock = pack.linksBlock;
    avatarUrl = pack.avatarUrl;
    miniAppUrl = pack.miniAppUrl;
    botDeepLink = pack.botDeepLink;
  }

  await ctx.services.events.track({
    name: "tg_bot_drop_generated",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    telegramUsername: ctx.from?.username,
    chatId: ctx.chat?.id,
    meta: {
      roleId,
      affCode: affCode ?? null,
      template: apiPreview ? "api_tg_channel" : "legacy_en",
    },
  });

  const photoCaption = apiPreview?.fullText
    ? (apiPreview.needsFollowup ? caption : apiPreview.fullText).slice(0, 1024)
    : caption.slice(0, 1024);

  if (avatarUrl) {
    try {
      await ctx.replyWithPhoto(avatarUrl, { caption: photoCaption });
      if (apiPreview?.needsFollowup && apiPreview.fullText) {
        await ctx.reply(apiPreview.fullText.slice(0, 4096), {
          link_preview_options: { is_disabled: true },
        });
      }
    } catch {
      await ctx.reply(apiPreview?.fullText || caption, {
        link_preview_options: { is_disabled: true },
      });
    }
  } else {
    await ctx.reply(apiPreview?.fullText || caption, {
      link_preview_options: { is_disabled: true },
    });
  }

  await ctx.reply(`Copy block for ops:\n\n\`\`\`\n${linksBlock}\n\`\`\``, {
    parse_mode: "Markdown",
  });
}

export async function handleAffCommand(ctx: BotContext): Promise<void> {
  if (!isOpsUser(ctx.config, ctx.from?.id)) {
    await denyOps(ctx);
    return;
  }

  const match = ctx.match;
  const code =
    typeof match === "string"
      ? match.trim().replace(/^(aff|ref)[_-]/i, "")
      : "";

  if (!code) {
    await ctx.reply(
      [
        "Usage: /aff <affCode>",
        "Builds RevShare share links (Bot deep link + Web ?aff=).",
        "Aligns with docs/marketing/联盟 RevShare aff codes.",
      ].join("\n"),
    );
    return;
  }

  let botUsername = ctx.config.botUsername;
  if (!botUsername) {
    const me = await ctx.api.getMe();
    botUsername = me.username ?? "";
  }

  const pack = affiliateSharePack({
    config: ctx.config,
    botUsername,
    affCode: code,
  });

  await ctx.services.events.track({
    name: "tg_bot_aff_pack",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    meta: { affCode: code },
  });

  await ctx.reply(`Partner pack:\n\n\`\`\`\n${pack.copyBlock}\n\`\`\``, {
    parse_mode: "Markdown",
    link_preview_options: { is_disabled: true },
  });
}

export async function handleStatsCommand(ctx: BotContext): Promise<void> {
  if (!isOpsUser(ctx.config, ctx.from?.id)) {
    await denyOps(ctx);
    return;
  }

  const match = ctx.match;
  const dayArg =
    typeof match === "string" && match.trim()
      ? match.trim()
      : new Date().toISOString().slice(0, 10);

  const summary = await summarizeFunnel(ctx.config, dayArg);
  await ctx.services.events.track({
    name: "tg_bot_stats",
    at: new Date().toISOString(),
    telegramUserId: ctx.from?.id,
    meta: { day: dayArg },
  });

  await ctx.reply(formatFunnelForTelegram(summary), {
    reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
  });
}

export async function handleVoicePreview(
  ctx: BotContext,
  roleId: string,
): Promise<void> {
  if (!ctx.config.ttsPreviewEnabled || !ctx.config.ttsPreviewVoiceId) {
    await ctx.reply(ctx.t("voice.disabled"));
    return;
  }
  if (!ctx.from) return;

  await ctx.replyWithChatAction("record_voice").catch(() => undefined);

  try {
    const { token } = await ctx.services.auth.getTokenForTelegramUser({
      telegramId: ctx.from.id,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      languageCode: ctx.from.language_code,
      aff: ctx.session.pendingAffCode,
      channelCode: ctx.session.pendingChannelCode,
      startPayload: ctx.session.pendingStartPayload,
      entry: "bot",
    });
    const audio = await ctx.services.api.previewVoice({
      token,
      voiceId: ctx.config.ttsPreviewVoiceId,
      language: ctx.from.language_code?.slice(0, 2) || "en",
    });
    const buf = Buffer.from(audio.dataBase64, "base64");
    await ctx.replyWithVoice(new InputFile(buf, `preview.${audio.format || "mp3"}`), {
      caption: ctx.t("voice.caption"),
      reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    });
    await ctx.services.events.track({
      name: "tg_bot_voice_preview",
      at: new Date().toISOString(),
      telegramUserId: ctx.from.id,
      meta: { roleId, locale: ctx.locale },
    });
  } catch (err) {
    console.error("[voice] preview failed", err);
    await ctx.reply(ctx.t("voice.failed"), {
      reply_markup: openAppKeyboard(ctx.config, undefined, ctx.session, ctx.locale),
    });
  }
}
