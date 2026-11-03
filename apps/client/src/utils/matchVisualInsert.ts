import type { BeatId } from '../engine/types';
import type { VisualInsertDef } from '../data/visualInsertTypes';

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const hay = normalize(text);
  return keywords.some((kw) => hay.includes(normalize(kw)));
}

export function findIntentInsert(
  inserts: VisualInsertDef[],
  beatId: BeatId,
  userText: string,
  played: Set<string>,
): VisualInsertDef | null {
  for (const ins of inserts) {
    if (ins.trigger.type !== 'intent_any') continue;
    if (ins.trigger.beat !== beatId) continue;
    if (ins.oncePerBeat && played.has(`${beatId}:${ins.id}`)) continue;
    if (matchesKeywords(userText, ins.trigger.keywords)) return ins;
  }
  return null;
}

export function findBeatEnterInserts(
  inserts: VisualInsertDef[],
  beatId: BeatId,
  played: Set<string>,
): VisualInsertDef[] {
  return inserts.filter((ins) => {
    if (ins.trigger.type !== 'beat_enter') return false;
    if (ins.trigger.beat !== beatId) return false;
    if (ins.oncePerBeat && played.has(`${beatId}:${ins.id}`)) return false;
    return true;
  });
}

export function findRoundGteInsert(
  inserts: VisualInsertDef[],
  beatId: BeatId,
  roundCount: number,
  played: Set<string>,
): VisualInsertDef | null {
  for (const ins of inserts) {
    if (ins.trigger.type !== 'beat_round_gte') continue;
    if (ins.trigger.beat !== beatId) continue;
    if (roundCount < ins.trigger.minRounds) continue;
    if (ins.oncePerBeat && played.has(`${beatId}:${ins.id}`)) continue;
    return ins;
  }
  return null;
}
