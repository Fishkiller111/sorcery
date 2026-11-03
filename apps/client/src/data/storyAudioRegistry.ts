import { S0_01_AUDIO } from './s0_01/audioAssets';
import { S0_02_AUDIO } from './s0_02/audioAssets';
import { S0_03_AUDIO } from './s0_03/audioAssets';
import { S0_04_AUDIO } from './s0_04/audioAssets';

export const STORY_AUDIO = {
  ...S0_01_AUDIO,
  ...S0_02_AUDIO,
  ...S0_03_AUDIO,
  ...S0_04_AUDIO,
};

export type StoryAudioKey =
  | keyof typeof S0_01_AUDIO
  | keyof typeof S0_02_AUDIO
  | keyof typeof S0_03_AUDIO
  | keyof typeof S0_04_AUDIO;

export function isStoryAudioKey(key: string): key is StoryAudioKey {
  return Object.hasOwn(STORY_AUDIO, key);
}
