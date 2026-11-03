/** UTM capture for App web — persists landing query for GA4 channel attribution. */

export const INTERNAL_TEST_SESSION_KEY = 'st_app_internal_test';

/** Recommended UTM for team QA: ?utm_source=internal&utm_medium=test&utm_campaign=tracking_test */
export const INTERNAL_TEST_UTM = {
  source: 'internal',
  medium: 'test',
} as const;

export const UTM_PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type UtmParamKey = (typeof UTM_PARAM_KEYS)[number];
export type UtmParams = Partial<Record<UtmParamKey, string>>;

/** sessionStorage：同会话 SPA 跳转；localStorage：30 天 first-touch（对齐联盟窗） */
export const UTM_SESSION_KEY = 'st_app_utm';
export const UTM_STORAGE_KEY = '@soulthread/utm_attribution';
export const UTM_ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type UtmRecord = {
  params: UtmParams;
  capturedAt: number;
};

function readSearchParams(search?: string): URLSearchParams {
  if (search != null) return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (typeof window === 'undefined') return new URLSearchParams();
  const locationSearch = window.location?.search;
  if (typeof locationSearch !== 'string') return new URLSearchParams();
  return new URLSearchParams(locationSearch);
}

/** True when URL carries internal/test UTM (case-insensitive). */
export function isInternalTestUtm(search?: string): boolean {
  const params = readSearchParams(search);
  const source = params.get('utm_source')?.trim().toLowerCase();
  const medium = params.get('utm_medium')?.trim().toLowerCase();
  return (
    source === INTERNAL_TEST_UTM.source || medium === INTERNAL_TEST_UTM.medium
  );
}

export function markInternalTestSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(INTERNAL_TEST_SESSION_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

export function hasInternalTestSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(INTERNAL_TEST_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function parseUtmParams(search?: string): UtmParams {
  const params = readSearchParams(search);
  const result: UtmParams = {};
  for (const key of UTM_PARAM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) result[key] = value;
  }
  return result;
}

export function parseUtmFromUrl(url: string): UtmParams {
  const trimmed = url.trim();
  if (!trimmed) return {};
  try {
    const absolute = trimmed.includes('://')
      ? trimmed
      : trimmed.startsWith('?')
        ? `https://app.local/${trimmed}`
        : `https://app.local${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    return parseUtmParams(new URL(absolute).search);
  } catch {
    const idx = trimmed.indexOf('?');
    if (idx < 0) return {};
    return parseUtmParams(trimmed.slice(idx));
  }
}

export function hasUtmParams(params: UtmParams): boolean {
  return UTM_PARAM_KEYS.some((key) => Boolean(params[key]));
}

function readStoredRecord(): UtmRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UtmRecord;
    if (!parsed?.params || typeof parsed.capturedAt !== 'number') return null;
    if (!hasUtmParams(parsed.params)) return null;
    if (Date.now() - parsed.capturedAt > UTM_ATTRIBUTION_TTL_MS) {
      localStorage.removeItem(UTM_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredRecord(params: UtmParams): void {
  if (typeof window === 'undefined' || !hasUtmParams(params)) return;
  const record: UtmRecord = { params, capturedAt: Date.now() };
  try {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
  try {
    sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(params));
  } catch {
    // ignore
  }
}

export function saveUtmSession(params: UtmParams): void {
  writeStoredRecord(params);
}

/**
 * First-touch：30 天内已有 UTM 则不覆盖。
 * @returns 本次新写入则为 true
 */
export function captureUtmParams(params: UtmParams): boolean {
  if (!hasUtmParams(params)) return false;
  const existing = readStoredRecord();
  if (existing) {
    try {
      sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(existing.params));
    } catch {
      // ignore
    }
    return false;
  }
  writeStoredRecord(params);
  return true;
}

export function captureUtmFromUrl(urlOrSearch: string): boolean {
  return captureUtmParams(parseUtmFromUrl(urlOrSearch));
}

/** Persist UTMs from the App landing URL (e.g. ad / office CTA). */
export function captureAppLandingUtm(): boolean {
  if (typeof window === 'undefined') return false;
  return captureUtmParams(parseUtmParams());
}

export function getUtmSession(): UtmParams {
  if (typeof window === 'undefined') return {};
  try {
    const sessionRaw = sessionStorage.getItem(UTM_SESSION_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as unknown;
      if (parsed && typeof parsed === 'object') {
        const fromSession = parseUtmParams(
          new URLSearchParams(
            Object.entries(parsed as Record<string, string>)
              .filter(([, value]) => typeof value === 'string' && value.trim())
              .map(([key, value]) => [key, value.trim()]),
          ).toString(),
        );
        if (hasUtmParams(fromSession)) return fromSession;
      }
    }
  } catch {
    // fall through
  }
  return readStoredRecord()?.params ?? {};
}

/** Flatten stored UTMs for GA4 event parameters (custom dims). */
export function getUtmEventParams(): Record<string, string> {
  const utm = getUtmSession();
  const out: Record<string, string> = {};
  if (utm.utm_source) out.campaign_source = utm.utm_source;
  if (utm.utm_medium) out.campaign_medium = utm.utm_medium;
  if (utm.utm_campaign) out.campaign_name = utm.utm_campaign;
  if (utm.utm_content) out.campaign_content = utm.utm_content;
  if (utm.utm_term) out.campaign_term = utm.utm_term;
  return out;
}
