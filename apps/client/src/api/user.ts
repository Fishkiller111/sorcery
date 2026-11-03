import { getApiBase } from '../constants/config';
import { apiFetch, ApiError, getAuthToken } from './client';
import type { UpdateUserReq, UploadUserAvatarResp, UserInfo } from '../types/api';
import type { ChatImageUploadFile } from '../utils/pickChatImage';
import { isNativeUploadFile } from '../utils/pickChatImage';

export async function getMe(): Promise<UserInfo> {
  return apiFetch<UserInfo>('/users/me');
}

export async function sendBindEmailCode(email: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/users/me/email-bind/send-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function bindEmail(email: string, code: string): Promise<UserInfo> {
  const resp = await apiFetch<{ user: UserInfo }>('/users/me/email-bind', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  return resp.user;
}

export async function updateUser(req: UpdateUserReq): Promise<UserInfo> {
  return apiFetch<UserInfo>('/users/me', {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

/** Schedule account hard-delete after the server cooling-off period (30 days). */
export async function scheduleAccountDeletion(): Promise<UserInfo> {
  return apiFetch<UserInfo>('/users/me/deletion', { method: 'POST' });
}

/** Cancel a pending account deletion during the cooling-off period. */
export async function cancelAccountDeletion(): Promise<UserInfo> {
  return apiFetch<UserInfo>('/users/me/deletion', { method: 'DELETE' });
}

export async function uploadUserAvatar(
  file: ChatImageUploadFile | Blob | File,
  filename: string,
): Promise<UploadUserAvatarResp> {
  const token = getAuthToken();
  const form = new FormData();
  if (isNativeUploadFile(file)) {
    form.append('file', {
      uri: file.uri,
      name: file.name || filename,
      type: file.type || 'application/octet-stream',
    } as unknown as Blob);
  } else {
    form.append('file', file as Blob, filename);
  }

  const res = await fetch(`${getApiBase()}/users/me/avatar`, {
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

  return res.json() as Promise<UploadUserAvatarResp>;
}
