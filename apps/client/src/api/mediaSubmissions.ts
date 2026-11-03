import { apiFetch } from './client';
import type {
  ApproveRoleMediaSubmissionReq,
  RejectRoleMediaSubmissionReq,
  RoleMediaSubmissionActionResp,
  RoleMediaSubmissionItem,
  RoleMediaSubmissionListResp,
  SubmitAiImageToRoleMediaResp,
  UserNotificationListResp,
  UserNotificationUnreadCountResp,
} from '../types/api';

export async function submitAiImageToRoleMedia(
  recordId: string,
  roleId: string,
): Promise<SubmitAiImageToRoleMediaResp> {
  return apiFetch<SubmitAiImageToRoleMediaResp>(
    `/ai-image-gen/records/${encodeURIComponent(recordId)}/submit-media`,
    {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId }),
    },
  );
}

export async function listIncomingMediaSubmissions(params?: {
  page?: number;
  limit?: number;
}): Promise<RoleMediaSubmissionListResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return apiFetch<RoleMediaSubmissionListResp>(`/media-submissions/incoming${q ? `?${q}` : ''}`);
}

export async function getMediaSubmission(submissionId: string): Promise<RoleMediaSubmissionItem> {
  return apiFetch<RoleMediaSubmissionItem>(
    `/media-submissions/${encodeURIComponent(submissionId)}`,
  );
}

export async function approveMediaSubmission(
  submissionId: string,
  body: ApproveRoleMediaSubmissionReq,
): Promise<RoleMediaSubmissionActionResp> {
  return apiFetch<RoleMediaSubmissionActionResp>(
    `/media-submissions/${encodeURIComponent(submissionId)}/approve`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function rejectMediaSubmission(
  submissionId: string,
  body: RejectRoleMediaSubmissionReq,
): Promise<RoleMediaSubmissionActionResp> {
  return apiFetch<RoleMediaSubmissionActionResp>(
    `/media-submissions/${encodeURIComponent(submissionId)}/reject`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function listUserNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<UserNotificationListResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return apiFetch<UserNotificationListResp>(`/notifications${q ? `?${q}` : ''}`);
}

export async function fetchUserNotificationUnreadCount(): Promise<UserNotificationUnreadCountResp> {
  return apiFetch<UserNotificationUnreadCountResp>('/notifications/unread-count');
}

export async function markUserNotificationRead(notificationId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'POST' },
  );
}

export async function markAllUserNotificationsRead(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'POST' });
}
