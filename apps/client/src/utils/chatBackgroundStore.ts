import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';
import {
  DEFAULT_CHAT_BG_MOBILE,
  DEFAULT_CHAT_BG_MOBILE_SOURCE,
  DEFAULT_CHAT_BG_PC,
  DEFAULT_CHAT_BG_PC_SOURCE,
  bundledSourceForChatBgPath,
} from '../data/chatBackgroundTemplates';
import { resolveStaticUrl } from '../constants/config';

const STORAGE_PREFIX = 'soulthread_chat_bg:';

export type ChatBackgroundSource = 'default' | 'template' | 'custom';

export type ChatBackgroundPreference = {
  source: ChatBackgroundSource;
  /** Built-in template id when source === 'template'. */
  templateId?: string;
  /** 9:16 portrait / mobile URL (custom or template). */
  portraitUrl?: string;
  /** 16:9 landscape / desktop URL (custom or template). */
  landscapeUrl?: string;
  /** Solid fallback when template images are still placeholders. */
  fallbackColor?: string;
};

/** Stellar bundled art — fallback when agent has no figure; also a picker template. */
export function stellarChatBgPath(viewport: { width: number; height: number }): string {
  return viewport.width >= viewport.height ? DEFAULT_CHAT_BG_PC : DEFAULT_CHAT_BG_MOBILE;
}

export function stellarChatBgSource(viewport: { width: number; height: number }): ImageSourcePropType {
  return viewport.width >= viewport.height
    ? DEFAULT_CHAT_BG_PC_SOURCE
    : DEFAULT_CHAT_BG_MOBILE_SOURCE;
}

export async function loadChatBackgroundPreference(
  roleId: string,
): Promise<ChatBackgroundPreference | null> {
  const id = roleId.trim();
  if (!id) return null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatBackgroundPreference;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveChatBackgroundPreference(
  roleId: string,
  pref: ChatBackgroundPreference,
): Promise<void> {
  const id = roleId.trim();
  if (!id) return;
  await AsyncStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(pref));
}

export async function clearChatBackgroundPreference(roleId: string): Promise<void> {
  const id = roleId.trim();
  if (!id) return;
  await AsyncStorage.removeItem(STORAGE_PREFIX + id);
}

export type ResolvedChatBackground = {
  uri?: string;
  fallbackColor?: string;
  /**
   * - figure: agent 立绘 as platform default (no user preference)
   * - stellar: bundled Stellar fallback when figure is missing
   * - user: template / custom preference
   */
  kind: 'figure' | 'stellar' | 'user';
};

/**
 * Resolve chat background for agent dialogue pages.
 * Default / reset uses the agent's figure (立绘), cover-fitted to the viewport
 * (works for both portrait mobile and landscape web). Falls back to Stellar
 * when the agent has no figure. Template / custom preferences still win.
 */
export function resolveChatBackgroundUri(
  pref: ChatBackgroundPreference | null | undefined,
  viewport: { width: number; height: number },
  /** Agent standing art (9:16). Preferred default background. */
  roleFigureUrl?: string | null,
  /** Fallback when figure is empty. */
  roleAvatarUrl?: string | null,
): ResolvedChatBackground {
  const landscape = viewport.width >= viewport.height;
  const stellar = stellarChatBgPath(viewport);
  const figure = (roleFigureUrl || roleAvatarUrl || '').trim();

  if (!pref || pref.source === 'default') {
    if (figure) {
      return { uri: figure, kind: 'figure' };
    }
    return { uri: stellar, kind: 'stellar' };
  }
  const customOrTemplate = landscape
    ? pref.landscapeUrl || pref.portraitUrl
    : pref.portraitUrl || pref.landscapeUrl;
  if (customOrTemplate?.trim()) {
    return { uri: customOrTemplate.trim(), kind: 'user' };
  }
  if (pref.fallbackColor) {
    return { fallbackColor: pref.fallbackColor, kind: 'user' };
  }
  if (figure) {
    return { uri: figure, kind: 'figure' };
  }
  return { uri: stellar, kind: 'stellar' };
}

/** RN Image source helper (bundled Stellar / known templates preferred). */
export function resolveChatBackgroundSource(
  uri: string | undefined | null,
): ImageSourcePropType | { uri: string } | undefined {
  const raw = uri?.trim();
  if (!raw) return undefined;
  const bundled = bundledSourceForChatBgPath(raw);
  if (bundled) return bundled;
  const absolute = resolveStaticUrl(raw) || raw;
  return { uri: absolute };
}
