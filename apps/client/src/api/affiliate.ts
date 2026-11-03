import { apiFetch, ApiError, getAuthToken, applyClientHeaders } from './client';
import { getApiBase } from '../constants/config';
import { getApiAcceptLanguage } from './apiLang';
import type { AffiliateInviteeListResp, AffiliateMeResp } from '../types/api';
import { isNativeUploadFile, type ChatImageUploadFile } from '../utils/pickChatImage';

export type AffiliateApplyChannel = 'youtube' | 'x' | 'tg' | 'reddit' | 'discord';

export type SubmitAffiliateApplicationBody = {
  email: string;
  telegram_link: string;
  whatsapp: string;
  channels: AffiliateApplyChannel[];
  channel_links?: Partial<Record<AffiliateApplyChannel, string>>;
  working_conditions: string;
  applicant_note?: string;
  proof_image_urls?: string[];
  cooperation_model?: 'channel' | 'likeness';
  source?: string;
  locale?: string;
};

export type SubmitAffiliateApplicationResp = {
  application_id: string;
  status: string;
};

export type UploadAffiliateProofResp = {
  image_url: string;
  width: number;
  height: number;
};

export async function getAffiliateMe(): Promise<AffiliateMeResp> {
  return apiFetch<AffiliateMeResp>('/affiliate/me');
}

export async function listAffiliateInvitees(page = 1, limit = 20): Promise<AffiliateInviteeListResp> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch<AffiliateInviteeListResp>(`/affiliate/invitees?${q.toString()}`);
}

export async function submitAffiliateApplication(
  body: SubmitAffiliateApplicationBody,
): Promise<SubmitAffiliateApplicationResp> {
  return apiFetch<SubmitAffiliateApplicationResp>('/affiliate/apply', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function uploadAffiliateProof(
  file: ChatImageUploadFile,
  filename: string,
): Promise<UploadAffiliateProofResp> {
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

  const headers: Record<string, string> = {
    'Accept-Language': getApiAcceptLanguage(),
  };
  applyClientHeaders(headers);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBase()}/affiliate/apply/upload-proof`, {
    method: 'POST',
    headers,
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as {
    image_url?: string;
    width?: number;
    height?: number;
    message?: string;
    error_message?: string;
    code?: string;
    error_code?: string;
  };
  if (!res.ok) {
    throw new ApiError(
      data?.error_message || data?.message || 'Upload failed',
      res.status,
      data?.error_code || data?.code,
    );
  }
  return {
    image_url: data.image_url || '',
    width: data.width ?? 0,
    height: data.height ?? 0,
  };
}
