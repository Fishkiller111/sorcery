export const AGE_MIN = 0;
export const AGE_MAX = 100;
export const DEFAULT_AGE = 22;

export function clampAge(n: number): number {
  if (!Number.isFinite(n)) return AGE_MIN;
  return Math.max(AGE_MIN, Math.min(AGE_MAX, Math.round(n)));
}

/** English appearance fragment for image / role prompts. */
export function ageAppearancePart(age: number | undefined): string | undefined {
  if (age === undefined || age === null) return undefined;
  return `looking about ${clampAge(age)} years old`;
}
