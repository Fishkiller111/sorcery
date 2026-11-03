/**
 * User-visible text length in Unicode code points (not UTF-8 bytes, not UTF-16 units).
 * Matches Go backend `textlen.Count` / `utf8.RuneCountInString`.
 */
export function textLength(value: string): number {
  return Array.from(value).length;
}

export function textLengthTrimmed(value: string): number {
  return textLength(value.trim());
}

export function textInRangeTrimmed(value: string, min: number, max: number): boolean {
  const n = textLengthTrimmed(value);
  return n >= min && n <= max;
}
