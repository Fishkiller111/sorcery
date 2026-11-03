import { apiFetch, ApiError, getAuthToken } from './client';
import { getApiBase } from '../constants/config';
import type {
  AiImageGenMetaResp,
  AiImageGenRecordItem,
  AiImageGenRecordListResp,
  GenerateAiImageReq,
  GenerateAiImageResp,
  UploadAiImageGenReferenceResp,
} from '../types/api';
import { isNativeUploadFile, type ChatImageUploadFile } from '../utils/pickChatImage';

export async function getAiImageGenMeta(lang?: string): Promise<AiImageGenMetaResp> {
  const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
  return apiFetch<AiImageGenMetaResp>(`/ai-image-gen/meta${qs}`);
}

export async function generateAiImage(body: GenerateAiImageReq): Promise<GenerateAiImageResp> {
  return apiFetch<GenerateAiImageResp>('/ai-image-gen/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function uploadAiImageGenReference(
  file: ChatImageUploadFile,
  filename: string,
): Promise<UploadAiImageGenReferenceResp> {
  const token = getAuthToken();
  const form = new FormData();
  if (isNativeUploadFile(file)) {
    form.append('file', {
      uri: file.uri,
      name: file.name || filename,
      type: file.type || 'image/jpeg',
    } as unknown as Blob);
  } else {
    form.append('file', file as Blob, filename);
  }

  const res = await fetch(`${getApiBase()}/ai-image-gen/upload-reference`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (res.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  const data = (await res.json().catch(() => ({}))) as {
    image_url?: string;
    width?: number;
    height?: number;
    message?: string;
    msg?: string;
    code?: string;
  };
  if (!res.ok) {
    throw new ApiError(data?.message || data?.msg || 'Upload failed', res.status, data?.code);
  }
  return {
    image_url: data.image_url || '',
    width: data.width ?? 0,
    height: data.height ?? 0,
  };
}

export async function listAiImageGenRecords(params?: {
  page?: number;
  limit?: number;
}): Promise<AiImageGenRecordListResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<AiImageGenRecordListResp>(`/ai-image-gen/records${query ? `?${query}` : ''}`);
}

export async function getAiImageGenRecord(recordId: string): Promise<AiImageGenRecordItem> {
  return apiFetch<AiImageGenRecordItem>(`/ai-image-gen/records/${recordId}`);
}
