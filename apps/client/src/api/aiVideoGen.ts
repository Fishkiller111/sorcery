/**
 * AI 生视频 API 客户端
 * 全部走 Soulthread 后端 /ai-video-gen/*，Gateway API Key 由后端持有。
 */
import { apiFetch, ApiError, getAuthToken } from './client';
import { getApiBase } from '../constants/config';
import type {
  AiVideoGenMetaResp,
  AiVideoGenRecordItem,
  AiVideoGenRecordListResp,
  GenerateAiVideoReq,
  GenerateAiVideoResp,
  UploadAiVideoGenReferenceResp,
} from '../types/api';
import { isNativeUploadFile, type ChatImageUploadFile } from '../utils/pickChatImage';

/**
 * 拉取生视频 meta：开关、余额、可用模型、时长档、H3 分辨率预设、积分单价等。
 */
export async function getAiVideoGenMeta(): Promise<AiVideoGenMetaResp> {
  return apiFetch<AiVideoGenMetaResp>('/ai-video-gen/meta');
}

/**
 * 提交异步生视频任务。
 * 后端预扣积分后转发 Gateway `POST /v1/videos`，返回 record_id 供轮询。
 */
export async function generateAiVideo(body: GenerateAiVideoReq): Promise<GenerateAiVideoResp> {
  return apiFetch<GenerateAiVideoResp>('/ai-video-gen/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * 上传参考图 / 首帧 / 结束帧。
 * Gateway 不接受 multipart，必须先落到本站 `/static`，再把返回的 image_url 传给 generate。
 */
export async function uploadAiVideoGenReference(
  file: ChatImageUploadFile,
  filename: string,
): Promise<UploadAiVideoGenReferenceResp> {
  const token = getAuthToken();
  const form = new FormData();

  // Native 用 uri 部件；Web 用 Blob/File
  if (isNativeUploadFile(file)) {
    form.append('file', {
      uri: file.uri,
      name: file.name || filename,
      type: file.type || 'image/jpeg',
    } as unknown as Blob);
  } else {
    form.append('file', file as Blob, filename);
  }

  // multipart 不能走默认 apiFetch JSON body，需原生 fetch
  const res = await fetch(`${getApiBase()}/ai-video-gen/upload-reference`, {
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

/**
 * 分页拉取当前用户的生视频历史记录。
 */
export async function listAiVideoGenRecords(params?: {
  page?: number;
  limit?: number;
}): Promise<AiVideoGenRecordListResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<AiVideoGenRecordListResp>(`/ai-video-gen/records${query ? `?${query}` : ''}`);
}

/**
 * 查询单条生视频记录（进度 / 成片 URL / 错误信息）。
 */
export async function getAiVideoGenRecord(recordId: string): Promise<AiVideoGenRecordItem> {
  return apiFetch<AiVideoGenRecordItem>(`/ai-video-gen/records/${recordId}`);
}

/**
 * 删除当前用户的一条生视频历史记录。
 */
export async function deleteAiVideoGenRecord(recordId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/ai-video-gen/records/${recordId}`, {
    method: 'DELETE',
  });
}
