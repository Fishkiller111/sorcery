import AsyncStorage from '@react-native-async-storage/async-storage';

const FLAG_PREFIX = '@soulthread_scene_';

export async function loadFlags(sceneId: string): Promise<Record<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(`${FLAG_PREFIX}${sceneId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveFlags(sceneId: string, flags: Record<string, boolean>): Promise<void> {
  try {
    await AsyncStorage.setItem(`${FLAG_PREFIX}${sceneId}`, JSON.stringify(flags));
  } catch {
    // ignore persistence errors in demo
  }
}

export async function loadState<T>(sceneId: string, key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(`${FLAG_PREFIX}${sceneId}_${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveState<T>(sceneId: string, key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`${FLAG_PREFIX}${sceneId}_${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export async function clearScene(sceneId: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const sceneKeys = keys.filter(k => k.startsWith(`${FLAG_PREFIX}${sceneId}`));
  await AsyncStorage.multiRemove(sceneKeys);
}

export async function loadMatureSettings(sceneId: string): Promise<{ enabled: boolean; shown: boolean }> {
  const enabled = await loadState<boolean>(sceneId, 'matureEnabled', false);
  const shown = await loadState<boolean>(sceneId, 'matureGateShown', false);
  return { enabled, shown };
}

export async function saveMatureSettings(sceneId: string, enabled: boolean, shown: boolean): Promise<void> {
  await saveState(sceneId, 'matureEnabled', enabled);
  await saveState(sceneId, 'matureGateShown', shown);
}
