import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import type { AppConfig } from "../config.js";
import type { BotEvent, BotEventName } from "./events.js";

export type FunnelSummary = {
  day: string;
  generatedAt: string;
  totals: Record<string, number>;
  uniqueUsers: {
    start: number;
    chatStart: number;
    chatTurn: number;
    appCommand: number;
  };
  startsByKind: Record<string, number>;
  topAffCodes: Array<{ code: string; starts: number }>;
  funnel: {
    start: number;
    agentCard: number;
    chatStart: number;
    chatTurn: number;
    appCommand: number;
    /** proxy: chat_start / start */
    startToChatRate: number | null;
    /** proxy: app_command / start */
    startToAppRate: number | null;
  };
};

function emptyTotals(): Record<string, number> {
  return {};
}

async function readJsonlDay(eventsDir: string, day: string): Promise<BotEvent[]> {
  const file = path.join(eventsDir, `events-${day}.jsonl`);
  try {
    await stat(file);
  } catch {
    return [];
  }
  const events: BotEvent[] = [];
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try {
      events.push(JSON.parse(t) as BotEvent);
    } catch {
      /* skip */
    }
  }
  return events;
}

export async function summarizeFunnel(
  config: AppConfig,
  day = new Date().toISOString().slice(0, 10),
): Promise<FunnelSummary> {
  const events = config.eventsDir
    ? await readJsonlDay(config.eventsDir, day)
    : [];

  const totals = emptyTotals();
  const usersStart = new Set<number>();
  const usersChatStart = new Set<number>();
  const usersChatTurn = new Set<number>();
  const usersApp = new Set<number>();
  const startsByKind: Record<string, number> = {};
  const affCounts = new Map<string, number>();

  for (const ev of events) {
    totals[ev.name] = (totals[ev.name] ?? 0) + 1;
    const uid = ev.telegramUserId;

    if (ev.name === "tg_bot_start") {
      if (uid) usersStart.add(uid);
      const kind = ev.payload?.kind ?? "none";
      startsByKind[kind] = (startsByKind[kind] ?? 0) + 1;
      const aff = ev.payload?.affCode || ev.payload?.refCode;
      if (aff) affCounts.set(aff, (affCounts.get(aff) ?? 0) + 1);
    }
    if (ev.name === "tg_bot_chat_start" && uid) usersChatStart.add(uid);
    if (ev.name === "tg_bot_chat_turn" && uid) usersChatTurn.add(uid);
    if (ev.name === "tg_bot_app_command" && uid) usersApp.add(uid);
  }

  const start = totals.tg_bot_start ?? 0;
  const chatStart = totals.tg_bot_chat_start ?? 0;
  const appCommand = totals.tg_bot_app_command ?? 0;

  const topAffCodes = [...affCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, starts]) => ({ code, starts }));

  return {
    day,
    generatedAt: new Date().toISOString(),
    totals,
    uniqueUsers: {
      start: usersStart.size,
      chatStart: usersChatStart.size,
      chatTurn: usersChatTurn.size,
      appCommand: usersApp.size,
    },
    startsByKind,
    topAffCodes,
    funnel: {
      start,
      agentCard: totals.tg_bot_agent_card ?? 0,
      chatStart,
      chatTurn: totals.tg_bot_chat_turn ?? 0,
      appCommand,
      startToChatRate: start > 0 ? Number((chatStart / start).toFixed(3)) : null,
      startToAppRate: start > 0 ? Number((appCommand / start).toFixed(3)) : null,
    },
  };
}

export async function listEventDays(config: AppConfig): Promise<string[]> {
  if (!config.eventsDir) return [];
  try {
    const files = await readdir(config.eventsDir);
    return files
      .map((f) => f.match(/^events-(\d{4}-\d{2}-\d{2})\.jsonl$/)?.[1])
      .filter((d): d is string => Boolean(d))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function formatFunnelForTelegram(s: FunnelSummary): string {
  const lines = [
    `Funnel · ${s.day}`,
    "",
    `starts: ${s.funnel.start} (unique ${s.uniqueUsers.start})`,
    `agent cards: ${s.funnel.agentCard}`,
    `chat starts: ${s.funnel.chatStart} (unique ${s.uniqueUsers.chatStart})`,
    `chat turns: ${s.funnel.chatTurn}`,
    `/app: ${s.funnel.appCommand}`,
    `start→chat: ${s.funnel.startToChatRate ?? "—"}`,
    `start→/app: ${s.funnel.startToAppRate ?? "—"}`,
    "",
    "Starts by kind: " +
      Object.entries(s.startsByKind)
        .map(([k, v]) => `${k}=${v}`)
        .join(", "),
  ];
  if (s.topAffCodes.length) {
    lines.push(
      "Top aff: " + s.topAffCodes.map((a) => `${a.code}(${a.starts})`).join(", "),
    );
  }
  return lines.join("\n");
}

/** Ensure event name typing stays usable when aggregating */
export type { BotEventName };

export async function readRawEventsFile(
  config: AppConfig,
  day: string,
): Promise<string> {
  if (!config.eventsDir) return "";
  const file = path.join(config.eventsDir, `events-${day}.jsonl`);
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}
