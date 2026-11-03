/** Story Mode DTO — aligned with ai-character/backend/internal/types/story_types.go */

export interface StoryMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: string;
  content: string;
  tone?: string;
  beat_id?: string;
  agent_key?: string;
  created_at: number;
}

export interface StoryEnterResp {
  story_session_id: string;
  scene_code: string;
  scene_title: string;
  scene_type?: string;
  current_beat: string;
  active_agent: string;
  status: string;
  opening: StoryMessageItem;
  flags: Record<string, boolean>;
  parallel_playback?: {
    min_seconds?: number;
    skip_if_seen?: boolean;
    steps?: Array<{
      step: number;
      beat_id?: string;
      agent?: string;
      text?: string;
      text_i18n?: { zh?: string; en?: string };
      duration_ms?: number;
      standard_image?: string;
      mature_image?: string;
      hotspot?: {
        action?: string;
        gallery_id?: string;
        label?: string;
        label_i18n?: { zh?: string; en?: string };
      };
    }>;
  };
  already_seen?: boolean;
  next_scene_code?: string;
  next_scene_type?: string;
}

export interface StorySendResp {
  message_id: string;
  assistant_message_id?: string;
  generation_id?: string;
  generation_status?: 'pending' | 'done' | 'failed';
  active_agent?: string;
  bad_end_id?: string;
  retry_hint?: string;
  rollback_beat?: string;
  bad_end_min_seconds?: number;
  reward_id?: string;
  reward_complete?: boolean;
  scene_cleared?: boolean;
  next_scene_code?: string;
  next_scene_type?: string;
  show_paywall?: boolean;
}

export interface StoryBadEndStep {
  step: number;
  text?: string;
  image?: string;
  standard_image?: string;
  mature_image?: string;
  duration_ms?: number;
}

export interface StoryBadEndPayload {
  event_id?: string;
  bad_end_id: string;
  min_seconds?: number;
  retry_hint?: string;
  rollback_beat?: string;
  steps?: StoryBadEndStep[];
}

export interface StoryBeatAdvancePayload {
  event_id?: string;
  beat_id: string;
  agent?: string;
  narration?: string;
  opening?: string;
  location?: string;
  time?: string;
}

export interface StorySceneClearPayload {
  event_id?: string;
  scene_code: string;
  next_scene_code?: string;
  next_scene_type?: string;
  pass_path?: string;
  show_paywall?: boolean;
  chapter_clear?: boolean;
  chapter_code?: string;
}

export interface StoryImagePayload {
  gallery_item_id?: string;
  scene_id?: string;
  branch_id?: string;
  content_tier?: string;
  image_url: string;
  caption?: string;
  prompt?: string;
}

export interface StoryListScenesResp {
  chapter_code: string;
  chapter_title: string;
  chapter_clear: boolean;
  scenes: Array<{
    scene_code: string;
    title: string;
    sort_order: number;
    scene_type: string;
    unlocked: boolean;
    cleared: boolean;
    is_active: boolean;
  }>;
}

export interface StoryProgressResp {
  season_id: string;
  scene_code?: string;
  flags: Record<string, boolean>;
  scene_clears: string[];
}

export interface StoryChapterAccessResp {
  chapter_code: string;
  chapter_title?: string;
  accessible: boolean;
  unlocked: boolean;
  vip_story_mode?: boolean;
  points_owned?: boolean;
  catalog_code?: string;
  cost_points?: number;
  reason?: string;
}

export interface StoryChapterUnlockResp {
  chapter_code: string;
  unlocked: boolean;
  already_owned?: boolean;
  vip_story_mode?: boolean;
  points_spent?: number;
  balance_after?: number;
}

export interface StoryGalleryItem {
  gallery_item_id: string;
  scene_id: string;
  branch_id: string;
  content_tier: string;
  image_url: string;
  caption: string;
  created_at: number;
}

export interface StoryRewardEnterPayload {
  event_id?: string;
  reward_id: string;
  hint?: string;
}

export interface StoryRewardStagePayload {
  event_id?: string;
  round: number;
  total: number;
  agent?: string;
  text?: string;
  image?: string;
}

export interface StoryRewardCompletePayload {
  event_id?: string;
  reward_id: string;
  return_to_beat?: string;
  scene_not_clear?: boolean;
}

export interface StoryMatureConsentResp {
  story_session_id: string;
  consent_token: string;
  expires_at: number;
}

export interface StoryGenerationResp {
  generation_id: string;
  story_session_id: string;
  user_message_id: string;
  assistant_message_id: string;
  status: 'pending' | 'done' | 'failed';
}

export interface StoryEventItem {
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: number;
}

export interface StoryEventsResp {
  story_session_id: string;
  events: StoryEventItem[];
  latest_event_id?: string;
}
