import { apiFetch } from './client';
import type {
  WorldEnterLevelResp,
  WorldGalleryListResp,
  WorldListResp,
  WorldPlayEnterResp,
  WorldPlayMessage,
  WorldPlayProgressResp,
} from '../types/world';

export async function listWorlds(limit = 50): Promise<WorldListResp> {
  const q = new URLSearchParams({ limit: String(limit) });
  return apiFetch<WorldListResp>(`/worlds?${q.toString()}`);
}

export async function enterWorld(worldId: string): Promise<WorldPlayEnterResp> {
  return apiFetch<WorldPlayEnterResp>(`/worlds/${worldId}/play/enter`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function setWorldPlayerCast(
  worldId: string,
  playerCastId: string,
  opts?: { forceReset?: boolean },
): Promise<{ progress: import('../types/world').WorldProgressView }> {
  return apiFetch(`/worlds/${worldId}/play/player-cast`, {
    method: 'POST',
    body: JSON.stringify({
      player_cast_id: playerCastId,
      force_reset: !!opts?.forceReset,
    }),
  });
}

export async function getWorldProgress(worldId: string): Promise<WorldPlayProgressResp> {
  return apiFetch<WorldPlayProgressResp>(`/worlds/${worldId}/play/progress`);
}

export async function enterWorldLevel(
  worldId: string,
  levelCode: string,
  opts?: { forceNew?: boolean },
): Promise<WorldEnterLevelResp> {
  return apiFetch<WorldEnterLevelResp>(`/worlds/${worldId}/play/levels/${levelCode}/enter`, {
    method: 'POST',
    body: JSON.stringify({ force_new: !!opts?.forceNew }),
  });
}

export async function getWorldMessages(
  worldId: string,
  sessionId: string,
  opts?: { limit?: number },
): Promise<{ world_session_id: string; messages: WorldPlayMessage[] }> {
  const q = new URLSearchParams({ limit: String(opts?.limit ?? 80) });
  return apiFetch(`/worlds/${worldId}/play/sessions/${sessionId}/messages?${q.toString()}`);
}

export async function interruptWorld(worldId: string, worldSessionId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/worlds/${worldId}/play/interrupt`, {
    method: 'POST',
    body: JSON.stringify({ world_session_id: worldSessionId }),
  });
}

export async function getWorldGallery(worldId: string): Promise<WorldGalleryListResp> {
  return apiFetch<WorldGalleryListResp>(`/worlds/${worldId}/gallery`);
}

export type WorldCheckpointItem = {
  code: string;
  level_code: string;
  scene_code: string;
  beat_id: string;
  created_at: number;
  manual?: boolean;
};

export async function listWorldCheckpoints(worldId: string): Promise<{ checkpoints: WorldCheckpointItem[] }> {
  return apiFetch(`/worlds/${worldId}/play/checkpoints`);
}

export async function deleteWorldCheckpoint(
  worldId: string,
  checkpointCode: string,
): Promise<{ ok: boolean; code: string }> {
  return apiFetch(
    `/worlds/${worldId}/play/checkpoints/${encodeURIComponent(checkpointCode)}`,
    { method: 'DELETE' },
  );
}

export async function saveWorldCheckpoint(
  worldId: string,
  worldSessionId: string,
): Promise<{ checkpoint: WorldCheckpointItem }> {
  return apiFetch(`/worlds/${worldId}/play/save`, {
    method: 'POST',
    body: JSON.stringify({ world_session_id: worldSessionId }),
  });
}

export async function rollbackWorld(
  worldId: string,
  checkpointCode: string,
  worldSessionId?: string,
): Promise<{
  progress: import('../types/world').WorldProgressView;
  world_session_id?: string;
  current_beat?: string;
}> {
  return apiFetch(`/worlds/${worldId}/play/rollback`, {
    method: 'POST',
    body: JSON.stringify({
      checkpoint_code: checkpointCode,
      world_session_id: worldSessionId,
    }),
  });
}
