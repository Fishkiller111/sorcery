import { apiFetch, ApiError, getAuthToken } from './client';
import { getApiBase } from '../constants/config';
import {
  isNativeUploadFile,
  type ChatImageUploadFile,
} from '../utils/pickChatImage';
import type {
  GetChatMessagesReq,
  GetChatMessagesResp,
  GetInspirationRepliesReq,
  InspirationRepliesResp,
  ChatQuotaResp,
  VoiceQuotaResp,
  InterruptReq,
  InterruptResp,
  ChatStateResp,
  GetChatAffectionReq,
  GetChatAffectionResp,
  ASRReq,
  ASRResp,
  UploadChatImageResp,
  CreateChatSessionReq,
  CreateChatSessionResp,
  ListChatSessionsResp,
  ListChatConversationsReq,
  ListChatConversationsResp,
  DeleteChatSessionResp,
  RequestPhotoReq,
  SendMediaResp,
} from '../types/api';

export async function getMessages(
  params: { roleId: string } | { sessionId: string },
): Promise<GetChatMessagesResp> {
  const query = new URLSearchParams(
    'roleId' in params
      ? ({ role_id: params.roleId } satisfies GetChatMessagesReq)
      : ({ session_id: params.sessionId } satisfies GetChatMessagesReq),
  );
  return apiFetch<GetChatMessagesResp>(`/chat/messages?${query.toString()}`);
}

/** 按角色列出历史会话（含预览） */
export async function listChatSessions(roleId: string): Promise<ListChatSessionsResp> {
  const query = new URLSearchParams({ role_id: roleId });
  return apiFetch<ListChatSessionsResp>(`/chat/sessions?${query.toString()}`);
}

/** 当前用户跨所有 Agent 的会话列表（左栏历史）→ GET /chat/conversations */
export async function listChatConversations(
  params?: ListChatConversationsReq,
): Promise<ListChatConversationsResp> {
  const query = new URLSearchParams();
  if (params?.page != null) query.set('page', String(params.page));
  if (params?.limit != null) query.set('limit', String(params.limit));
  if (params?.q?.trim()) query.set('q', params.q.trim());
  const qs = query.toString();
  return apiFetch<ListChatConversationsResp>(`/chat/conversations${qs ? `?${qs}` : ''}`);
}

/** 结束当前会话并新建（后端固定 inherit_profile=false） */
export async function createChatSession(roleId: string): Promise<CreateChatSessionResp> {
  return apiFetch<CreateChatSessionResp>('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({
      role_id: roleId,
    } satisfies CreateChatSessionReq),
  });
}

/** 硬删除会话（消息 / 向量记忆 / 会话行） */
export async function deleteChatSession(sessionId: string): Promise<DeleteChatSessionResp> {
  return apiFetch<DeleteChatSessionResp>(`/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
}

export async function getInspirationReplies(
  sessionId: string,
  roleId: string,
): Promise<InspirationRepliesResp> {
  const query = new URLSearchParams({
    session_id: sessionId,
    role_id: roleId,
  } satisfies GetInspirationRepliesReq);
  return apiFetch<InspirationRepliesResp>(`/chat/inspiration-replies?${query.toString()}`);
}

// 用户发消息 / 触发 Event 请使用 chatStream.ts 中的 sendMessageStream / triggerEventStream（SSE）

export async function getChatQuota(): Promise<ChatQuotaResp> {
  return apiFetch<ChatQuotaResp>('/chat/quota');
}

export async function getVoiceQuota(): Promise<VoiceQuotaResp> {
  return apiFetch<VoiceQuotaResp>('/chat/voice-quota');
}

export async function interrupt(sessionId: string): Promise<InterruptResp> {
  return apiFetch<InterruptResp>('/chat/interrupt', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId } satisfies InterruptReq),
  });
}

export async function getChatState(
  sessionId: string,
  roleId: string,
): Promise<ChatStateResp> {
  const query = new URLSearchParams({ session_id: sessionId, role_id: roleId });
  return apiFetch<ChatStateResp>(`/chat/state?${query.toString()}`);
}

/** Fuzzy affection only — no raw points. Prefer role_id when available. */
export async function getChatAffection(params: {
  roleId?: string;
  sessionId?: string;
}): Promise<GetChatAffectionResp> {
  const query = new URLSearchParams(
    {
      ...(params.roleId ? { role_id: params.roleId } : {}),
      ...(params.sessionId ? { session_id: params.sessionId } : {}),
    } satisfies GetChatAffectionReq,
  );
  return apiFetch<GetChatAffectionResp>(`/chat/affection?${query.toString()}`);
}

export async function asr(req: ASRReq): Promise<ASRResp> {
  return apiFetch<ASRResp>('/chat/asr', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function uploadChatImage(
  file: ChatImageUploadFile,
  filename: string,
): Promise<UploadChatImageResp> {
  const token = getAuthToken();
  const form = new FormData();
  if (isNativeUploadFile(file)) {
    // React Native multipart: must pass uri-shaped object, not a Blob.
    form.append('file', {
      uri: file.uri,
      name: file.name || filename,
      type: file.type || 'image/jpeg',
    } as unknown as Blob);
  } else {
    form.append('file', file as Blob, filename);
  }

  const res = await fetch(`${getApiBase()}/chat/images`, {
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

  return (await res.json()) as UploadChatImageResp;
}

export async function requestPhoto(body: RequestPhotoReq): Promise<SendMediaResp> {
  return apiFetch<SendMediaResp>('/chat/request-photo', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
