import { InlineKeyboard } from "grammy";
import type { BotContext } from "../context.js";
import { ApiError } from "../../services/soulthread-api.js";
import { homeMiniAppUrl } from "../../services/urls.js";

type TaskList = Awaited<ReturnType<BotContext["services"]["api"]["listTasks"]>>;
type TaskItem = TaskList["items"][number];

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
    console.error("[rewards] auth failed", err);
    await ctx.reply(ctx.t("rewards.authFailed"));
    return null;
  }
}

function taskStatusLabel(ctx: BotContext, task: TaskItem): string {
  if (task.claimable || task.status === "claimable") {
    return ctx.t("rewards.statusClaimable");
  }
  if (task.claimed || task.status === "claimed") {
    return ctx.t("rewards.statusClaimed");
  }
  if (task.status === "expired") {
    return ctx.t("rewards.statusExpired");
  }
  return ctx.t("rewards.statusInProgress");
}

function truncate(s: string, max: number): string {
  const t0 = s.trim();
  if (t0.length <= max) return t0;
  return `${t0.slice(0, max - 1)}…`;
}

function buildRewardsKeyboard(ctx: BotContext, data: TaskList): InlineKeyboard {
  const kb = new InlineKeyboard();
  let buttons = 0;
  const maxButtons = 12;

  for (const task of data.items) {
    if (buttons >= maxButtons) break;
    if (!task.taskId) continue;

    if (task.claimable || task.status === "claimable") {
      kb.text(
        truncate(
          task.taskType === "daily_checkin"
            ? ctx.t("rewards.btnCheckIn", { title: task.title || task.code })
            : ctx.t("rewards.btnClaimTask", { title: task.title || task.code }),
          48,
        ),
        `task:claim:${task.taskId}`,
      ).row();
      buttons += 1;
      continue;
    }

    if (
      !task.claimed &&
      task.status !== "claimed" &&
      task.taskType === "follow_x" &&
      task.targetUrl
    ) {
      kb.text(
        truncate(ctx.t("rewards.btnDoTask", { title: task.title || task.code }), 48),
        `task:ack:${task.taskId}`,
      ).row();
      buttons += 1;
    }
  }

  for (const m of data.dailyActivity?.milestones ?? []) {
    if (buttons >= maxButtons) break;
    if (!m.claimable) continue;
    kb.text(
      ctx.t("rewards.btnClaimMilestone", {
        threshold: m.threshold,
        points: m.rewardPoints,
      }),
      `task:ms:${m.threshold}`,
    ).row();
    buttons += 1;
  }

  kb.text(ctx.t("rewards.btnRefresh"), "task:refresh").row();
  kb.webApp(
    ctx.t("rewards.openApp"),
    homeMiniAppUrl(ctx.config, undefined, "rewards_command", ctx.session),
  );
  return kb;
}

function formatRewardsMessage(ctx: BotContext, data: TaskList): string {
  const lines: string[] = [ctx.t("rewards.header"), ""];

  if (!data.systemEnabled) {
    lines.push(ctx.t("rewards.systemDisabled"));
    return lines.join("\n");
  }

  if (data.dailyActivity) {
    lines.push(
      ctx.t("rewards.activity", {
        current: data.dailyActivity.current,
        max: data.dailyActivity.max,
      }),
    );
    const milestones = data.dailyActivity.milestones;
    if (milestones.length > 0) {
      const parts = milestones.map((m) => {
        let mark = "○";
        if (m.claimed) mark = "✓";
        else if (m.claimable) mark = "!";
        return `${mark}${m.threshold}(+${m.rewardPoints})`;
      });
      lines.push(ctx.t("rewards.milestones", { list: parts.join(" · ") }));
    }
    lines.push("");
  }

  lines.push(ctx.t("rewards.listHeader", { total: data.items.length }));

  if (data.items.length === 0) {
    lines.push(ctx.t("rewards.listEmpty"));
  } else {
    for (let i = 0; i < data.items.length; i++) {
      const task = data.items[i]!;
      const progress =
        task.progressTarget > 1
          ? ` ${task.progressValue}/${task.progressTarget}`
          : "";
      lines.push(
        ctx.t("rewards.listItem", {
          n: i + 1,
          title: task.title || task.code || "—",
          status: taskStatusLabel(ctx, task),
          points: task.rewardPoints,
          progress,
        }),
      );
      if (task.description?.trim()) {
        lines.push(`   ${truncate(task.description, 80)}`);
      }
    }
  }

  const claimableCount =
    data.items.filter((t) => t.claimable || t.status === "claimable").length +
    (data.dailyActivity?.milestones.filter((m) => m.claimable).length ?? 0);
  if (claimableCount > 0) {
    lines.push("", ctx.t("rewards.hintClaim", { count: claimableCount }));
  } else {
    lines.push("", ctx.t("rewards.hintComplete"));
  }

  return lines.join("\n");
}

async function loadAndReply(
  ctx: BotContext,
  opts?: { edit?: boolean },
): Promise<void> {
  const token = await getAuthToken(ctx);
  if (!token) return;

  let data: TaskList;
  try {
    data = await ctx.services.api.listTasks(token);
  } catch (err) {
    console.error("[rewards] load failed", err);
    await ctx.reply(ctx.t("rewards.loadFailed"));
    return;
  }

  const text = formatRewardsMessage(ctx, data);
  const reply_markup = buildRewardsKeyboard(ctx, data);
  const extras = {
    reply_markup,
    link_preview_options: { is_disabled: true as const },
  };

  if (opts?.edit && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, extras);
      return;
    } catch {
      /* fall through to new reply */
    }
  }

  await ctx.reply(text, extras);
}

export async function handleRewardsCommand(ctx: BotContext): Promise<void> {
  await loadAndReply(ctx);
}

export async function handleRewardsRefreshCallback(ctx: BotContext): Promise<void> {
  await loadAndReply(ctx, { edit: true });
}

export async function handleTaskClaimCallback(
  ctx: BotContext,
  taskId: string,
): Promise<void> {
  const token = await getAuthToken(ctx);
  if (!token) return;

  try {
    const result = await ctx.services.api.claimTask(token, taskId);
    await ctx.reply(
      ctx.t("rewards.claimSuccess", {
        points: result.pointsGranted,
        balance: result.balanceAfter,
      }),
    );
  } catch (err) {
    console.error("[rewards] claim failed", err);
    const detail =
      err instanceof ApiError ? `HTTP ${err.status}` : ctx.t("rewards.claimFailed");
    await ctx.reply(
      err instanceof ApiError
        ? ctx.t("rewards.claimFailedDetail", { detail })
        : ctx.t("rewards.claimFailed"),
    );
  }

  await loadAndReply(ctx, { edit: true });
}

export async function handleMilestoneClaimCallback(
  ctx: BotContext,
  thresholdRaw: string,
): Promise<void> {
  const threshold = Number(thresholdRaw);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    await ctx.reply(ctx.t("rewards.claimFailed"));
    return;
  }

  const token = await getAuthToken(ctx);
  if (!token) return;

  try {
    const result = await ctx.services.api.claimActivityMilestone(token, threshold);
    await ctx.reply(
      ctx.t("rewards.claimSuccess", {
        points: result.pointsGranted,
        balance: result.balanceAfter,
      }),
    );
  } catch (err) {
    console.error("[rewards] milestone claim failed", err);
    const detail =
      err instanceof ApiError ? `HTTP ${err.status}` : ctx.t("rewards.claimFailed");
    await ctx.reply(
      err instanceof ApiError
        ? ctx.t("rewards.claimFailedDetail", { detail })
        : ctx.t("rewards.claimFailed"),
    );
  }

  await loadAndReply(ctx, { edit: true });
}

export async function handleTaskAckCallback(
  ctx: BotContext,
  taskId: string,
): Promise<void> {
  const token = await getAuthToken(ctx);
  if (!token) return;

  try {
    const data = await ctx.services.api.listTasks(token);
    const task = data.items.find((t) => t.taskId === taskId);
    const url = task?.targetUrl || task?.inviteUrl;
    if (url) {
      await ctx.reply(ctx.t("rewards.openLink", { url }), {
        link_preview_options: { is_disabled: true },
      });
    }
    await ctx.services.api.ackTask(token, taskId);
    await ctx.reply(ctx.t("rewards.ackDone"));
  } catch (err) {
    console.error("[rewards] ack failed", err);
    await ctx.reply(ctx.t("rewards.claimFailed"));
  }

  await loadAndReply(ctx, { edit: true });
}
