import type { BeatId } from '../engine/types';

export type VisualInsertTrigger =
  | { type: 'beat_enter'; beat: BeatId; delayMs?: number }
  | { type: 'beat_round_gte'; beat: BeatId; minRounds: number }
  | { type: 'intent_any'; beat: BeatId; keywords: string[] };

export interface VisualInsertDef {
  id: string;
  image: string;
  sfx?: string;
  durationMs: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  duckAmbienceDb?: number;
  trigger: VisualInsertTrigger;
  oncePerBeat?: boolean;
  chainNext?: string;
}
