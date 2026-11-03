import AsyncStorage from '@react-native-async-storage/async-storage';

const READ_IDS_KEY = '@soulthread_announcement_read_ids';

async function loadReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

async function saveReadIds(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
}

export async function getReadAnnouncementIds(): Promise<Set<string>> {
  return loadReadIds();
}

export async function isAnnouncementRead(id: string): Promise<boolean> {
  const ids = await loadReadIds();
  return ids.has(id);
}

export async function markAnnouncementRead(id: string): Promise<void> {
  if (!id) return;
  const ids = await loadReadIds();
  if (ids.has(id)) return;
  ids.add(id);
  await saveReadIds(ids);
}

/** Drop stale IDs that are no longer in the active set (keeps storage bounded). */
export async function pruneReadAnnouncementIds(activeIds: string[]): Promise<Set<string>> {
  const active = new Set(activeIds);
  const ids = await loadReadIds();
  let changed = false;
  for (const id of [...ids]) {
    if (!active.has(id)) {
      ids.delete(id);
      changed = true;
    }
  }
  if (changed) await saveReadIds(ids);
  return ids;
}

export function countUnreadAnnouncements(items: { id: string }[], readIds: Set<string>): number {
  return items.reduce((n, item) => (readIds.has(item.id) ? n : n + 1), 0);
}
