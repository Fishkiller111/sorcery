import AsyncStorage from '@react-native-async-storage/async-storage';

type DismissTodayRecord = { date: string; id?: string; ids?: string[] };

export function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function recordIds(record: DismissTodayRecord): string[] {
  const ids = new Set<string>();
  if (record.id) ids.add(record.id);
  for (const id of record.ids ?? []) {
    if (id) ids.add(id);
  }
  return [...ids];
}

async function readTodayRecord(storageKey: string): Promise<DismissTodayRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;
    const record = JSON.parse(raw) as DismissTodayRecord;
    if (record.date !== todayKey()) return null;
    return record;
  } catch {
    return null;
  }
}

export async function listDismissedTodayIds(storageKey: string): Promise<string[]> {
  const record = await readTodayRecord(storageKey);
  return record ? recordIds(record) : [];
}

export async function isDismissedToday(storageKey: string, id?: string): Promise<boolean> {
  const record = await readTodayRecord(storageKey);
  if (!record) return false;
  if (id == null) return true;
  return recordIds(record).includes(id);
}

export async function saveDismissToday(storageKey: string, id?: string): Promise<void> {
  if (id != null) {
    await saveDismissTodayIds(storageKey, [id]);
    return;
  }
  await AsyncStorage.setItem(storageKey, JSON.stringify({ date: todayKey() }));
}

export async function saveDismissTodayIds(storageKey: string, ids: string[]): Promise<void> {
  const incoming = ids.map((id) => id.trim()).filter(Boolean);
  const merged = [...new Set([...(await listDismissedTodayIds(storageKey)), ...incoming])];
  const record: DismissTodayRecord = {
    date: todayKey(),
    id: merged[0],
    ids: merged,
  };
  await AsyncStorage.setItem(storageKey, JSON.stringify(record));
}

export const VOICE_QUOTA_DISMISS_TODAY_KEY = '@soulthread_voice_quota_dismiss_today';
