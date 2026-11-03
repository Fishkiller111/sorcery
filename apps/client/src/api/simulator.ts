import { apiFetch } from './client';
import type {
  CreateSimulatorReq,
  CreateSimulatorResp,
  ExploreSimulatorDetailResp,
  ExploreSimulatorListReq,
  ExploreSimulatorListResp,
  GetSimulatorResp,
  ListSimulatorMessagesResp,
  ListSimulatorsResp,
  ListSimulatorTemplatesResp,
  PublishSimulatorResp,
  SaveSimulatorDraftReq,
  SaveSimulatorDraftResp,
  SimulatorAIGenerateReq,
  SimulatorAIGenerateResp,
  SimulatorAIJobItem,
  SimulatorCommentItem,
  SimulatorCommentLikeResp,
  SimulatorCommentListResp,
  SimulatorFollowResp,
  SimulatorLikeResp,
  SimulatorPlayEnterReq,
  SimulatorPlayEnterResp,
  SimulatorSessionResp,
} from '../types/simulator';

export async function createSimulator(body: CreateSimulatorReq): Promise<CreateSimulatorResp> {
  return apiFetch<CreateSimulatorResp>('/simulators', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listSimulatorTemplates(): Promise<ListSimulatorTemplatesResp> {
  return apiFetch<ListSimulatorTemplatesResp>('/simulators/templates');
}

export async function startSimulatorAIGenerate(
  body: SimulatorAIGenerateReq,
): Promise<SimulatorAIGenerateResp> {
  return apiFetch<SimulatorAIGenerateResp>('/simulators/ai-generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getSimulatorAIGenerate(jobId: string): Promise<SimulatorAIJobItem> {
  return apiFetch<SimulatorAIJobItem>(
    `/simulators/ai-generate/${encodeURIComponent(jobId)}`,
  );
}

export async function listSimulators(limit = 50): Promise<ListSimulatorsResp> {
  const q = new URLSearchParams({ limit: String(limit) });
  return apiFetch<ListSimulatorsResp>(`/simulators?${q.toString()}`);
}

export async function getSimulator(simulatorId: string): Promise<GetSimulatorResp> {
  return apiFetch<GetSimulatorResp>(`/simulators/${encodeURIComponent(simulatorId)}`);
}

export async function saveSimulatorDraft(
  simulatorId: string,
  body: SaveSimulatorDraftReq,
): Promise<SaveSimulatorDraftResp> {
  return apiFetch<SaveSimulatorDraftResp>(`/simulators/${encodeURIComponent(simulatorId)}/draft`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function publishSimulator(simulatorId: string): Promise<PublishSimulatorResp> {
  return apiFetch<PublishSimulatorResp>(`/simulators/${encodeURIComponent(simulatorId)}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function deleteSimulator(simulatorId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/simulators/${encodeURIComponent(simulatorId)}`, { method: 'DELETE' });
}

export async function enterSimulatorPlay(
  simulatorId: string,
  body: SimulatorPlayEnterReq = {},
): Promise<SimulatorPlayEnterResp> {
  return apiFetch<SimulatorPlayEnterResp>(
    `/simulators/${encodeURIComponent(simulatorId)}/play/enter`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function getSimulatorSession(simulatorId: string): Promise<SimulatorSessionResp> {
  return apiFetch<SimulatorSessionResp>(
    `/simulators/${encodeURIComponent(simulatorId)}/play/session`,
  );
}

export async function listSimulatorMessages(
  simulatorId: string,
  opts?: { limit?: number },
): Promise<ListSimulatorMessagesResp> {
  const q = new URLSearchParams({ limit: String(opts?.limit ?? 80) });
  return apiFetch<ListSimulatorMessagesResp>(
    `/simulators/${encodeURIComponent(simulatorId)}/play/messages?${q.toString()}`,
  );
}

export async function abandonSimulatorPlay(simulatorId: string): Promise<SimulatorSessionResp> {
  return apiFetch<SimulatorSessionResp>(
    `/simulators/${encodeURIComponent(simulatorId)}/play/abandon`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function interruptSimulatorPlay(simulatorId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/simulators/${encodeURIComponent(simulatorId)}/play/interrupt`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function listExploreSimulators(
  params: ExploreSimulatorListReq = {},
): Promise<ExploreSimulatorListResp> {
  const q = new URLSearchParams();
  if (params.q) q.set('q', params.q);
  if (params.content_rating) q.set('content_rating', params.content_rating);
  if (params.world_id) q.set('world_id', params.world_id);
  if (params.exclude_mature != null) q.set('exclude_mature', String(params.exclude_mature));
  if (params.page != null) q.set('page', String(params.page));
  if (params.page_size != null) q.set('page_size', String(params.page_size));
  const qs = q.toString();
  return apiFetch<ExploreSimulatorListResp>(`/explore/simulators${qs ? `?${qs}` : ''}`);
}

export async function getExploreSimulator(
  simulatorId: string,
): Promise<ExploreSimulatorDetailResp> {
  return apiFetch<ExploreSimulatorDetailResp>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}`,
  );
}

export async function recordSimulatorView(simulatorId: string): Promise<void> {
  await apiFetch(`/explore/simulators/${encodeURIComponent(simulatorId)}/view`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function likeExploreSimulator(simulatorId: string): Promise<SimulatorLikeResp> {
  return apiFetch<SimulatorLikeResp>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/like`,
    { method: 'POST' },
  );
}

export async function unlikeExploreSimulator(simulatorId: string): Promise<SimulatorLikeResp> {
  return apiFetch<SimulatorLikeResp>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/like`,
    { method: 'DELETE' },
  );
}

export async function followExploreSimulator(simulatorId: string): Promise<SimulatorFollowResp> {
  return apiFetch<SimulatorFollowResp>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/follow`,
    { method: 'POST' },
  );
}

export async function unfollowExploreSimulator(simulatorId: string): Promise<SimulatorFollowResp> {
  return apiFetch<SimulatorFollowResp>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/follow`,
    { method: 'DELETE' },
  );
}

export async function listSimulatorComments(
  simulatorId: string,
  page = 1,
  limit = 20,
  parentId?: string,
): Promise<SimulatorCommentListResp> {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (parentId) qs.set('parent_id', parentId);
  return apiFetch<SimulatorCommentListResp>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/comments?${qs}`,
  );
}

export async function createSimulatorComment(
  simulatorId: string,
  content: string,
  parentCommentId?: string,
): Promise<SimulatorCommentItem> {
  return apiFetch<SimulatorCommentItem>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({
        content,
        ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
      }),
    },
  );
}

export async function deleteSimulatorComment(
  simulatorId: string,
  commentId: string,
): Promise<void> {
  await apiFetch<void>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
  );
}

export async function likeSimulatorComment(
  simulatorId: string,
  commentId: string,
): Promise<SimulatorCommentLikeResp> {
  return apiFetch<SimulatorCommentLikeResp>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/comments/${encodeURIComponent(commentId)}/like`,
    { method: 'POST' },
  );
}

export async function unlikeSimulatorComment(
  simulatorId: string,
  commentId: string,
): Promise<SimulatorCommentLikeResp> {
  return apiFetch<SimulatorCommentLikeResp>(
    `/explore/simulators/${encodeURIComponent(simulatorId)}/comments/${encodeURIComponent(commentId)}/like`,
    { method: 'DELETE' },
  );
}
