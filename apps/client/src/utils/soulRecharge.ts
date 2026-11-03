/** Custom Soul recharge: 10000 Soul = $10 → price_cents = soul / 10. */

export const DEFAULT_CUSTOM_MIN_POINTS = 5000;
export const DEFAULT_CUSTOM_STEP_POINTS = 1000;
/** Soft floor in USD for Soul purchases (custom + fixed packs). */
export const SOUL_PURCHASE_MIN_USD = 5;

export function customSoulPriceCents(soul: number): number {
  if (!Number.isFinite(soul) || soul <= 0) return 0;
  return Math.floor(soul / 10);
}

export function snapCustomSoul(raw: number, min: number, step: number): number {
  const m = min > 0 ? min : DEFAULT_CUSTOM_MIN_POINTS;
  const s = step > 0 ? step : DEFAULT_CUSTOM_STEP_POINTS;
  if (!Number.isFinite(raw) || raw < m) return m;
  return Math.round(raw / s) * s;
}

export function resolveCustomMinPoints(min?: number | null): number {
  return min && min > 0 ? min : DEFAULT_CUSTOM_MIN_POINTS;
}

export function resolveCustomStepPoints(step?: number | null): number {
  return step && step > 0 ? step : DEFAULT_CUSTOM_STEP_POINTS;
}
