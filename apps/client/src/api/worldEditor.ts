import { apiFetch, getAuthToken, ApiError } from './client';
import { getApiBase } from '../constants/config';
import { isNativeUploadFile, type ChatImageUploadFile } from '../utils/pickChatImage';
import type {
  CreateWorldResp,
  GetWorldResp,
  SaveWorldDraftResp,
  WorldAIJobItem,
  WorldContentRating,
  WorldDocumentV1,
  WorldEditorItem,
  WorldPublishResp,
  WorldTemplateItem,
} from '../types/worldDocument';

export type CreateWorldBody = {
  code: string;
  title: string;
  visibility?: string;
  content_rating?: WorldContentRating | string;
  /** Prefer blank_playable for C-end Create World (linear dual-level skeleton). */
  starter?: 'blank_playable' | 'empty' | string;
  template_code?: string;
  clone_from_world_id?: string;
  document?: WorldDocumentV1;
};

export type WorldAssetKind = 'cover' | 'background' | 'gallery' | 'figure' | 'map';

export type UploadWorldAssetResp = {
  url: string;
  width: number;
  height: number;
  kind: string;
};

export async function createWorld(body: CreateWorldBody): Promise<CreateWorldResp> {
  return apiFetch<CreateWorldResp>('/worlds', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listOwnedWorlds(limit = 50): Promise<{ worlds: WorldEditorItem[] }> {
  const q = new URLSearchParams({ limit: String(limit) });
  return apiFetch(`/worlds?${q.toString()}`);
}

export async function getWorld(worldId: string): Promise<GetWorldResp> {
  return apiFetch<GetWorldResp>(`/worlds/${encodeURIComponent(worldId)}`);
}

export async function saveWorldDraft(
  worldId: string,
  document: WorldDocumentV1,
  title?: string,
): Promise<SaveWorldDraftResp> {
  return apiFetch<SaveWorldDraftResp>(`/worlds/${encodeURIComponent(worldId)}/draft`, {
    method: 'PUT',
    body: JSON.stringify({
      document,
      ...(title ? { title } : {}),
    }),
  });
}

export async function publishWorld(worldId: string): Promise<WorldPublishResp> {
  return apiFetch<WorldPublishResp>(`/worlds/${encodeURIComponent(worldId)}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function deleteWorld(worldId: string): Promise<void> {
  await apiFetch(`/worlds/${encodeURIComponent(worldId)}`, { method: 'DELETE' });
}

export async function uploadWorldAsset(
  worldId: string,
  kind: WorldAssetKind,
  file: ChatImageUploadFile | Blob | File,
  filename: string,
): Promise<UploadWorldAssetResp> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('kind', kind);
  if (isNativeUploadFile(file)) {
    form.append('file', {
      uri: file.uri,
      name: file.name || filename,
      type: file.type || 'application/octet-stream',
    } as unknown as Blob);
  } else {
    form.append('file', file as Blob, filename);
  }

  const res = await fetch(`${getApiBase()}/worlds/${encodeURIComponent(worldId)}/assets`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (res.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    let code: string | undefined;
    try {
      const errBody = await res.json();
      if (errBody.message) message = errBody.message;
      if (errBody.error_code) code = errBody.error_code;
      else if (errBody.code) code = errBody.code;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as UploadWorldAssetResp;
}

export async function listWorldTemplates(): Promise<{ templates: WorldTemplateItem[] }> {
  return apiFetch('/worlds/templates');
}

export async function startWorldAIGenerate(body: {
  prompt: string;
  title_hint?: string;
  code_hint?: string;
}): Promise<{ job_id: string; status: string }> {
  return apiFetch('/worlds/ai-generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getWorldAIGenerate(jobId: string): Promise<WorldAIJobItem> {
  return apiFetch(`/worlds/ai-generate/${encodeURIComponent(jobId)}`);
}
