import type { AppConfig } from "../config.js";
import type { ParsedStartPayload } from "./startPayload.js";

export type UtmParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
};

function appendUtm(url: URL, utm: UtmParams) {
  if (utm.source) url.searchParams.set("utm_source", utm.source);
  if (utm.medium) url.searchParams.set("utm_medium", utm.medium);
  if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) url.searchParams.set("utm_content", utm.content);
  if (utm.term) url.searchParams.set("utm_term", utm.term);
}

export function buildWebAppUrl(
  config: AppConfig,
  path: string,
  utm: UtmParams,
  extra?: Record<string, string | undefined>,
): string {
  const base = config.webAppUrl;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalized === "/" ? "" : normalized}`);
  appendUtm(url, {
    source: utm.source ?? "telegram",
    medium: utm.medium ?? "miniapp",
    campaign: utm.campaign ?? config.utmCampaign,
    content: utm.content,
    term: utm.term,
  });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

function attributionExtra(
  payload?: ParsedStartPayload,
  sessionAff?: string,
  sessionSrc?: string,
): Record<string, string | undefined> {
  const aff = payload?.affCode || payload?.refCode || sessionAff;
  const src =
    payload?.kind === "src" ? payload.source : sessionSrc;
  return {
    aff: aff || undefined,
    tg_src: src || undefined,
  };
}

export function homeMiniAppUrl(
  config: AppConfig,
  payload?: ParsedStartPayload,
  content = "open_app",
  session?: { pendingAffCode?: string; pendingSrc?: string },
): string {
  return buildWebAppUrl(
    config,
    "/",
    {
      medium: "miniapp",
      campaign: (payload?.affCode || session?.pendingAffCode)
        ? `aff_${payload?.affCode || session?.pendingAffCode}`
        : config.utmCampaign,
      content,
    },
    attributionExtra(payload, session?.pendingAffCode, session?.pendingSrc),
  );
}

export function exploreMiniAppUrl(
  config: AppConfig,
  session?: { pendingAffCode?: string; pendingSrc?: string },
): string {
  return buildWebAppUrl(
    config,
    "/explore",
    { medium: "miniapp", content: "explore_all" },
    attributionExtra(undefined, session?.pendingAffCode, session?.pendingSrc),
  );
}

export function roleChatMiniAppUrl(
  config: AppConfig,
  roleId: string,
  content = "agent_card",
  session?: { pendingAffCode?: string; pendingSrc?: string },
): string {
  return buildWebAppUrl(
    config,
    `/free-chat/${encodeURIComponent(roleId)}`,
    {
      medium: "miniapp",
      content,
      campaign: session?.pendingAffCode
        ? `aff_${session.pendingAffCode}`
        : config.utmCampaign,
    },
    attributionExtra(undefined, session?.pendingAffCode, session?.pendingSrc),
  );
}

export function referralMiniAppUrl(
  config: AppConfig,
  session?: { pendingAffCode?: string; pendingSrc?: string },
): string {
  return buildWebAppUrl(
    config,
    "/referral",
    { medium: "miniapp", content: "invite_command" },
    attributionExtra(undefined, session?.pendingAffCode, session?.pendingSrc),
  );
}

export function roleChatMiniAppDirectUrl(
  botUsername: string,
  roleId: string,
  affCode?: string,
): string {
  const bot = botUsername.replace(/^@/, "");
  let startapp = `agent_${roleId}`;
  if (affCode) startapp += `__aff_${affCode}`;
  return `https://t.me/${bot}?startapp=${encodeURIComponent(startapp)}`;
}

export function roleHttpsFallback(
  config: AppConfig,
  roleId: string,
): string {
  return buildWebAppUrl(config, `/free-chat/${encodeURIComponent(roleId)}`, {
    medium: "bot",
    content: "https_fallback",
  });
}
