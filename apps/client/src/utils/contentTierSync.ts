import { updateUser } from '../api/user';
import { loadMatureSettings, saveMatureSettings } from '../engine/flagStore';
import { PRIMARY_SCENE_ID } from '../constants/scene';
import type { UserInfo } from '../types/api';
import { setLocalMatureOptIn } from './matureOptIn';
import { Platform } from 'react-native';

function canUseMature(user: UserInfo): boolean {
  return user.vip?.permissions.mature_mode === true;
}

/** Align local story mature flag with server content_tier (and push local → server when needed). */
export async function syncContentTierWithServer(user: UserInfo | null): Promise<UserInfo | null> {
  if (!user) return null;

  const local = await loadMatureSettings(PRIMARY_SCENE_ID);
  const serverMature = user.content_tier === 'mature';
  const allowed = canUseMature(user);

  if (Platform.OS === 'ios') {
    // App Store: iOS never shows adult content; clear any leftover local R18 flag.
    setLocalMatureOptIn(false);
    if (local.enabled) {
      await saveMatureSettings(PRIMARY_SCENE_ID, false, true);
    }
    return user;
  }

  if (local.enabled && !serverMature && allowed) {
    const updated = await updateUser({ content_tier: 'mature' });
    await saveMatureSettings(PRIMARY_SCENE_ID, true, true);
    setLocalMatureOptIn(true);
    return updated;
  }

  if (serverMature && !local.enabled) {
    await saveMatureSettings(PRIMARY_SCENE_ID, true, true);
    setLocalMatureOptIn(true);
    return user;
  }

  if (local.enabled && !allowed && !serverMature) {
    await saveMatureSettings(PRIMARY_SCENE_ID, false, true);
    setLocalMatureOptIn(false);
  } else {
    setLocalMatureOptIn(local.enabled || (serverMature && allowed));
  }

  return user;
}

/** Push mature preference to server after local toggle (story gate or settings). */
export async function pushContentTierToServer(enabled: boolean): Promise<UserInfo | null> {
  if (Platform.OS === 'ios') {
    setLocalMatureOptIn(false);
    return null;
  }
  setLocalMatureOptIn(enabled);
  const tier = enabled ? 'mature' : 'standard';
  return updateUser({ content_tier: tier });
}
