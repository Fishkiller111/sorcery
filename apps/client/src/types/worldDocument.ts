/** World Editor DocumentV1 — aligned with ai-character/internal/world/editor/document.go */

export type WorldContentRating = 'standard' | 'r' | 'r18';

export type WorldDocumentKnowledge = {
  key: string;
  title: string;
  body: string;
  importance?: 'core' | 'normal' | 'spoiler' | string;
};

export type WorldDocumentCast = {
  cast_id: string;
  role_id?: string;
  name: string;
  world_identity?: string;
  is_lead?: boolean;
  is_playable?: boolean;
  figure_image?: string;
  appears_in_levels?: string[];
  avatar_image?: string;
};

export type WorldDocumentLevel = {
  code: string;
  title: string;
  synopsis?: string;
  linked_scene?: string;
  unlock_from?: string[];
  is_start?: boolean;
  map_position?: { x: number; y: number };
  canvas_position?: { x: number; y: number };
};

export type WorldDocumentScene = {
  code: string;
  title: string;
  level_code: string;
  background_image?: string;
  lead_cast_id?: string;
  present_cast_ids?: string[];
  opening?: string;
  play_goal?: string;
};

export type WorldDocumentEvent = {
  event_id: string;
  level_code?: string;
  trigger?: string;
  conditions?: unknown;
  effects?: unknown;
  fail_hint_visible?: boolean;
  fail_hint?: string;
};

export type WorldDocumentGallery = {
  gallery_id: string;
  title: string;
  image_path?: string;
  unlock_flag?: string;
  content_rating?: string;
  canvas_position?: { x: number; y: number };
};

export type WorldDocumentEndingNode = {
  ending_id: string;
  title: string;
  require_flags?: string[];
  storyboard?: { slide_id?: string; image?: string; caption?: string }[];
  canvas_position?: { x: number; y: number };
};

export type WorldDocumentV1 = {
  schema_version: string;
  identity: {
    title: string;
    tagline?: string;
    content_rating: WorldContentRating | string;
    cover_image?: string;
    tags?: string[];
    canonical_lang?: string;
    supported_langs?: string[];
  };
  lore: {
    canon?: string;
    knowledge?: WorldDocumentKnowledge[];
  };
  cast: WorldDocumentCast[];
  default_player_cast_id?: string;
  entries: {
    enabled?: string[];
    primary?: string;
    map_image?: string;
  };
  levels: WorldDocumentLevel[];
  scenes: WorldDocumentScene[];
  events: WorldDocumentEvent[];
  gallery: WorldDocumentGallery[];
  endings: {
    enabled?: boolean;
    nodes?: WorldDocumentEndingNode[];
  };
  i18n?: Record<string, unknown>;
};

export type WorldEditorItem = {
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
  is_official?: boolean;
  is_template?: boolean;
  created_at: number;
  updated_at: number;
  published_at?: number;
};

export type WorldVersionItem = {
  version_id: string;
  world_id: string;
  version_no: number;
  status: string;
  schema_version: string;
  source: string;
  document?: WorldDocumentV1;
  created_at: number;
  updated_at: number;
};

export type CreateWorldResp = {
  world: WorldEditorItem;
  draft: WorldVersionItem;
};

export type GetWorldResp = {
  world: WorldEditorItem;
  draft?: WorldVersionItem;
};

export type SaveWorldDraftResp = {
  world: WorldEditorItem;
  draft: WorldVersionItem;
  warnings?: string[];
};

export type WorldPublishResp = {
  world_id: string;
  status: string;
  moderation_id: string;
  warnings?: string[];
};

export type WorldEditorTab = 'overview' | 'lore' | 'cast' | 'levels' | 'map' | 'endings' | 'advanced';

export type WorldTemplateItem = {
  code: string;
  title: string;
  tagline?: string;
  content_rating: string;
  level_hint?: string;
  cover_image?: string;
};

export type WorldAIJobItem = {
  job_id: string;
  status: string;
  world_id?: string;
  version_id?: string;
  error_message?: string;
  quota_charged?: boolean;
  created_at: number;
  updated_at: number;
};

export type ChecklistItem = {
  id: string;
  labelKey: string;
  ok: boolean;
};
