import type { LocalizedString } from '../i18n/types';

/** 保持原有顺序：API 仅是兜底，多语言标题优先。 */
export function mergeGalleryTitle(apiTitle: string, translated: LocalizedString): LocalizedString {
  return Object.assign({ zh: apiTitle, en: apiTitle }, translated);
}
