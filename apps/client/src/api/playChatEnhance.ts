import { apiFetch } from './client';

export type DraftPolishResp = { text: string };

export async function polishChatDraft(text: string, context?: string, lang?: string): Promise<DraftPolishResp> {
  return apiFetch<DraftPolishResp>('/chat/draft-polish', {
    method: 'POST',
    body: JSON.stringify({
      text,
      ...(context ? { context } : {}),
      ...(lang ? { lang } : {}),
    }),
  });
}

export async function getSimulatorInspirationReplies(
  simulatorId: string,
  sessionId: string,
): Promise<{ items: string[] }> {
  const q = new URLSearchParams({ session_id: sessionId });
  return apiFetch<{ items: string[] }>(
    `/simulators/${encodeURIComponent(simulatorId)}/play/inspiration-replies?${q.toString()}`,
  );
}

export async function getWorldInspirationReplies(
  worldId: string,
  worldSessionId: string,
): Promise<{ items: string[] }> {
  const q = new URLSearchParams({ world_session_id: worldSessionId });
  return apiFetch<{ items: string[] }>(
    `/worlds/${encodeURIComponent(worldId)}/play/inspiration-replies?${q.toString()}`,
  );
}
