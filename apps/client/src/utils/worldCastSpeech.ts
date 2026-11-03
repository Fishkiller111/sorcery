import type { FreeChatMessage } from '../types/api';
import type { WorldCastPreview, WorldPlayMessage } from '../types/world';

const CAST_LINE_RE = /^\[([^\]]+)\]:\s*/;
const CAST_LINE_GLOBAL_RE = /^\[([^\]]+)\]:\s*/gm;

export function stripCastPrefix(text: string): string {
  return text.replace(/^\[[^\]]+\]:\s*/, '').replace(/^\[[^\]]+\]\s*/, '');
}

function matchCastByLabel(
  label: string,
  casts: WorldCastPreview[],
): WorldCastPreview | undefined {
  const needle = label.trim().toLowerCase();
  if (!needle) return undefined;
  const exact = casts.find(
    (c) => c.cast_id.toLowerCase() === needle || (c.name || '').toLowerCase() === needle,
  );
  if (exact) return exact;
  return casts.find((c) =>
    (c.name || '')
      .split(/\s+/)
      .some((part) => part.toLowerCase() === needle),
  );
}

export type WorldSpeechSeg = {
  cast?: WorldCastPreview;
  text: string;
};

/** Split `[Name]:` embedded multi-speaker replies into per-cast bubbles. */
export function splitWorldSpeech(
  raw: string,
  casts: WorldCastPreview[],
  fallback?: WorldCastPreview | null,
  playerCastId?: string,
): WorldSpeechSeg[] {
  const text = (raw || '').trim();
  if (!text) return [];

  const matches = [...text.matchAll(CAST_LINE_GLOBAL_RE)];
  if (matches.length === 0) {
    return [{ cast: fallback ?? undefined, text }];
  }

  const segs: WorldSpeechSeg[] = [];
  const push = (cast: WorldCastPreview | undefined, body: string) => {
    const cleaned = body.trim();
    if (!cleaned) return;
    if (playerCastId && cast?.cast_id === playerCastId) return;
    const last = segs[segs.length - 1];
    if (last && last.cast?.cast_id && cast?.cast_id && last.cast.cast_id === cast.cast_id) {
      last.text = `${last.text}\n\n${cleaned}`;
      return;
    }
    segs.push({ cast, text: cleaned });
  };

  const firstIdx = matches[0].index ?? 0;
  if (firstIdx > 0) {
    push(fallback ?? undefined, text.slice(0, firstIdx));
  }

  for (let i = 0; i < matches.length; i += 1) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const label = m[1] || '';
    const body = text.slice(start, end);
    const cast = matchCastByLabel(label, casts) ?? fallback ?? undefined;
    if (playerCastId && cast?.cast_id === playerCastId) continue;
    // Unknown label still attributed to fallback to avoid orphan text loss.
    if (!matchCastByLabel(label, casts) && fallback) {
      push(fallback, `[${label}]: ${body}`);
    } else {
      push(cast, body);
    }
  }

  return segs.length ? segs : [{ cast: fallback ?? undefined, text }];
}

export function toWorldFreeChatMessages(
  m: WorldPlayMessage,
  castById: Map<string, WorldCastPreview>,
  casts: WorldCastPreview[],
  opts?: {
    playerAvatar?: string;
    playerCastId?: string;
    playerCastName?: string;
    playerCastAvatar?: string;
    fallbackCast?: WorldCastPreview | null;
  },
): FreeChatMessage[] {
  const isPlayer = m.role === 'user' || m.role === 'player';
  const isSystem = m.role === 'system';
  const ts = (m.created_at || Date.now() / 1000) * 1000;

  if (isPlayer) {
    return [
      {
        id: m.id,
        role: 'player',
        text: m.content || '',
        timestamp: ts,
        agentName: opts?.playerCastName,
        playerAvatar: opts?.playerCastAvatar || opts?.playerAvatar,
      },
    ];
  }
  if (isSystem) {
    return [
      {
        id: m.id,
        role: 'system',
        text: m.content || '',
        timestamp: ts,
      },
    ];
  }

  const castFromId = m.cast_id ? castById.get(m.cast_id) : undefined;
  const fallback = castFromId ?? opts?.fallbackCast ?? null;
  const segs = splitWorldSpeech(m.content || '', casts, fallback, opts?.playerCastId);

  return segs.map((seg, i) => ({
    id: i === 0 ? m.id : `${m.id}-s${i}`,
    role: 'agent' as const,
    text: stripCastPrefix(seg.text),
    timestamp: ts + i,
    agentName: seg.cast?.name ?? fallback?.name,
    agentAvatar: seg.cast?.figure_image ?? fallback?.figure_image,
  }));
}

/** Resolve cast for a live stream bubble from active_agent or [Name]: prefix. */
export function resolveStreamCast(
  text: string,
  activeCastId: string | undefined,
  castById: Map<string, WorldCastPreview>,
  casts: WorldCastPreview[],
  fallback?: WorldCastPreview | null,
): WorldCastPreview | null | undefined {
  if (activeCastId) {
    const hit = castById.get(activeCastId);
    if (hit) return hit;
  }
  const m = text.match(CAST_LINE_RE);
  if (m?.[1]) {
    const byLabel = matchCastByLabel(m[1], casts);
    if (byLabel) return byLabel;
  }
  return fallback;
}
