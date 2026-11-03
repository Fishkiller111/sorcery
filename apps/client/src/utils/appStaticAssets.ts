import type { ImageSourcePropType } from 'react-native';
import { getAppStaticBase } from '../constants/config';

/** 未配置自有素材服务器时使用透明占位，不发起远程请求。 */
const MISSING_IMAGE = require('../../assets/placeholder.png');
export function appStaticImageUrl(relativeFromImages: string): string {
  const path = relativeFromImages.replace(/^\//, '');
  const base = getAppStaticBase();
  return base ? `${base}/images/${path}` : '';
}

export function appStaticImage(relativeFromImages: string): ImageSourcePropType {
  const uri = appStaticImageUrl(relativeFromImages);
  return uri ? { uri } : MISSING_IMAGE;
}

/** Story CGs / inserts hosted on R2 instead of Metro `require()`. */
export function isRemoteSensitiveAsset(path: string): boolean {
  if (
    path.startsWith('rewards/') ||
    path.startsWith('badends/') ||
    path.startsWith('parallels/')
  ) {
    return true;
  }
  return path.includes('/inserts/');
}
