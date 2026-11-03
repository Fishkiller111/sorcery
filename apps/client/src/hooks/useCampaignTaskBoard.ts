import { useCallback, useEffect, useState } from 'react';
import {
  claimCampaignTask,
  fetchCampaignDetail,
  fetchCampaignTaskBoard,
  fetchLiveCampaigns,
} from '../api/campaigns';
import type {
  CampaignDetailResp,
  CampaignListItem,
  CampaignTaskBoardItem,
  CampaignTaskProgressItem,
} from '../types/api';
import { Message } from '../components/ui/Message';
import { formatApiError } from '../utils/apiError';

export type CampaignRoleProgressView = {
  roleId: string;
  roleName: string;
  avatarUrl?: string;
  unlockedCount: number;
  mediaTotal: number;
  claimedTasks: number;
  taskTotal: number;
  tasks: CampaignTaskProgressItem[];
};

export type CampaignProgressView = {
  campaignId: string;
  name: string;
  unlockedCount: number;
  mediaTotal: number;
  claimedTasks: number;
  taskTotal: number;
  roles: CampaignRoleProgressView[];
};

function uniqueIds(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const id of group) {
      const trimmed = id.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

function isClaimed(task: CampaignTaskProgressItem): boolean {
  return task.status === 'claimed';
}

function composeRole(
  roleId: string,
  roleName: string,
  avatarUrl: string | undefined,
  tasks: CampaignTaskProgressItem[],
  unlockedCount: number,
  mediaTotal: number,
): CampaignRoleProgressView {
  const claimedTasks = tasks.filter(isClaimed).length;
  return {
    roleId,
    roleName,
    avatarUrl,
    unlockedCount,
    mediaTotal,
    claimedTasks,
    taskTotal: tasks.length,
    tasks,
  };
}

function composeBoard(
  campaignId: string,
  live: CampaignListItem | undefined,
  board: CampaignTaskBoardItem | undefined,
  detail: CampaignDetailResp | null,
): CampaignProgressView {
  const displayName = detail?.name || board?.name || live?.name || '';
  const tasks = detail?.tasks ?? board?.tasks ?? [];
  const rolesFromDetail = detail?.roles ?? [];
  const rolesFromBoard = board?.roles ?? [];
  const media = detail?.media ?? [];

  const roleOrder: { roleId: string; roleName: string; avatarUrl?: string }[] = [];
  const seen = new Set<string>();
  const pushRole = (roleId: string, roleName: string, avatarUrl?: string) => {
    const id = roleId.trim() || '_';
    if (seen.has(id)) return;
    seen.add(id);
    roleOrder.push({ roleId: id, roleName, avatarUrl });
  };
  for (const role of rolesFromDetail) {
    pushRole(role.role_id, role.role_name, role.avatar_url || role.figure_url);
  }
  for (const role of rolesFromBoard) {
    pushRole(role.role_id, role.role_name);
  }
  for (const task of tasks) {
    pushRole(task.role_id, '');
  }
  for (const item of media) {
    pushRole(item.role_id, '');
  }

  const roles = roleOrder.map((role) => {
    const roleTasks = tasks.filter((task) => (task.role_id || '_') === role.roleId);
    const roleMedia = media.filter((item) => (item.role_id || '_') === role.roleId);
    return composeRole(
      role.roleId,
      role.roleName,
      role.avatarUrl,
      roleTasks,
      roleMedia.filter((item) => item.unlocked).length,
      roleMedia.length,
    );
  });

  return {
    campaignId,
    name: displayName,
    unlockedCount: roles.reduce((sum, role) => sum + role.unlockedCount, 0),
    mediaTotal: roles.reduce((sum, role) => sum + role.mediaTotal, 0),
    claimedTasks: roles.reduce((sum, role) => sum + role.claimedTasks, 0),
    taskTotal: roles.reduce((sum, role) => sum + role.taskTotal, 0),
    roles,
  };
}

async function safeLiveCampaigns(): Promise<CampaignListItem[]> {
  try {
    const resp = await fetchLiveCampaigns();
    return resp.items ?? [];
  } catch {
    return [];
  }
}

async function safeTaskBoards(): Promise<CampaignTaskBoardItem[]> {
  try {
    const resp = await fetchCampaignTaskBoard();
    return resp.items ?? [];
  } catch {
    return [];
  }
}

async function safeCampaignDetail(id: string): Promise<CampaignDetailResp | null> {
  try {
    return await fetchCampaignDetail(id);
  } catch {
    return null;
  }
}

/** 进行中的活动进度：首页 Banner 或任务板任一有数据就出 Tab。 */
export function useCampaignTaskBoard(visible: boolean, t: (key: string) => string) {
  const [loading, setLoading] = useState(false);
  const [boards, setBoards] = useState<CampaignProgressView[]>([]);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [live, taskBoards] = await Promise.all([safeLiveCampaigns(), safeTaskBoards()]);
      const ids = uniqueIds(
        live.map((item) => item.campaign_id),
        taskBoards.map((item) => item.campaign_id),
      );
      const liveById = new Map(live.map((item) => [item.campaign_id, item]));
      const boardById = new Map(taskBoards.map((item) => [item.campaign_id, item]));
      const compose = (id: string, detail: CampaignDetailResp | null) =>
        composeBoard(id, liveById.get(id), boardById.get(id), detail);
      // 先出 Tab，再补写真 / 阶段进度，避免活动已开跑却看不到页签。
      setBoards(ids.map((id) => compose(id, null)));
      const details = await Promise.all(ids.map((id) => safeCampaignDetail(id)));
      setBoards(ids.map((id, index) => compose(id, details[index] ?? null)));
    } catch {
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  const claim = useCallback(
    async (taskId: string) => {
      if (busyTaskId) return;
      setBusyTaskId(taskId);
      try {
        const resp = await claimCampaignTask(taskId);
        Message.success(
          `${t('dailyTasks.claimSuccess')} · ${t('dailyTasks.pointsReward').replace('{points}', String(resp.points_granted))}`,
        );
        await load();
      } catch (err) {
        Message.error(formatApiError(t, err));
      } finally {
        setBusyTaskId(null);
      }
    },
    [busyTaskId, load, t],
  );

  return {
    loading,
    boards,
    hasLiveCampaign: boards.length > 0,
    busyTaskId,
    claim,
    reload: load,
  };
}
