import type { AppConfig } from "../config.js";
import type { ExploreRole } from "./soulthread-api.js";
import type { ParsedStartPayload } from "./startPayload.js";
import { buildWebAppUrl, roleChatMiniAppDirectUrl, roleChatMiniAppUrl } from "./urls.js";

export type ChannelDropPack = {
  roleId: string;
  roleName: string;
  /** Ready-to-post channel caption (EN) */
  caption: string;
  /** Plain links block for ops to copy */
  linksBlock: string;
  botDeepLink: string;
  miniAppUrl: string;
  avatarUrl?: string;
};

export function buildChannelDrop(opts: {
  config: AppConfig;
  botUsername: string;
  role: ExploreRole;
  affCode?: string;
  sourceTag?: string;
}): ChannelDropPack {
  const { config, botUsername, role, affCode, sourceTag } = opts;
  const startPayload = affCode
    ? `agent_${role.id}__aff_${affCode}`
    : `agent_${role.id}`;
  const botDeepLink = `https://t.me/${botUsername.replace(/^@/, "")}?start=${encodeURIComponent(startPayload)}`;

  const extra: Record<string, string | undefined> = {};
  if (affCode) extra.aff = affCode;
  if (sourceTag) extra.tg_src = sourceTag;

  const miniAppUrl = botUsername
    ? roleChatMiniAppDirectUrl(botUsername, role.id, affCode)
    : buildWebAppUrl(
        config,
        `/free-chat/${encodeURIComponent(role.id)}`,
        {
          medium: "channel",
          campaign: affCode ? `aff_${affCode}` : "char_drop",
          content: "channel_drop",
        },
        extra,
      );

  const intro = (role.introduction ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  const caption = [
    `✨ Character Drop · ${role.name}`,
    "",
    intro || "An AI companion with layered memory on Soulthread.",
    "",
    "Quick chat in Telegram → full Free Chat (memory · voice · community) in the Mini App.",
    "They remember you.",
    "",
    `Bot: ${botDeepLink}`,
    `App: ${miniAppUrl}`,
  ].join("\n");

  const linksBlock = [
    `Name: ${role.name}`,
    `Role ID: ${role.id}`,
    `Bot deep link: ${botDeepLink}`,
    `Mini App: ${miniAppUrl}`,
    `Start payload: ${startPayload}`,
    affCode ? `Aff: ${affCode}` : "Aff: (none)",
    "",
    "— Hashtags —",
    "#Soulthread #AICompanion #CharacterAI #AIGirlfriend #FreeChat",
  ].join("\n");

  return {
    roleId: role.id,
    roleName: role.name,
    caption,
    linksBlock,
    botDeepLink,
    miniAppUrl,
    avatarUrl: role.avatarUrl,
  };
}

export function affiliateSharePack(opts: {
  config: AppConfig;
  botUsername: string;
  affCode: string;
}): { botLink: string; webLink: string; copyBlock: string } {
  const bot = opts.botUsername.replace(/^@/, "");
  const botLink = `https://t.me/${bot}?start=${encodeURIComponent(`aff_${opts.affCode}`)}`;
  const webLink = buildWebAppUrl(
    opts.config,
    "/",
    { medium: "affiliate", campaign: `aff_${opts.affCode}`, content: "partner_share" },
    { aff: opts.affCode },
  );
  const copyBlock = [
    `Partner aff code: ${opts.affCode}`,
    `Telegram Bot: ${botLink}`,
    `Web / Mini App: ${webLink}`,
    `Canonical web (RevShare): ${opts.config.webAppUrl}/?aff=${encodeURIComponent(opts.affCode)}`,
  ].join("\n");
  return { botLink, webLink, copyBlock };
}

/** @deprecated helper kept for typed imports */
export function roleDropMiniApp(config: AppConfig, roleId: string): string {
  return roleChatMiniAppUrl(config, roleId, "channel_drop");
}

export type { ParsedStartPayload };
