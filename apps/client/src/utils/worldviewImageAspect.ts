export type WorldviewImageAspect = '16:9' | '4:3';

const ASPECT_16_9 = 16 / 9;
const ASPECT_4_3 = 4 / 3;

export function worldviewAspectRatio(aspect: WorldviewImageAspect): number {
  return aspect === '16:9' ? ASPECT_16_9 : ASPECT_4_3;
}

/** Pick the closer of 16:9 or 4:3 for display framing. */
export function nearestWorldviewAspect(width: number, height: number): WorldviewImageAspect {
  if (width <= 0 || height <= 0) return '16:9';
  const ratio = width / height;
  const diff169 = Math.abs(ratio - ASPECT_16_9);
  const diff43 = Math.abs(ratio - ASPECT_4_3);
  return diff169 <= diff43 ? '16:9' : '4:3';
}
