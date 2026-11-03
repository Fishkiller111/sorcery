import type { Lang } from '../i18n/types';
import { isAppLang } from '../i18n/langs';
import type { UpdateUserReq } from '../types/api';

function normalizeBackendLang(code?: string | null): string {
  const raw = (code ?? '').trim().toLowerCase();
  if (raw === 'ja') return 'jp';
  if (raw === 'cn' || raw === 'zh-cn' || raw === 'zh-hans') return 'zh';
  if (raw === 'ru-ru') return 'ru';
  if (raw.startsWith('es')) return 'es';
  return raw;
}

/** Map backend user lang fields to app UI lang. */
export function toAppLang(backendLang?: string | null): Lang {
  const code = normalizeBackendLang(backendLang);
  if (isAppLang(code)) return code;
  return 'en';
}

/** Map app UI lang to backend lang fields (1:1 with backend codes). */
export function toBackendLang(appLang: Lang): string {
  return appLang;
}

export function buildUnifiedLangUpdate(appLang: Lang): UpdateUserReq {
  const backendLang = toBackendLang(appLang);
  return {
    subtitle_lang: backendLang,
    voice_lang: backendLang,
    system_lang: backendLang,
  };
}

/** ISO-639-1 code for Whisper / OpenRouter STT (jp → ja). */
export function toWhisperLang(code?: string | null): string | undefined {
  const normalized = normalizeBackendLang(code);
  if (normalized === 'jp') return 'ja';
  if (normalized === 'zh' || normalized === 'en' || normalized === 'ru' || normalized === 'es' || normalized === 'ja') {
    return normalized;
  }
  return undefined;
}

/** Prefer voice_lang for ASR; fall back to subtitle/system then UI lang. */
export function resolveAsrLang(
  user?: { voice_lang?: string; subtitle_lang?: string; system_lang?: string } | null,
  uiLang?: Lang,
): string | undefined {
  const fromUser = user?.voice_lang || user?.subtitle_lang || user?.system_lang;
  if (fromUser) return toWhisperLang(fromUser);
  if (uiLang) return toWhisperLang(uiLang);
  return undefined;
}
