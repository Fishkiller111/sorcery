/** First-frame / cover image for story chapter list thumbnails. */
export const STORY_SCENE_THUMB_KEYS: Record<string, string> = {
  s0_01: 'scenes/s0_01_b1_dorm',
  s0_02: 'parallels/PA02/M-PA02-1.jpg',
  s0_03: 'scenes/s0_03_b1_duct',
  s0_04: 'scenes/s0_04_b1_dorm_night',
};

export function getStorySceneThumbKey(sceneCode: string): string | undefined {
  return STORY_SCENE_THUMB_KEYS[sceneCode];
}
