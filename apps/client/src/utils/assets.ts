import { getStaticBase } from '../constants/config';
import { appStaticImage, isRemoteSensitiveAsset } from './appStaticAssets';

// Location plates only — narrative CGs live on R2 (see appStaticAssets.ts).
export const SCENE_IMAGES: Record<string, any> = {
  'scenes/s0_01_b1_dorm': require('../../assets/images/scenes/s0_01_b1_dorm.jpg'),
  'scenes/s0_01_b2_mirror': require('../../assets/images/scenes/s0_01_b2_mirror.jpg'),
  'scenes/s0_01_b3_factory': require('../../assets/images/scenes/s0_01_b3_factory.jpg'),
  'scenes/s0_01_b4_line3': require('../../assets/images/scenes/s0_01_b4_line3.jpg'),
  'scenes/s0_01_b5_corridor': require('../../assets/images/scenes/s0_01_b5_corridor.jpg'),
  'scenes/s0_03_b1_duct': require('../../assets/images/scenes/s0_03_b1_duct.jpg'),
  'scenes/s0_03_b2_main': require('../../assets/images/scenes/s0_03_b2_main.jpg'),
  'scenes/s0_03_b3_side': require('../../assets/images/scenes/s0_03_b3_side.jpg'),
  'scenes/s0_03_b4_mic': require('../../assets/images/scenes/s0_03_b4_mic.png'),
  'scenes/s0_03_b5_exit': require('../../assets/images/scenes/s0_03_b5_exit.jpg'),
  'scenes/s0_04_b1_dorm_night': require('../../assets/images/scenes/s0_04_b1_dorm_night.jpg'),
  'scenes/s0_04_b2_tape': require('../../assets/images/scenes/s0_04_b2_tape.jpg'),
  'scenes/s0_04_b3_notebook': require('../../assets/images/scenes/s0_04_b3_notebook.jpg'),
  'scenes/s0_04_b4_bed': require('../../assets/images/scenes/s0_04_b4_bed.jpg'),
};

export const PORTRAIT_IMAGES: Record<string, any> = {
  'portraits/emily.jpg': require('../../assets/images/portraits/emily.jpg'),
};

export function resolveImage(path?: string): any | undefined {
  if (!path) return undefined;
  if (isRemoteSensitiveAsset(path)) return appStaticImage(path);
  if (path.startsWith('scenes/')) return SCENE_IMAGES[path];
  if (path.startsWith('portraits/')) return PORTRAIT_IMAGES[path];
  return undefined;
}

/** Bundled plate first, then R2 for story CGs, then API /static for generated gallery. */
export function resolveStoryImageSource(path?: string): { uri: string } | number | undefined {
  if (!path) return undefined;
  const bundled = resolveImage(path);
  if (bundled !== undefined) return bundled;
  if (path.startsWith('http://') || path.startsWith('https://')) return { uri: path };
  const base = getStaticBase();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  return { uri: url };
}
