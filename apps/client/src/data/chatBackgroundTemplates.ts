/** Built-in chat background templates. Exactly four — keep the picker lean. */
import type { ImageSourcePropType } from 'react-native';
import { COLORS } from '../theme/colors';
import { TOKENS } from '../pages/default/theme/tokens';

export const DEFAULT_CHAT_BG_PC = '/static/scenes/default-user-bg-pc.png?v=20260730';
export const DEFAULT_CHAT_BG_MOBILE = '/static/scenes/default-user-bg-mobile.png?v=20260730';

export const MEDITERRANEAN_CHAT_BG_PC = '/static/scenes/mediterranean-bg-pc.png?v=20260730';
export const MEDITERRANEAN_CHAT_BG_MOBILE = '/static/scenes/mediterranean-bg-mobile.png?v=20260730';

export const OBSIDIAN_CHAT_BG_PC = '/static/scenes/obsidian-bg-pc.png?v=20260730';
export const OBSIDIAN_CHAT_BG_MOBILE = '/static/scenes/obsidian-bg-mobile.png?v=20260730';

/** Bundled assets — used so templates never depend on CDN sync. */
export const DEFAULT_CHAT_BG_PC_SOURCE: ImageSourcePropType = require('../../assets/images/chat-bg/default-user-bg-pc.png');
export const DEFAULT_CHAT_BG_MOBILE_SOURCE: ImageSourcePropType = require('../../assets/images/chat-bg/default-user-bg-mobile.png');
export const MEDITERRANEAN_CHAT_BG_PC_SOURCE: ImageSourcePropType = require('../../assets/images/chat-bg/mediterranean-bg-pc.png');
export const MEDITERRANEAN_CHAT_BG_MOBILE_SOURCE: ImageSourcePropType = require('../../assets/images/chat-bg/mediterranean-bg-mobile.png');
export const OBSIDIAN_CHAT_BG_PC_SOURCE: ImageSourcePropType = require('../../assets/images/chat-bg/obsidian-bg-pc.png');
export const OBSIDIAN_CHAT_BG_MOBILE_SOURCE: ImageSourcePropType = require('../../assets/images/chat-bg/obsidian-bg-mobile.png');

export type ChatBackgroundTemplateKind = 'image' | 'solid';

export type ChatBackgroundTemplate = {
  id: string;
  /** i18n key under chat.bgTemplates.* */
  nameKey: string;
  kind: ChatBackgroundTemplateKind;
  /** Preview swatch / solid fill. */
  previewColor: string;
  secondaryColor: string;
  /** 9:16 art URL (API /static path). */
  portraitUrl?: string;
  /** 16:9 art URL (API /static path). */
  landscapeUrl?: string;
  /** Bundled portrait art (preferred when present). */
  portraitSource?: ImageSourcePropType;
  /** Bundled landscape art (preferred when present). */
  landscapeSource?: ImageSourcePropType;
};

export type ChatBgThemeVariant = 'default' | 'soviet';

/** Theme-aware solid dark fill for the last template. */
function solidDark(variant: ChatBgThemeVariant): { previewColor: string; secondaryColor: string } {
  if (variant === 'soviet') {
    return {
      previewColor: COLORS.bg.primary,
      secondaryColor: COLORS.bg.subtle,
    };
  }
  return {
    previewColor: TOKENS.colors.bg,
    secondaryColor: TOKENS.colors.mainGradientMid,
  };
}

export function getChatBackgroundTemplates(
  variant: ChatBgThemeVariant = 'default',
): ChatBackgroundTemplate[] {
  const dark = solidDark(variant);
  return [
    {
      id: 'soulthread_default',
      nameKey: 'soulthreadDefault',
      kind: 'image',
      previewColor: '#0b1220',
      secondaryColor: '#2a1848',
      portraitUrl: DEFAULT_CHAT_BG_MOBILE,
      landscapeUrl: DEFAULT_CHAT_BG_PC,
      portraitSource: DEFAULT_CHAT_BG_MOBILE_SOURCE,
      landscapeSource: DEFAULT_CHAT_BG_PC_SOURCE,
    },
    {
      id: 'mediterranean',
      nameKey: 'mediterranean',
      kind: 'image',
      previewColor: '#c4b8a0',
      secondaryColor: '#4a7ab0',
      portraitUrl: MEDITERRANEAN_CHAT_BG_MOBILE,
      landscapeUrl: MEDITERRANEAN_CHAT_BG_PC,
      portraitSource: MEDITERRANEAN_CHAT_BG_MOBILE_SOURCE,
      landscapeSource: MEDITERRANEAN_CHAT_BG_PC_SOURCE,
    },
    {
      id: 'obsidian',
      nameKey: 'obsidian',
      kind: 'image',
      previewColor: '#1a1a1c',
      secondaryColor: '#3a3530',
      portraitUrl: OBSIDIAN_CHAT_BG_MOBILE,
      landscapeUrl: OBSIDIAN_CHAT_BG_PC,
      portraitSource: OBSIDIAN_CHAT_BG_MOBILE_SOURCE,
      landscapeSource: OBSIDIAN_CHAT_BG_PC_SOURCE,
    },
    {
      id: 'theme_dark',
      nameKey: 'themeDark',
      kind: 'solid',
      previewColor: dark.previewColor,
      secondaryColor: dark.secondaryColor,
    },
  ];
}

/** @deprecated Prefer getChatBackgroundTemplates(variant). */
export const CHAT_BACKGROUND_TEMPLATES = getChatBackgroundTemplates('default');

/** Map known /static chat-bg paths to bundled ImageSource (avoids CDN 404). */
export function bundledSourceForChatBgPath(
  path?: string | null,
): ImageSourcePropType | undefined {
  const p = (path?.trim() || '').split('?')[0];
  if (!p) return undefined;
  if (p === '/static/scenes/default-user-bg-mobile.png' || p.endsWith('/default-user-bg-mobile.png')) {
    return DEFAULT_CHAT_BG_MOBILE_SOURCE;
  }
  if (p === '/static/scenes/default-user-bg-pc.png' || p.endsWith('/default-user-bg-pc.png')) {
    return DEFAULT_CHAT_BG_PC_SOURCE;
  }
  if (p === '/static/scenes/mediterranean-bg-mobile.png' || p.endsWith('/mediterranean-bg-mobile.png')) {
    return MEDITERRANEAN_CHAT_BG_MOBILE_SOURCE;
  }
  if (p === '/static/scenes/mediterranean-bg-pc.png' || p.endsWith('/mediterranean-bg-pc.png')) {
    return MEDITERRANEAN_CHAT_BG_PC_SOURCE;
  }
  if (p === '/static/scenes/obsidian-bg-mobile.png' || p.endsWith('/obsidian-bg-mobile.png')) {
    return OBSIDIAN_CHAT_BG_MOBILE_SOURCE;
  }
  if (p === '/static/scenes/obsidian-bg-pc.png' || p.endsWith('/obsidian-bg-pc.png')) {
    return OBSIDIAN_CHAT_BG_PC_SOURCE;
  }
  return undefined;
}
