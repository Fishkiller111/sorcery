import AsyncStorage from '@react-native-async-storage/async-storage';

/** 与后端 affiliate.NormalizeAffCode / ValidateAffCodeFormat 对齐 */
const STORAGE_KEY = '@soulthread/affiliate_aff';
/** 30 天归因窗（与联盟条款一致） */
export const AFF_ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type AffRecord = {
  code: string;
  capturedAt: number;
};

/** 进程内缓存，避免 AsyncStorage 异步未完成时注册丢码 */
let memoryRecord: AffRecord | null = null;

export function normalizeAffCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidAffCode(code: string): boolean {
  if (code.length < 3 || code.length > 64) return false;
  return /^[a-z0-9_-]+$/.test(code);
}

export function parseAffFromSearch(search: string): string | null {
  const q = search.startsWith('?') ? search.slice(1) : search;
  try {
    const raw = new URLSearchParams(q).get('aff')?.trim() ?? '';
    const code = normalizeAffCode(raw);
    return isValidAffCode(code) ? code : null;
  } catch {
    return null;
  }
}

/** 从完整 URL、path+query 或纯 query 解析 aff */
export function parseAffFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('?') ||
    (!trimmed.includes('://') && !trimmed.startsWith('/') && trimmed.includes('='))
  ) {
    return parseAffFromSearch(trimmed);
  }
  try {
    const absolute = trimmed.includes('://')
      ? trimmed
      : `https://app.local${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    return parseAffFromSearch(new URL(absolute).search);
  } catch {
    const idx = trimmed.indexOf('?');
    if (idx < 0) return null;
    return parseAffFromSearch(trimmed.slice(idx));
  }
}

function isFresh(record: AffRecord): boolean {
  return Date.now() - record.capturedAt <= AFF_ATTRIBUTION_TTL_MS;
}

async function readRecord(): Promise<AffRecord | null> {
  if (memoryRecord && isFresh(memoryRecord)) return memoryRecord;
  if (memoryRecord && !isFresh(memoryRecord)) memoryRecord = null;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffRecord;
    if (!parsed?.code || typeof parsed.capturedAt !== 'number') return null;
    const code = normalizeAffCode(parsed.code);
    if (!isValidAffCode(code)) return null;
    const record = { code, capturedAt: parsed.capturedAt };
    if (!isFresh(record)) {
      await clearPendingAffCode();
      return null;
    }
    memoryRecord = record;
    return record;
  } catch {
    return null;
  }
}

async function writeRecord(code: string): Promise<void> {
  const record: AffRecord = { code, capturedAt: Date.now() };
  memoryRecord = record;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

/** 当前未过期的 pending aff；过期则清掉并返回 null */
export async function getPendingAffCode(): Promise<string | null> {
  const record = await readRecord();
  return record?.code ?? null;
}

export async function clearPendingAffCode(): Promise<void> {
  memoryRecord = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * First-touch：窗口内已有有效码则保留旧码，不覆盖。
 * @returns 最终 pending 的码（含已存在的）
 */
export async function captureAffCode(raw: string): Promise<string | null> {
  const code = normalizeAffCode(raw);
  if (!isValidAffCode(code)) return null;
  const existing = await getPendingAffCode();
  if (existing) return existing;
  await writeRecord(code);
  return code;
}

export async function captureAffFromUrl(urlOrSearch: string): Promise<string | null> {
  const code = parseAffFromUrl(urlOrSearch);
  if (!code) return null;
  return captureAffCode(code);
}
