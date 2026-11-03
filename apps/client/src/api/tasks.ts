import { apiFetch } from './client';
import type {
  ClaimActivityMilestoneResp,
  TaskClaimListResp,
  TaskClaimResp,
  TaskDetailResp,
  TaskDiscordAuthorizeResp,
  TaskListResp,
} from '../types/api';

export async function listTasks(): Promise<TaskListResp> {
  return apiFetch<TaskListResp>('/tasks');
}

export async function getTask(taskId: string): Promise<TaskDetailResp> {
  return apiFetch<TaskDetailResp>(`/tasks/${encodeURIComponent(taskId)}`);
}

export async function claimTask(taskId: string): Promise<TaskClaimResp> {
  return apiFetch<TaskClaimResp>(`/tasks/${encodeURIComponent(taskId)}/claim`, {
    method: 'POST',
  });
}

export async function ackTask(taskId: string): Promise<void> {
  await apiFetch<{ status: string }>(`/tasks/${encodeURIComponent(taskId)}/ack`, {
    method: 'POST',
  });
}

export async function reportTaskShare(taskId: string): Promise<void> {
  await apiFetch<{ status: string }>(`/tasks/${encodeURIComponent(taskId)}/events/share`, {
    method: 'POST',
  });
}

export async function getTaskDiscordAuthorize(
  taskId: string,
  returnUrl?: string,
): Promise<TaskDiscordAuthorizeResp> {
  const q = returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : '';
  return apiFetch<TaskDiscordAuthorizeResp>(
    `/tasks/${encodeURIComponent(taskId)}/discord/authorize${q}`,
  );
}

export async function claimActivityMilestone(threshold: number): Promise<ClaimActivityMilestoneResp> {
  return apiFetch<ClaimActivityMilestoneResp>('/tasks/activity-milestones/claim', {
    method: 'POST',
    body: JSON.stringify({ threshold }),
  });
}

export async function listTaskClaims(page = 1, limit = 20): Promise<TaskClaimListResp> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch<TaskClaimListResp>(`/tasks/claims?${q.toString()}`);
}
