import { apiFetch } from './client';
import type {
  StoryChapterAccessResp,
  StoryChapterUnlockResp,
  StoryEnterResp,
  StoryEventsResp,
  StoryGalleryItem,
  StoryGenerationResp,
  StoryListScenesResp,
  StoryMessageItem,
  StoryProgressResp,
} from '../types/story';

export async function enterStoryScene(
  sceneCode: string,
  opts?: { forceNew?: boolean; replay?: boolean },
): Promise<StoryEnterResp> {
  return apiFetch<StoryEnterResp>(`/story/scenes/${sceneCode}/enter`, {
    method: 'POST',
    body: JSON.stringify({
      force_new: !!opts?.forceNew,
      replay: !!opts?.replay,
    }),
  });
}

export async function interruptStory(storySessionId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/story/interrupt', {
    method: 'POST',
    body: JSON.stringify({ story_session_id: storySessionId }),
  });
}

export async function getStoryMessages(
  storySessionId: string,
  opts?: { limit?: number; sinceId?: string },
): Promise<{ story_session_id: string; messages: StoryMessageItem[]; latest_id?: string }> {
  const q = new URLSearchParams({ story_session_id: storySessionId });
  q.set('limit', String(opts?.limit ?? 80));
  if (opts?.sinceId) q.set('since_id', opts.sinceId);
  return apiFetch(`/story/messages?${q.toString()}`);
}

export async function getStoryGeneration(generationId: string): Promise<StoryGenerationResp> {
  return apiFetch<StoryGenerationResp>(`/story/generations/${generationId}`);
}

export async function getStoryEvents(
  storySessionId: string,
  opts?: { sinceEventId?: string; limit?: number },
): Promise<StoryEventsResp> {
  const q = new URLSearchParams();
  q.set('limit', String(opts?.limit ?? 50));
  if (opts?.sinceEventId) q.set('since_event_id', opts.sinceEventId);
  const query = q.toString();
  const suffix = query ? `?${query}` : '';
  return apiFetch<StoryEventsResp>(`/story/sessions/${storySessionId}/events${suffix}`);
}

export async function getStoryProgress(): Promise<StoryProgressResp> {
  return apiFetch<StoryProgressResp>('/story/progress');
}

export async function listStoryScenes(chapterCode: string): Promise<StoryListScenesResp> {
  return apiFetch<StoryListScenesResp>(`/story/chapters/${chapterCode}/scenes`);
}

export async function completeParallelScene(
  sceneCode: string,
  storySessionId?: string,
): Promise<{ scene_code: string; next_scene_code?: string; next_scene_type?: string }> {
  return apiFetch(`/story/scenes/${sceneCode}/parallel/complete`, {
    method: 'POST',
    body: JSON.stringify(storySessionId ? { story_session_id: storySessionId } : {}),
  });
}

export async function setStoryMatureTier(
  storySessionId: string,
  tier: string,
  consentToken?: string,
): Promise<{ story_session_id: string; tier: string }> {
  return apiFetch(`/story/sessions/${storySessionId}/mature-tier`, {
    method: 'POST',
    body: JSON.stringify({ tier, consent_token: consentToken }),
  });
}

export async function issueStoryMatureConsent(
  storySessionId: string,
): Promise<{ story_session_id: string; consent_token: string; expires_at: number }> {
  return apiFetch(`/story/sessions/${storySessionId}/mature-consent`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getStoryChapterAccess(chapterCode: string): Promise<StoryChapterAccessResp> {
  return apiFetch<StoryChapterAccessResp>(`/story/chapters/${chapterCode}/access`);
}

export async function unlockStoryChapter(
  chapterCode: string,
  usePoints = true,
): Promise<StoryChapterUnlockResp> {
  return apiFetch<StoryChapterUnlockResp>(`/story/chapters/${chapterCode}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ use_points: usePoints }),
  });
}

export async function getStoryGallery(
  seasonId: string,
  limit = 100,
): Promise<{ season_id: string; items: StoryGalleryItem[] }> {
  const q = new URLSearchParams({ season_id: seasonId, limit: String(limit) });
  return apiFetch(`/story/gallery?${q.toString()}`);
}

export async function resetStoryChapterProgress(chapterCode: string): Promise<{
  chapter_code: string;
  cleared_flags: number;
  sessions_abandoned: number;
}> {
  return apiFetch(`/story/chapters/${chapterCode}/debug/reset`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
