import { apiFetch } from './client';
import type {
  VoiceCatalogListResp,
  VoiceCatalogItem,
  VoiceCatalogProvider,
  VoicePreviewReq,
  VoicePreviewResp,
} from '../types/api';

export type VoiceVisibility = 'public' | 'private';

/**
 * 分页拉取音色目录。
 * - 默认：平台目录 + 公开音色 + 自己的音色（创建 Agent）
 * - `visibility=public`：仅公开音色（Explore）
 */
export async function listVoices(params?: {
  page?: number;
  page_size?: number;
  language?: string;
  provider?: VoiceCatalogProvider;
  visibility?: VoiceVisibility;
}): Promise<VoiceCatalogListResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  if (params?.language?.trim()) qs.set('language', params.language.trim());
  if (params?.provider) qs.set('provider', String(params.provider));
  if (params?.visibility) qs.set('visibility', params.visibility);
  const query = qs.toString();
  return apiFetch<VoiceCatalogListResp>(`/voices${query ? `?${query}` : ''}`);
}

/**
 * 自动翻页，合并全部音色条目。
 * 优先按 language 筛选；无结果时回退到不带 language 的列表。
 */
export async function listAllVoices(opts?: {
  language?: string;
  provider?: VoiceCatalogProvider;
  visibility?: VoiceVisibility;
  pageSize?: number;
}): Promise<VoiceCatalogItem[]> {
  const pageSize = opts?.pageSize ?? 100;
  const fetchPages = async (language?: string) => {
    const all: VoiceCatalogItem[] = [];
    let page = 1;
    while (true) {
      const resp = await listVoices({
        page,
        page_size: pageSize,
        language,
        provider: opts?.provider,
        visibility: opts?.visibility,
      });
      all.push(...resp.items);
      if (!resp.has_more || resp.items.length === 0) break;
      page += 1;
    }
    return all;
  };

  if (opts?.language) {
    const filtered = await fetchPages(opts.language);
    if (filtered.length > 0) return filtered;
  }
  return fetchPages();
}

/** 合成并返回指定音色的短试听音频（base64）；支持平台/公开/自有 designed voice。 */
export async function previewVoice(
  voiceId: string,
  language?: string,
): Promise<VoicePreviewResp> {
  const body: VoicePreviewReq = { voice_id: voiceId };
  if (language?.trim()) body.language = language.trim();
  return apiFetch<VoicePreviewResp>('/voices/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
