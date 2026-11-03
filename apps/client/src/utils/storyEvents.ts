import type {
  StoryBadEndPayload,
  StoryBeatAdvancePayload,
  StoryEventItem,
  StoryRewardCompletePayload,
  StoryRewardEnterPayload,
  StoryRewardStagePayload,
  StorySceneClearPayload,
} from '../types/story';
import type { AgentId, SceneConfig } from '../engine/types';

export function storyEventIdFromPayload(payload: { event_id?: string } | null | undefined): string {
  return typeof payload?.event_id === 'string' ? payload.event_id : '';
}

export type StoryEventHandlers = {
  applyBadEnd: (payload: StoryBadEndPayload) => void;
  applySceneClear: (payload: StorySceneClearPayload) => void;
  onBeatAdvance: (payload: StoryBeatAdvancePayload) => void;
  onRewardEnter: (payload: StoryRewardEnterPayload) => void;
  onRewardStage: (payload: StoryRewardStagePayload) => void;
  onRewardComplete: (payload: StoryRewardCompletePayload) => void;
  noteEventId: (eventId: string) => void;
};

export function applyStoryEventItem(
  event: StoryEventItem,
  config: SceneConfig,
  handlers: StoryEventHandlers,
): void {
  if (event.event_id) handlers.noteEventId(event.event_id);
  const payload = event.payload;

  switch (event.event_type) {
    case 'story_bad_end':
      handlers.applyBadEnd(payload as unknown as StoryBadEndPayload);
      break;
    case 'story_beat_advance':
      handlers.onBeatAdvance(payload as unknown as StoryBeatAdvancePayload);
      break;
    case 'story_scene_clear':
      handlers.applySceneClear(payload as unknown as StorySceneClearPayload);
      break;
    case 'story_reward_enter':
      handlers.onRewardEnter(payload as unknown as StoryRewardEnterPayload);
      break;
    case 'story_reward_stage':
      handlers.onRewardStage(payload as unknown as StoryRewardStagePayload);
      break;
    case 'story_reward_complete':
      handlers.onRewardComplete(payload as unknown as StoryRewardCompletePayload);
      break;
    default:
      break;
  }
}
