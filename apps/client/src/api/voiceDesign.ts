import { apiFetch } from './client';
import type {
  GenerateVoiceDesignReq,
  GenerateVoiceDesignResp,
  SaveVoiceDesignReq,
  SaveVoiceDesignResp,
  UserDesignedVoiceItem,
  UserDesignedVoiceListResp,
  VoiceDesignMetaResp,
  VoiceDesignRecordDetailResp,
  VoiceDesignRecordListResp,
} from '../types/api';

export async function listUserDesignedVoices(): Promise<UserDesignedVoiceListResp> {
  return apiFetch<UserDesignedVoiceListResp>('/voice-design/voices');
}

/** 发布到 Explore（公开） */
export async function publishUserDesignedVoice(voiceId: string): Promise<UserDesignedVoiceItem> {
  return apiFetch<UserDesignedVoiceItem>(`/voice-design/voices/${encodeURIComponent(voiceId)}/publish`, {
    method: 'POST',
  });
}

/** 取消公开 */
export async function unpublishUserDesignedVoice(voiceId: string): Promise<UserDesignedVoiceItem> {
  return apiFetch<UserDesignedVoiceItem>(`/voice-design/voices/${encodeURIComponent(voiceId)}/unpublish`, {
    method: 'POST',
  });
}

/** 重命名我的音色 */
export async function updateUserDesignedVoice(
  voiceId: string,
  body: { title: string },
): Promise<UserDesignedVoiceItem> {
  return apiFetch<UserDesignedVoiceItem>(`/voice-design/voices/${encodeURIComponent(voiceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function getVoiceDesignMeta(): Promise<VoiceDesignMetaResp> {
  return apiFetch<VoiceDesignMetaResp>('/voice-design/meta');
}

export async function generateVoiceDesign(
  body: GenerateVoiceDesignReq,
): Promise<GenerateVoiceDesignResp> {
  return apiFetch<GenerateVoiceDesignResp>('/voice-design/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getVoiceDesignRecord(recordId: string): Promise<VoiceDesignRecordDetailResp> {
  return apiFetch<VoiceDesignRecordDetailResp>(
    `/voice-design/records/${encodeURIComponent(recordId)}`,
  );
}

export async function saveVoiceDesign(
  recordId: string,
  body: SaveVoiceDesignReq,
): Promise<SaveVoiceDesignResp> {
  return apiFetch<SaveVoiceDesignResp>(`/voice-design/records/${recordId}/save`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listVoiceDesignRecords(params?: {
  page?: number;
  limit?: number;
}): Promise<VoiceDesignRecordListResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<VoiceDesignRecordListResp>(`/voice-design/records${query ? `?${query}` : ''}`);
}
