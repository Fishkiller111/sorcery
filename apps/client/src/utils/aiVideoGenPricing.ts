/**
 * Client-side quote mirroring backend aivideogen.ComputePointsCost.
 * base = models[].points_cost (5s · 512×896 · no audio). Soul rate: 1000pts = $1.
 */
export type AiVideoGenPricingAnchors = {
  ref_duration_sec: number;
  ref_width: number;
  ref_height: number;
  audio_multiplier: number;
  /** Overall percent-off after duration/size/audio (0–90). 20 = pay 80%. */
  discount_pct?: number;
};

export type AiVideoPointsQuote = {
  /** Pay price after overall discount (what is charged) */
  points: number;
  /** Pre-discount list price (for strikethrough UI) */
  listPoints: number;
  discountPct: number;
};

export const FALLBACK_VIDEO_PRICING: AiVideoGenPricingAnchors = {
  ref_duration_sec: 5,
  ref_width: 512,
  ref_height: 896,
  audio_multiplier: 1.15,
  discount_pct: 0,
};

export function quoteAiVideoPoints(input: {
  basePoints: number;
  durationSec: number;
  width?: number;
  height?: number;
  enableAudio?: boolean;
  /** H3 models scale by pixel area; OmniForge stays 1× */
  applySizeScale?: boolean;
  pricing?: AiVideoGenPricingAnchors | null;
}): AiVideoPointsQuote {
  const base = Math.max(0, Math.floor(input.basePoints || 0));
  if (base <= 0) {
    return { points: 0, listPoints: 0, discountPct: 0 };
  }

  const p = input.pricing ?? FALLBACK_VIDEO_PRICING;
  const refDur = p.ref_duration_sec > 0 ? p.ref_duration_sec : 5;
  const duration = input.durationSec > 0 ? input.durationSec : refDur;
  const durMul = duration / refDur;

  let sizeMul = 1;
  if (input.applySizeScale !== false) {
    const refArea = Math.max(1, (p.ref_width || 512) * (p.ref_height || 896));
    const w = input.width ?? 0;
    const h = input.height ?? 0;
    if (w > 0 && h > 0) {
      sizeMul = (w * h) / refArea;
    }
  }

  const audioMul = input.enableAudio ? p.audio_multiplier || 1.15 : 1;
  const listRaw = base * durMul * sizeMul * audioMul;
  const listPoints = Math.max(1, Math.ceil(listRaw - 1e-9));

  const disc = Math.min(90, Math.max(0, Math.floor(p.discount_pct || 0)));
  if (disc <= 0) {
    return { points: listPoints, listPoints, discountPct: 0 };
  }
  const payRaw = (listRaw * (100 - disc)) / 100;
  const points = Math.max(1, Math.ceil(payRaw - 1e-9));
  return { points, listPoints, discountPct: disc };
}
