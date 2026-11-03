import type { StoryMessageItem, StoryBadEndPayload } from '../types/story';
import type { AgentId, BadEndConfig, BeatId, ChatMessage, SceneConfig } from '../engine/types';

/** Beat opening block: "地点 · HH:MM" + scene description — shown in TaskGuidancePanel, not chat. */
const BEAT_SCENE_HEADER_RE = /^(.+? · \d{1,2}:\d{2})(?:\s+([\s\S]+))?$/;

export type BeatSceneDescription = {
  meta: string;
  text: string;
};

/** Parse server `formatOpening`: "{location} · {time}\n\n{openingNarration}". */
export function parseBeatOpeningContent(content: string): BeatSceneDescription | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const blocks = trimmed.split(/\n\n+/);
  if (blocks.length >= 2) {
    const meta = blocks[0].trim();
    const text = blocks.slice(1).join('\n\n').trim();
    if (meta && text && /\d{1,2}:\d{2}$/.test(meta)) {
      return { meta, text };
    }
  }

  const headerMatch = trimmed.match(BEAT_SCENE_HEADER_RE);
  if (!headerMatch) return null;
  const text = headerMatch[2]?.trim() ?? '';
  if (!text) return null;
  return { meta: headerMatch[1].trim(), text };
}

export function mapStoryMessageItem(msg: StoryMessageItem): ChatMessage | null {
  const id = msg.id || String(msg.created_at);
  const timestamp = msg.created_at || Date.now();

  if (msg.role === 'user') {
    return { id, agent: 'player', text: msg.content, timestamp, type: 'player' };
  }
  if (msg.role === 'system') {
    if (parseBeatOpeningContent(msg.content)) return null;
    return { id, agent: 'system', text: msg.content, timestamp, type: 'system' };
  }

  const agent = (msg.agent_key || 'narrator') as AgentId;
  return { id, agent, text: msg.content, timestamp, type: 'agent' };
}

export function beatAdvanceChatMessages(payload: {
  event_id?: string;
  narration?: string;
  opening?: string;
}): ChatMessage[] {
  const ts = Date.now();
  const eid = payload.event_id || String(ts);
  const out: ChatMessage[] = [];
  if (payload.narration?.trim()) {
    out.push({
      id: `ba-n-${eid}`,
      agent: 'narrator',
      text: payload.narration.trim(),
      timestamp: ts,
      type: 'agent',
    });
  }
  return out;
}

/** True when the latest user turn already has a visible agent/system reply in chat UI. */
export function hasAgentReplyAfterLastUser(messages: ChatMessage[]): boolean {
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].type === 'player') {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx < 0) return false;
  return messages
    .slice(lastUserIdx + 1)
    .some(
      (m) =>
        (m.type === 'agent' || m.type === 'system') && m.text.trim().length > 0,
    );
}

export function hasAssistantAfterLastUser(
  items: { role: string; content: string }[],
): boolean {
  let lastUserIdx = -1;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx < 0) return false;
  return items
    .slice(lastUserIdx + 1)
    .some((m) => {
      const role = m.role;
      const text = m.content?.trim() ?? '';
      if (!text) return false;
      return role === 'assistant' || role === 'system';
    });
}

export function countUserRoundsInBeat(items: StoryMessageItem[], beatId: string): number {
  return items.filter((m) => m.role === 'user' && m.beat_id === beatId).length;
}

/** Merge server story rows by message id (for stuck-round counting). */
export function mergeStoryMessageItems(
  prev: StoryMessageItem[],
  delta: StoryMessageItem[],
): StoryMessageItem[] {
  if (delta.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id || String(m.created_at), m]));
  for (const msg of delta) {
    const key = msg.id || String(msg.created_at);
    byId.set(key, { ...byId.get(key), ...msg });
  }
  return [...byId.values()].sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
}

export function syncBeatFromMessages(
  items: StoryMessageItem[],
  config: SceneConfig,
): BeatId | null {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const beatId = items[i].beat_id;
    if (beatId && config.beats.some((b) => b.beatId === beatId)) {
      return beatId as BeatId;
    }
  }
  return null;
}

export function mapStoryMessages(items: StoryMessageItem[]): ChatMessage[] {
  return items
    .map(mapStoryMessageItem)
    .filter((msg): msg is ChatMessage => msg !== null);
}

export function isOptimisticUserMessageId(id: string): boolean {
  return id.startsWith('u-');
}

export function hasOptimisticUserMessage(messages: ChatMessage[]): boolean {
  return messages.some((m) => m.type === 'player' && isOptimisticUserMessageId(m.id));
}

/** Drop optimistic user rows when the server already returned the same text with a real id. */
function stripReconciledOptimisticUsers(
  prev: ChatMessage[],
  delta: ChatMessage[],
): ChatMessage[] {
  const serverUserTexts = new Set(
    delta
      .filter((m) => m.type === 'player')
      .map((m) => m.text.trim())
      .filter(Boolean),
  );
  if (serverUserTexts.size === 0) return prev;
  return prev.filter((m) => {
    if (m.type !== 'player' || !isOptimisticUserMessageId(m.id)) return true;
    return !serverUserTexts.has(m.text.trim());
  });
}

/** Merge server delta into local messages without dropping in-flight WS previews. */
export function mergeStoryMessages(prev: ChatMessage[], delta: ChatMessage[]): ChatMessage[] {
  if (delta.length === 0) return prev;
  const base = stripReconciledOptimisticUsers(prev, delta);
  const byId = new Map(base.map((m) => [m.id, m]));
  for (const msg of delta) {
    const existing = byId.get(msg.id);
    if (!existing) {
      byId.set(msg.id, msg);
      continue;
    }
    const keep =
      msg.text.trim().length >= existing.text.trim().length ? msg : existing;
    byId.set(msg.id, { ...existing, ...keep });
  }
  const merged = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
  return merged;
}

export function hasMessageWithContent(messages: ChatMessage[], messageId: string): boolean {
  const msg = messages.find((m) => m.id === messageId);
  return !!msg && msg.text.trim().length > 0;
}

export function hasAssistantMessageItem(
  items: StoryMessageItem[],
  messageId: string,
): boolean {
  const item = items.find((m) => m.id === messageId);
  return !!item && item.role === 'assistant' && (item.content?.trim().length ?? 0) > 0;
}

export function serverBadEndToConfig(
  payload: StoryBadEndPayload,
  config: SceneConfig,
): BadEndConfig {
  const local = config.badEnds.find((b) => b.badEndId === payload.bad_end_id);
  const hint = payload.retry_hint || '';
  const mapped =
    payload.steps?.map((s) => ({
      step: s.step,
      text: { zh: s.text || '', en: s.text || '' },
      standardImage: s.standard_image || s.image,
      matureImage: s.mature_image || s.image,
      durationMs: s.duration_ms ?? 3000,
    })) ?? [];

  // Local scene config has the full authored playback (images + mature-only beats).
  const steps = local?.steps?.length ? local.steps : mapped;

  return {
    badEndId: payload.bad_end_id,
    triggerId: local?.triggerId || payload.bad_end_id,
    rollbackCheckpoint: (payload.rollback_beat as BeatId) || local?.rollbackCheckpoint || 'beat_1',
    retryHint: hint
      ? { zh: hint, en: hint }
      : local?.retryHint || { zh: '', en: '' },
    minSeconds: payload.min_seconds ?? local?.minSeconds ?? 15,
    skipAfterFirstImage: local?.skipAfterFirstImage ?? false,
    steps,
  };
}

export function normalizeBeatId(beatId: string, config: SceneConfig): BeatId {
  const known = config.beats.find((b) => b.beatId === beatId);
  if (known) return known.beatId;
  if (beatId === 'parallel') return config.entryCheckpoint;
  return config.entryCheckpoint;
}
