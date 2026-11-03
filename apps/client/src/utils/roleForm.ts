import { textLengthTrimmed } from './textLength';

export { formatApiError, getApiErrorCode } from './apiError';
export { textLengthTrimmed } from './textLength';

export const INTRO_MIN = 10;
export const INTRO_MAX = 2000;
export const MAX_PERSONALITY_TAG_LEN = 16;
export const MAX_EVENT_DISPLAY_LEN = 32;
export const MAX_EVENT_SUFFIX_LEN = 200;
export const MAX_ROLE_COMMENT_LEN = 500;

export function introLength(introduction: string): number {
  return textLengthTrimmed(introduction);
}

export function personalityTagLength(tag: string): number {
  return textLengthTrimmed(tag);
}
