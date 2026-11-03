import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import { referralMiniAppUrl } from "../../services/urls.js";

const INVITE_LIST_LIMIT = 20;

async function getAuthToken(ctx: BotContext): Promise<string | null> {
  if (!ctx.from) return null;
  try {
    const auth = await ctx.services.auth.getTokenForTelegramUser({
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
    return auth.token;
  } catch (err) {
    console.error("[invite] auth failed", err);
    await ctx.reply(ctx.t("invite.authFailed"));
    return null;
  }
}

function statusLabel(ctx: BotContext, status: string): string {
  if (status === "completed") return ctx.t("invite.statusCompleted");
  if (status === "pending") return ctx.t("invite.statusPending");
  return ctx.t("invite.statusUnknown");
}

function formatInviteDate(ts: number): string {
  if (!ts || ts <= 0) return "—";
  const d = new Date(ts * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function handleInviteCommand(ctx: BotContext): Promise<void> {
  const token = await getAuthToken(ctx);
  if (!token) return;

  let me: Awaited<ReturnType<typeof ctx.services.api.getReferralMe>>;
  let invites: Awaited<ReturnType<typeof ctx.services.api.listReferralInvites>>;
  try {
    [me, invites] = await Promise.all([
      ctx.services.api.getReferralMe(token),
      ctx.services.api.listReferralInvites(token, 1, INVITE_LIST_LIMIT),
    ]);
  } catch (err) {
    console.error("[invite] load failed", err);
    await ctx.reply(ctx.t("invite.loadFailed"));
    return;
  }

  const shareUrl = me.shareUrl.trim() || me.inviteCode;
  const lines: string[] = [
    ctx.t("invite.header"),
    "",
    ctx.t("invite.rewardLine", {
      invitee: me.inviteePoints,
      inviter: me.inviterPointsPerInvite,
    }),
    "",
    ctx.t("invite.codeLabel", { code: me.inviteCode || "—" }),
    ctx.t("invite.linkLabel"),
    shareUrl || "—",
    "",
    ctx.t("invite.stats", {
      total: me.totalInvites,
      earned: me.pointsEarnedFromReferral,
    }),
  ];

  if (me.activityStatus && me.activityStatus !== "active") {
    lines.push("", ctx.t("invite.activityEnded"));
  }

  lines.push("", ctx.t("invite.listHeader", { total: invites.total }));

  if (invites.items.length === 0) {
    lines.push(ctx.t("invite.listEmpty"));
  } else {
    for (let i = 0; i < invites.items.length; i++) {
      const row = invites.items[i]!;
      const when = formatInviteDate(row.completedAt || row.createdAt);
      lines.push(
        ctx.t("invite.listItem", {
          n: i + 1,
          email: row.inviteeEmailMasked || "***",
          status: statusLabel(ctx, row.status),
          date: when,
        }),
      );
    }
    if (invites.total > invites.items.length) {
      lines.push(
        ctx.t("invite.listMore", {
          shown: invites.items.length,
          total: invites.total,
        }),
      );
    }
  }

  const kb = new InlineKeyboard().webApp(
    ctx.t("invite.openApp"),
    referralMiniAppUrl(ctx.config, ctx.session),
  );

  await ctx.reply(lines.join("\n"), {
    reply_markup: kb,
    link_preview_options: { is_disabled: true },
  });
}
