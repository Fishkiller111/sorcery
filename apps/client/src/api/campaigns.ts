import { apiFetch } from './client';
import type {
  CampaignClaimResp,
  CampaignDetailResp,
  CampaignListResp,
  CampaignTaskBoardResp,
} from '../types/api';

/** 进行中且有 Banner 的活动（Home Banner；未上架则空列表） */
export function fetchLiveCampaigns() {
  return apiFetch<CampaignListResp>('/activities');
}

/** 活动详情：解锁进度 + 积分任务 */
export function fetchCampaignDetail(id: string) {
  return apiFetch<CampaignDetailResp>(`/activities/${encodeURIComponent(id)}`);
}

/** 已开始活动的任务进度（未开始不返回） */
export function fetchCampaignTaskBoard() {
  return apiFetch<CampaignTaskBoardResp>('/activities/task-board');
}

/** 领取活动积分任务 */
export function claimCampaignTask(taskId: string) {
  return apiFetch<CampaignClaimResp>(
    `/activities/tasks/${encodeURIComponent(taskId)}/claim`,
    { method: 'POST' },
  );
}
