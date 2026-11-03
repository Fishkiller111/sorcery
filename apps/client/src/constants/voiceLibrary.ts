/** Voice Library filter chips (client-side keyword matching on catalog titles). */
export const VOICE_LIBRARY_FILTERS = [
  { id: 'language', labelKey: 'creationCenter.voiceLibrary.filterLanguage' },
  { id: 'accent', labelKey: 'creationCenter.voiceLibrary.filterAccent' },
  { id: 'conversational', labelKey: 'creationCenter.voiceLibrary.filterConversational' },
  { id: 'narration', labelKey: 'creationCenter.voiceLibrary.filterNarration' },
  { id: 'characters', labelKey: 'creationCenter.voiceLibrary.filterCharacters' },
  { id: 'social', labelKey: 'creationCenter.voiceLibrary.filterSocial' },
  { id: 'education', labelKey: 'creationCenter.voiceLibrary.filterEducation' },
  { id: 'ads', labelKey: 'creationCenter.voiceLibrary.filterAds' },
  { id: 'entertainment', labelKey: 'creationCenter.voiceLibrary.filterEntertainment' },
] as const;

export type VoiceLibraryFilterId = (typeof VOICE_LIBRARY_FILTERS)[number]['id'];

const FILTER_KEYWORDS: Partial<Record<VoiceLibraryFilterId, string[]>> = {
  conversational: ['conversational', 'calm', 'warm', 'friendly'],
  narration: ['narration', 'narrator', 'story', 'audiobook'],
  characters: ['character', 'role', 'acting', 'dramatic'],
  social: ['social', 'lively', 'energetic', 'upbeat'],
  education: ['education', 'teacher', 'explain', 'clear'],
  ads: ['ad', 'commercial', 'promo', 'marketing'],
  entertainment: ['entertainment', 'fun', 'playful', 'show'],
};

export function voiceMatchesFilter(
  title: string,
  language: string,
  filterId: VoiceLibraryFilterId,
  preferredLang: string,
): boolean {
  const haystack = `${title} ${language}`.toLowerCase();
  if (filterId === 'language') {
    return language.toLowerCase().startsWith(preferredLang.slice(0, 2));
  }
  if (filterId === 'accent') {
    return haystack.includes('accent') || haystack.includes('british') || haystack.includes('american');
  }
  const keywords = FILTER_KEYWORDS[filterId];
  if (!keywords) return true;
  return keywords.some((kw) => haystack.includes(kw));
}

export const VOICE_AVATAR_COLORS = ['#C44B4B', '#4B6FC4', '#8B4BC4', '#4BC49A', '#C49A4B'] as const;

/** Voice design API typically completes within ~3 minutes. */
export const VOICE_DESIGN_ESTIMATED_SECS = 90;

export function estimateVoiceDesignProgress(createdAtSec: number, nowMs = Date.now()): number {
  const elapsedSec = Math.max(0, (nowMs - createdAtSec * 1000) / 1000);
  const ratio = elapsedSec / VOICE_DESIGN_ESTIMATED_SECS;
  return Math.min(0.92, Math.max(0.06, ratio));
}

export function voiceAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i)) % VOICE_AVATAR_COLORS.length;
  }
  return VOICE_AVATAR_COLORS[hash];
}

function resolveVoiceLanguageLabel(language: string, t: (key: string) => string): string {
  const raw = (language || 'en').toLowerCase().trim();
  const aliases: Record<string, string> = {
    english: 'en',
    chinese: 'zh',
    mandarin: 'zh',
    japanese: 'ja',
    korean: 'ko',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    russian: 'ru',
    jp: 'ja',
  };
  const code = aliases[raw] ?? raw.slice(0, 2);
  const langKey = `creationCenter.voiceLibrary.langs.${code}`;
  if (t(langKey) !== langKey) return t(langKey);
  return language ? language.charAt(0).toUpperCase() + language.slice(1) : t('creationCenter.voiceLibrary.langs.en');
}

export function voiceCategoryLabel(
  title: string,
  language: string,
  t: (key: string) => string,
  tp: (key: string, params: Record<string, string | number>) => string,
): string {
  const lower = title.toLowerCase();
  let category = t('creationCenter.voiceLibrary.filterConversational');
  if (lower.includes('narrat')) category = t('creationCenter.voiceLibrary.filterNarration');
  else if (lower.includes('social') || lower.includes('lively')) category = t('creationCenter.voiceLibrary.filterSocial');
  else if (lower.includes('convers') || lower.includes('calm')) category = t('creationCenter.voiceLibrary.filterConversational');
  else if (lower.includes('character')) category = t('creationCenter.voiceLibrary.filterCharacters');

  const langLabel = resolveVoiceLanguageLabel(language, t);

  return tp('creationCenter.voiceLibrary.metaLine', { language: langLabel, category });
}
