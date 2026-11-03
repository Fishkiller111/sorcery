/**
 * Simulator API + editor document types.
 * Mirrors Soulthread-api:
 * - backend/internal/types/simulator_types.go
 * - backend/internal/simulator/editor/document.go
 */

/** Editor document (§4.2) — fields from simulator/editor package. */
export type SimulatorDocumentV1 = {
  schema_version: string;
  identity: SimulatorDocumentIdentity;
  belonging: SimulatorDocumentBelonging;
  intro: string;
  goal_brief: string;
  victory_text?: string;
  failure_text?: string;
  cast: SimulatorDocumentCast[];
  scene: SimulatorDocumentScene;
  goals: SimulatorConditionSet;
  fail_conditions: SimulatorConditionSet;
  triggers?: SimulatorDocumentTrigger[];
  judge: SimulatorDocumentJudge;
  /** Optional play limits (S4). */
  limits?: SimulatorDocumentLimits;
};

export type SimulatorDocumentLimits = {
  max_rounds?: number;
};

export type SimulatorDocumentIdentity = {
  title: string;
  tagline?: string;
  content_rating: string;
  cover_image?: string;
  tags?: string[];
  canonical_lang?: string;
  supported_langs?: string[];
};

export type SimulatorDocumentBelonging = {
  world_id?: string;
};

export type SimulatorDocumentCast = {
  cast_id: string;
  role_id?: string;
  name: string;
  world_identity?: string;
  is_lead?: boolean;
  is_playable?: boolean;
  figure_image?: string;
  attributes?: string;
};

export type SimulatorDocumentScene = {
  background_image?: string;
  lead_cast_id?: string;
  present_cast_ids?: string[];
};

/** goals / fail_conditions: logic + items */
export type SimulatorConditionSet = {
  /** all_of | any_of (default any_of) */
  logic?: string;
  items?: SimulatorConditionItem[];
};

/** keyword | flag | all_of | any_of */
export type SimulatorConditionItem = {
  id?: string;
  type: string;
  keywords?: string[];
  flag?: string;
  items?: SimulatorConditionItem[];
};

export type SimulatorDocumentTrigger = {
  trigger_id: string;
  match: SimulatorConditionItem;
  set_flags?: string[];
  narrate?: string;
};

export type SimulatorDocumentJudge = {
  /** rules | hybrid | llm (default hybrid) */
  mode?: string;
  judge_prompt?: string;
};

export type SimulatorStats = {
  view_count?: number;
  play_count?: number;
  clear_count?: number;
  fail_count?: number;
  like_count?: number;
  comment_count?: number;
  follower_count?: number;
  liked_by_me?: boolean;
  followed_by_me?: boolean;
};

export type SimulatorLikeResp = {
  liked: boolean;
  like_count: number;
};

export type SimulatorFollowResp = {
  followed: boolean;
  follower_count: number;
};

export type SimulatorCommentItem = {
  id: string;
  user_id: string;
  nickname: string;
  content: string;
  created_at: number;
  is_owner?: boolean;
  parent_comment_id?: string;
  like_count: number;
  liked_by_me?: boolean;
  reply_count?: number;
};

export type SimulatorCommentListResp = {
  data: SimulatorCommentItem[];
  pagination: { page: number; limit: number; total: number };
};

export type SimulatorCommentLikeResp = {
  liked: boolean;
  like_count: number;
};

export type SimulatorItem = {
  simulator_id: string;
  title: string;
  owner_user_id: string;
  visibility: string;
  content_rating: string;
  status: string;
  tagline?: string;
  cover_image?: string;
  tags?: string[];
  world_id?: string;
  published_at?: number;
  created_at: number;
  updated_at: number;
  view_count?: number;
  play_count?: number;
  clear_count?: number;
  stats?: SimulatorStats;
};

export type SimulatorVersionItem = {
  version_id: string;
  simulator_id: string;
  version_no: number;
  status: string;
  schema_version: string;
  document?: SimulatorDocumentV1 | Record<string, unknown>;
  created_at: number;
  updated_at: number;
};

export type CreateSimulatorReq = {
  title: string;
  visibility?: string;
  content_rating?: string;
  world_id?: string;
  starter?: 'blank' | 'empty';
  template_code?: string;
  document?: SimulatorDocumentV1;
};

export type SimulatorContentRating = 'standard' | 'r' | 'r18' | 'mature';

export type SimulatorTemplateItem = {
  code: string;
  title: string;
  tagline?: string;
  content_rating: string;
  cover_image?: string;
};

export type ListSimulatorTemplatesResp = {
  templates: SimulatorTemplateItem[];
};

export type SimulatorAIGenerateReq = {
  prompt: string;
  title_hint?: string;
};

export type SimulatorAIGenerateResp = {
  job_id: string;
  status: string;
};

export type SimulatorAIJobItem = {
  job_id: string;
  status: string;
  simulator_id?: string;
  version_id?: string;
  error_message?: string;
  quota_charged?: boolean;
  created_at?: number;
  updated_at?: number;
};

export type CreateSimulatorResp = {
  simulator: SimulatorItem;
  draft: SimulatorVersionItem;
};

export type ListSimulatorsResp = {
  simulators: SimulatorItem[];
};

export type GetSimulatorResp = {
  simulator: SimulatorItem;
  draft?: SimulatorVersionItem;
  stats?: SimulatorStats;
};

export type SaveSimulatorDraftReq = {
  document: SimulatorDocumentV1;
  title?: string;
  world_id?: string;
};

export type SaveSimulatorDraftResp = {
  simulator: SimulatorItem;
  draft: SimulatorVersionItem;
};

export type PublishSimulatorResp = {
  simulator_id: string;
  status: string;
  warnings?: string[];
};

export type SimulatorCastPreview = {
  cast_id: string;
  name: string;
  world_identity?: string;
  figure_image?: string;
  is_lead?: boolean;
  is_playable?: boolean;
};

export type SimulatorPlayEnterReq = {
  player_cast_id?: string;
  force_new?: boolean;
};

export type SimulatorPlayEnterResp = {
  simulator_id: string;
  session_id: string;
  version_id: string;
  title: string;
  intro: string;
  goal_brief: string;
  victory_text?: string;
  failure_text?: string;
  content_rating: string;
  background_image?: string;
  player_cast_id?: string;
  lead_cast_id?: string;
  status: string;
  flags: Record<string, boolean>;
  cast?: SimulatorCastPreview[];
  playable_cast?: SimulatorCastPreview[];
  need_player_cast?: boolean;
  is_owner: boolean;
  /** Completed player turns in this session. */
  round_count?: number;
  /** Document limits.max_rounds; 0/omitted = unlimited. */
  max_rounds?: number;
};

export type SimulatorSessionResp = {
  session_id: string;
  simulator_id: string;
  version_id: string;
  player_cast_id?: string;
  status: string;
  flags: Record<string, boolean>;
  round_count: number;
  started_at: number;
  ended_at?: number;
};

export type SimulatorMessageItem = {
  id: string;
  role: string;
  cast_id?: string;
  content: string;
  created_at: number;
};

export type ListSimulatorMessagesResp = {
  messages: SimulatorMessageItem[];
};

export type ExploreSimulatorListReq = {
  q?: string;
  content_rating?: string;
  world_id?: string;
  exclude_mature?: boolean;
  page?: number;
  page_size?: number;
};

export type ExploreSimulatorItem = {
  simulator_id: string;
  title: string;
  tagline?: string;
  cover_image?: string;
  content_rating: string;
  tags?: string[];
  world_id?: string;
  owner_user_id?: string;
  published_at?: number;
  view_count?: number;
  play_count?: number;
  clear_count?: number;
  stats?: SimulatorStats;
};

export type ExploreSimulatorListResp = {
  items: ExploreSimulatorItem[];
  total: number;
  page: number;
  page_size: number;
};

export type ExploreSimulatorDetailResp = {
  simulator: ExploreSimulatorItem;
  intro?: string;
  goal_brief?: string;
  cast?: SimulatorCastPreview[];
  stats?: SimulatorStats;
};

/** Local chat row for stub play UI */
export type SimulatorPlayMessage = {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  imageUrl?: string;
  castId?: string;
  timestamp: number;
  isStreaming?: boolean;
};

export type SimulatorSettleKind = 'victory' | 'failure' | null;

/** Parsed from SSE `goal_progress` payload. */
export type SimulatorGoalProgress = {
  matchedGoals: string[];
  matchedFails: string[];
  flags: Record<string, boolean>;
  roundCount?: number;
  maxRounds?: number;
};
