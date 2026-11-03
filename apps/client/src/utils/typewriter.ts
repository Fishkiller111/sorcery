export const TYPEWRITER_CHINESE_PUNCT_DELAY_MS = 100;
export const TYPEWRITER_DEFAULT_DELAY_MS = 28;

const CHINESE_PUNCT_RE = /[，。！？、；：]/;

export function getTypewriterDelay(char: string): number {
  return CHINESE_PUNCT_RE.test(char) ? TYPEWRITER_CHINESE_PUNCT_DELAY_MS : TYPEWRITER_DEFAULT_DELAY_MS;
}
