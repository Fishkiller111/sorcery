export type WorldItem = {
  world_id: string;
  code: string;
  title: string;
  owner_user_id: string;
  visibility: string;
  content_rating: string;
  status: string;
  tagline?: string;
  cover_image?: string;
  tags?: string[];
  created_at: number;
  updated_at: number;
};

export type WorldProgressView = {
  current_level: string;
  current_scene: string;
  flags: Record<string, boolean>;
  cleared_levels: string[];
  unlocked_gallery: string[];
  player_cast_id?: string;
  updated_at: number;
};

export type WorldLevelStatus = {
  code: string;
  title: string;
  synopsis?: string;
  unlocked: boolean;
  cleared: boolean;
  is_start: boolean;
  unlock_from?: string[];
  map_x?: number;
  map_y?: number;
};

export type WorldEndingStatus = {
  ending_id: string;
  title: string;
};

export type WorldEntriesView = {
  enabled?: string[];
  primary?: string;
  map_image?: string;
};

export type WorldCastPreview = {
  cast_id: string;
  name: string;
  world_identity?: string;
  figure_image?: string;
  is_lead?: boolean;
  is_playable?: boolean;
};

export type WorldKnowledgePreview = {
  key: string;
  title: string;
  body: string;
  importance?: 'core' | 'normal' | 'spoiler' | string;
};

export type WorldLorePreview = {
  canon?: string;
  knowledge?: WorldKnowledgePreview[];
};

export type WorldScenePreview = {
  code: string;
  title: string;
  level_code?: string;
  background_image?: string;
  opening?: string;
  play_goal?: string;
};

export type WorldPlayEnterResp = {
  world_id: string;
  version_id: string;
  title: string;
  tagline?: string;
  cover_image?: string;
  content_rating: string;
  owner_user_id: string;
  is_owner: boolean;
  progress: WorldProgressView;
  start_level?: string;
  entries?: WorldEntriesView;
  cast?: WorldCastPreview[];
  playable_cast?: WorldCastPreview[];
  need_player_cast?: boolean;
  default_player_cast_id?: string;
};

export type WorldPlayProgressResp = {
  progress: WorldProgressView;
  levels: WorldLevelStatus[];
  endings_enabled: boolean;
  reached_endings?: WorldEndingStatus[];
  entries?: WorldEntriesView;
  cast?: WorldCastPreview[];
  lore?: WorldLorePreview;
  scenes?: WorldScenePreview[];
  owner_user_id?: string;
  is_owner?: boolean;
  cover_image?: string;
  title?: string;
  tagline?: string;
};

export type WorldPlayMessage = {
  id: string;
  role: string;
  content: string;
  beat_id?: string;
  cast_id?: string;
  created_at: number;
};

export type WorldPlayEvent = {
  id: string;
  event_type: string;
  payload: unknown;
  created_at: number;
};

export type WorldEnterLevelResp = {
  world_session_id: string;
  level_code: string;
  scene_code: string;
  scene_title: string;
  background_image?: string;
  current_beat: string;
  lead_cast_id: string;
  player_cast_id?: string;
  status: string;
  opening: WorldPlayMessage;
  /** Resolved POV play goal for the level scene. */
  play_goal?: string;
  flags: Record<string, boolean>;
  checkpoint_code?: string;
  events?: WorldPlayEvent[];
  cast?: WorldCastPreview[];
  world_title?: string;
};

export type WorldGalleryItem = {
  gallery_id: string;
  title: string;
  image_path?: string;
  content_rating?: string;
  unlock_flag?: string;
  unlocked: boolean;
};

export type WorldGalleryListResp = {
  world_id: string;
  items: WorldGalleryItem[];
};

export type WorldListResp = {
  worlds: WorldItem[];
};
