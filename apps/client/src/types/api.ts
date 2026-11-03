// DTO types shared with ai-character backend
// Source of truth: ai-character/backend/internal/types/types.go

export interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  subtitle_lang: string;
  voice_lang: string;
  system_lang: string;
  content_tier: string;
  is_dev?: boolean;
  vip?: VipSummary;
  free_chat_dominance?: number;
  avatar_url?: string;
  gender?: UserGender;
  gender_custom?: string;
  /** ISO time when user requested deletion; present during cooling-off. */
  deletion_requested_at?: string;
  /** ISO time when account will be hard-deleted if not cancelled. */
  deletion_scheduled_at?: string;
  /** True when users.email is a real mailbox (not the Telegram placeholder). */
  email_bound?: boolean;
  has_password?: boolean;
  auth_provider?: string;
}

export type UserGender = 'male' | 'female' | 'other' | '';

export interface VipPermissions {
  story_mode: boolean;
  freechat_create_agent: boolean;
  freechat_publish_agent: boolean;
  mature_mode: boolean;
  voice_call?: boolean;
  request_photo?: boolean;
  freechat_official_role_ids: string[] | '*' | null;
  voice_enabled?: boolean;
}

export interface VipSummary {
  is_active: boolean;
  plan_code: string;
  plan_name: string;
  billing_type: string;
  expires_at?: string;
  permissions: VipPermissions;
}

export interface VipMeResp {
  is_active: boolean;
  plan_code: string;
  plan_name: string;
  billing_type: string;
  expires_at?: string;
  permissions: VipPermissions;
}

export interface VipPlanItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  product_type?: string;
  billing_type: string;
  duration_unit: string;
  duration_value: number;
  price_cents: number;
  charge_cents?: number;
  promo_percent?: number;
  promo_ends_at?: number;
  currency: string;
  grant_points?: number;
  grant_reward_type?: string;
  grant_reward_amount?: number;
  image_url?: string;
  is_custom_recharge?: boolean;
  custom_min_points?: number;
  custom_step_points?: number;
  apple_product_id?: string;
}

export interface VipPlanListResp {
  plans: VipPlanItem[];
}

export type VipPaymentProvider = 'stripe' | 'paypal' | 'apple_pay' | 'nowpayments';

export interface VipCheckoutReq {
  plan_id: string;
  payment_provider?: VipPaymentProvider;
  success_url?: string;
  cancel_url?: string;
  /** Custom Soul recharge amount (must be min + n*step) */
  grant_points?: number;
}

export interface VipCheckoutResp {
  order_id: string;
  checkout_url?: string;
  client_secret?: string;
  provider: string;
  expires_at: number;
}

export interface VipVerifyCheckoutReq {
  order_id: string;
}

export interface VipVerifyCheckoutResp {
  order_id: string;
  status: string;
  vip?: VipMeResp;
}

export interface UpdateUserReq {
  nickname?: string;
  subtitle_lang?: string;
  voice_lang?: string;
  system_lang?: string;
  content_tier?: 'standard' | 'mature';
  free_chat_dominance?: number;
  gender?: UserGender;
  gender_custom?: string;
}

export interface UserProfileResp {
  profile_data: string;
}

export interface UserProfileData {
  membership?: string;
  points?: number;
  scene?: string;
  achievements?: { current: number; total: number };
}

export interface SendCodeReq {
  email: string;
  type: 'register' | 'reset';
  turnstile_token?: string;
}

export interface SendCodeResp {
  success: boolean;
}

export interface RegisterReq {
  email: string;
  code: string;
  password: string;
  confirm_password: string;
  invite_code?: string;
  /** RevShare 联盟码（?aff=），与 invite_code 独立 */
  aff?: string;
}

export interface RegisterResp {
  token: string;
  expires_at: number;
  user: UserInfo;
}

export interface LoginReq {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface LoginResp {
  token: string;
  expires_at: number;
  user: UserInfo;
}

export interface GoogleAuthReq {
  id_token: string;
  invite_code?: string;
  aff?: string;
}

export interface GoogleAuthResp {
  token: string;
  expires_at: number;
  user: UserInfo;
  is_new_user: boolean;
}

export interface TelegramAuthReq {
  init_data: string;
  invite_code?: string;
  aff?: string;
}

export interface TelegramWidgetAuthReq {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  invite_code?: string;
  aff?: string;
}

export interface TelegramAuthResp {
  token: string;
  expires_at: number;
  user: UserInfo;
  is_new_user: boolean;
}

export interface AppleAuthUserName {
  firstName?: string;
  lastName?: string;
}

export interface AppleAuthUser {
  name?: AppleAuthUserName;
  email?: string;
}

export interface AppleAuthReq {
  identity_token: string;
  authorization_code?: string;
  invite_code?: string;
  aff?: string;
  user?: AppleAuthUser;
}

export interface AppleAuthResp {
  token: string;
  expires_at: number;
  user: UserInfo;
  is_new_user: boolean;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  link_url?: string;
  image_url?: string;
  locale?: string;
  placement?: string;
  priority: number;
  is_active?: boolean;
  starts_at?: number;
  ends_at?: number;
  created_at?: number;
  updated_at?: number;
}

export interface ListActiveAnnouncementsResp {
  items: AnnouncementItem[];
}

export interface ResetPasswordReq {
  email: string;
  code: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordResp {
  success: boolean;
}

export interface RoleItem {
  id: string;
  name: string;
  scene_name: string;
  avatar_url: string;
  figure_url?: string;
  /** 关 R18 列表预览视频：优先 r，其次 standard */
  preview_video_url_r?: string;
  /** 开 R18 列表预览视频：优先 mature，可降级 r → standard */
  preview_video_url_mature?: string;
  introduction?: string;
  attributes: string;
  visibility?: string;
  publish_status?: string;
  version?: number;
  is_owner?: boolean;
  worldview_id?: string;
  worldview_name?: string;
  worldview_summary?: string;
  supported_langs?: string[];
  categories?: ExploreRoleCategory[];
  has_chat_history?: boolean;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  media_count?: number;
  gift_points_total?: number;
  content_rating?: string;
  source?: string;
  official_subtype?: string;
  verified_real_person?: boolean;
  pin_order?: number;
  published_at?: number;
}

export interface RoleListResp {
  roles: RoleItem[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  has_chatted_roles?: boolean;
}

export interface WorldviewItem {
  id: string;
  name: string;
  summary: string;
  cover_image?: string;
  role_count: number;
}

export interface WorldviewSupplementItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  image?: string;
  sort_order: number;
}

export interface WorldviewDetailResp {
  id: string;
  name: string;
  summary: string;
  background: string;
  timeline?: string;
  cover_image?: string;
  role_count: number;
  supplements: WorldviewSupplementItem[];
}

export interface WorldviewListResp {
  items: WorldviewItem[];
}

export interface RoleEvent {
  id: string;
  event_name: string;
  display_name: string;
  prompt_suffix?: string;
  sort_order: number;
  cooldown_seconds: number;
  is_active?: boolean;
}

export interface RoleEventInput {
  event_name: string;
  display_name: string;
  prompt_suffix: string;
  sort_order?: number;
  cooldown_seconds?: number;
  is_active?: boolean;
}

export interface UpdateRoleEventsReq {
  events: RoleEventInput[];
}

export interface RoleCommunityStats {
  view_detail_count: number;
  view_chat_count: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  liked_by_me?: boolean;
  follower_count?: number;
  gift_points_total?: number;
  followed_by_me?: boolean;
  media_count?: number;
}

export interface RoleDetailResp {
  id: string;
  name: string;
  scene_name: string;
  scene_desc: string;
  avatar_url: string;
  figure_url: string;
  background_url: string;
  background_url_mobile?: string;
  attributes: string;
  must_rules: string[];
  must_not_rules: string[];
  events: RoleEvent[];
  visibility?: string;
  publish_status?: string;
  version?: number;
  moderation_note?: string;
  is_owner?: boolean;
  worldview_id?: string;
  worldview_name?: string;
  worldview_summary?: string;
  worldview_background?: string;
  canonical_lang?: string;
  supported_langs?: string[];
  i18n?: Record<string, RoleLocaleContent>;
  voice_reference_id?: string;
  categories?: ExploreRoleCategory[];
  content_rating?: string;
  source?: string;
  official_subtype?: string;
  verified_real_person?: boolean;
  pin_order?: number;
}

export interface RoleLocaleContent {
  name?: string;
  introduction?: string;
  personality?: string[];
  appearance?: string;
  scene_name?: string;
  scene_desc?: string;
  attributes?: string;
}

export interface CreateRoleReq {
  name?: string;
  introduction?: string;
  personality?: string[];
  appearance?: string;
  /** Agent gender: female | male | neutral */
  gender?: string;
  scene_name?: string;
  scene_desc?: string;
  figure_url: string;
  avatar_url?: string;
  background_url?: string;
  voice_reference_id?: string;
  langs?: string[];
  i18n?: Record<string, RoleLocaleContent>;
  source_lang?: string;
}

export interface CreateRoleResp {
  id: string;
  name: string;
  scene_name: string;
}

export interface UploadRoleAssetResp {
  url: string;
  width: number;
  height: number;
  kind: string;
}

export type VoiceCatalogProvider = 'fish' | 'elevenlabs' | 'designed';

export interface VoiceCatalogItem {
  id: string;
  title: string;
  language: string;
  provider?: VoiceCatalogProvider | string;
  /** private | public；公开音色会出现在 Explore */
  visibility?: 'private' | 'public' | string;
}

export interface VoiceCatalogListResp {
  items: VoiceCatalogItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface VoicePreviewReq {
  voice_id: string;
  language?: string;
}

export interface VoicePreviewResp {
  format: 'mp3' | 'wav';
  data: string;
}

export interface UserDesignedVoiceItem {
  voice_id: string;
  title: string;
  language: string;
  prompt: string;
  created_at: number;
  /** private | public */
  visibility?: 'private' | 'public' | string;
}

export interface UserDesignedVoiceListResp {
  items: UserDesignedVoiceItem[];
}

export interface VoiceDesignMetaResp {
  enabled: boolean;
  points_cost: number;
  default_loudness: number;
  default_guidance_scale: number;
  loudness_min: number;
  loudness_max: number;
  guidance_scale_min: number;
  guidance_scale_max: number;
  prompt_min_length?: number;
  prompt_max_length?: number;
}

export interface GenerateVoiceDesignReq {
  prompt: string;
  preview_text?: string;
  auto_generate_text?: boolean;
  loudness?: number;
  guidance_scale?: number;
}

export interface VoiceDesignPreviewItem {
  generated_voice_id: string;
  audio_base64?: string;
  audio_url?: string;
  media_type: string;
  duration_secs: number;
  language: string;
}

export interface GenerateVoiceDesignResp {
  record_id: string;
  preview_text?: string;
  previews: VoiceDesignPreviewItem[];
  status: string;
  points_cost: number;
}

export interface SaveVoiceDesignReq {
  generated_voice_id: string;
  voice_name: string;
}

export interface SaveVoiceDesignResp {
  record_id: string;
  voice_id: string;
  title: string;
  status: string;
}

export interface VoiceDesignRecordItem {
  record_id: string;
  prompt: string;
  loudness: number;
  guidance_scale: number;
  status: string;
  voice_id?: string;
  voice_name?: string;
  error_message?: string;
  points_cost: number;
  created_at: number;
  completed_at?: number;
}

export interface VoiceDesignRecordDetailResp extends VoiceDesignRecordItem {
  preview_text?: string;
  previews: VoiceDesignPreviewItem[];
}

export interface VoiceDesignRecordListResp {
  items: VoiceDesignRecordItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AiImageGenTagItem {
  code: string;
  label: string;
}

export interface AiImageGenTemplateItem {
  template_id: string;
  title: string;
  prompt: string;
  image_url: string;
  tag_codes: string[];
  aspect_ratio: string;
}

export interface AiImageGenMetaResp {
  enabled: boolean;
  i2i_enabled?: boolean;
  aspect_ratios: string[];
  points_cost: number;
  tags: AiImageGenTagItem[];
  templates?: AiImageGenTemplateItem[];
}

export interface GenerateAiImageReq {
  prompt: string;
  tags?: string[];
  aspect_ratio: string;
  style_preset?: string;
  width?: number;
  height?: number;
  seed?: number;
  negative_prompt?: string;
  cfg_scale?: number;
  steps?: number;
  safe_mode?: boolean;
  reference_image_url?: string;
}

export interface UploadAiImageGenReferenceResp {
  image_url: string;
  width: number;
  height: number;
}

export interface GenerateAiImageResp {
  record_id: string;
  image_url?: string;
  status: string;
  points_cost: number;
}

export interface AiImageGenRecordItem {
  record_id: string;
  prompt: string;
  selected_tags: string[];
  aspect_ratio: string;
  status: string;
  image_url?: string;
  error_code?: string;
  error_message?: string;
  points_cost: number;
  created_at: number;
  completed_at?: number;
}

export interface AiImageGenRecordListResp {
  items: AiImageGenRecordItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SubmitAiImageToRoleMediaResp {
  submission_id: string;
  status: string;
  review_queue: 'creator' | 'admin' | string;
}

export interface RoleMediaSubmissionItem {
  submission_id: string;
  role_id: string;
  role_name?: string;
  role_avatar?: string;
  submitter_user_id: string;
  source_record_id: string;
  image_url: string;
  prompt?: string;
  status: string;
  review_queue: string;
  content_rating?: string;
  reject_reason?: string;
  media_id?: string;
  created_at: number;
  reviewed_at?: number;
}

export interface RoleMediaSubmissionListResp {
  items: RoleMediaSubmissionItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ApproveRoleMediaSubmissionReq {
  content_rating: 'standard' | 'r' | 'mature' | string;
}

export interface RejectRoleMediaSubmissionReq {
  reason: string;
}

export interface RoleMediaSubmissionActionResp {
  ok: boolean;
  status: string;
  media_id?: string;
  reject_reason?: string;
}

export interface UserNotificationItem {
  notification_id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: number;
}

export interface UserNotificationListResp {
  items: UserNotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UserNotificationUnreadCountResp {
  count: number;
}

/** AI 生视频 meta / 任务（对齐后端 /ai-video-gen/*） */
export interface AiVideoGenSizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface AiVideoGenModelItem {
  id: string;
  family: string;
  points_cost: number;
  requires_image: boolean;
  requires_end_image: boolean;
  allows_end_image: boolean;
  supports_audio: boolean;
}

/** Incremental pricing anchors from /ai-video-gen/meta (1000pts = $1) */
export interface AiVideoGenPricing {
  ref_duration_sec: number;
  ref_width: number;
  ref_height: number;
  audio_multiplier: number;
  size_scale: string;
  /** Overall percent-off (0–90) after duration/size/audio */
  discount_pct?: number;
}

export interface AiVideoGenMetaResp {
  enabled: boolean;
  balance: number;
  max_inflight: number;
  /** Base Soul points for 5s · low · no audio; actual charge is incremental */
  default_points_cost: number;
  duration_options_sec: number[];
  default_duration_sec: number;
  h3_size_presets: AiVideoGenSizePreset[];
  models: AiVideoGenModelItem[];
  pricing?: AiVideoGenPricing;
}

export interface GenerateAiVideoReq {
  model: string;
  prompt: string;
  image_url?: string;
  end_image_url?: string;
  duration_sec?: number;
  seed?: number;
  enable_audio?: boolean;
  width?: number;
  height?: number;
  size?: string;
}

export interface GenerateAiVideoResp {
  record_id: string;
  status: string;
  points_cost: number;
  progress_pct: number;
}

export interface UploadAiVideoGenReferenceResp {
  image_url: string;
  width: number;
  height: number;
}

export interface AiVideoGenRecordItem {
  record_id: string;
  model: string;
  prompt: string;
  image_url?: string;
  end_image_url?: string;
  duration_sec: number;
  seed?: number | null;
  enable_audio: boolean;
  width?: number;
  height?: number;
  size?: string;
  status: string;
  progress_pct: number;
  stage?: string;
  points_cost: number;
  video_url?: string;
  thumbnail_url?: string;
  error_code?: string;
  error_message?: string;
  created_at: number;
  completed_at?: number;
}

export interface AiVideoGenRecordListResp {
  items: AiVideoGenRecordItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GenerateRolePreviewReq {
  gender: string;
  art_style: string;
  /** Apparent age 0–100, injected into figure prompt. */
  age?: number;
  ethnicity?: string;
  hair_style?: string;
  body_type?: string;
  name?: string;
  introduction?: string;
  personality?: string[];
  appearance?: string;
}

export interface GenerateRolePreviewResp {
  record_id: string;
  status: string;
  quota_cost: number;
  points_cost: number;
  url?: string;
  width?: number;
  height?: number;
  optimized_prompt?: string;
}

export interface RolePreviewMetaResp {
  enabled: boolean;
  free_generations_per_user: number;
  free_remaining: number;
  points_cost: number;
  next_points_cost: number;
}

export interface RolePreviewRecordItem {
  record_id: string;
  status: string;
  quota_cost: number;
  points_cost: number;
  url?: string;
  width?: number;
  height?: number;
  optimized_prompt?: string;
  error_message?: string;
  created_at: number;
  completed_at?: number;
}

export interface UploadUserAvatarResp {
  url: string;
  width: number;
  height: number;
}

export interface ExploreRoleCategory {
  category_id: string;
  name: string;
  /** True when the current user created this explore tag and may delete it. */
  is_mine?: boolean;
}

export interface ExploreRoleItem {
  id: string;
  name: string;
  avatar_url: string;
  figure_url?: string;
  /** 关 R18 列表预览视频：优先 r，其次 standard */
  preview_video_url_r?: string;
  /** 开 R18 列表预览视频：优先 mature，可降级 r → standard */
  preview_video_url_mature?: string;
  introduction: string;
  attributes: string;
  supported_langs?: string[];
  categories?: ExploreRoleCategory[];
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  media_count?: number;
  gift_points_total?: number;
  has_chat_history?: boolean;
  content_rating?: string;
  source?: string;
  official_subtype?: string;
  verified_real_person?: boolean;
  pin_order?: number;
  published_at?: number;
}

export interface ExploreRoleDetailResp {
  id: string;
  name: string;
  avatar_url: string;
  figure_url: string;
  introduction: string;
  attributes: string;
  scene_name: string;
  scene_desc: string;
  supported_langs?: string[];
  stats: RoleCommunityStats;
  creator_user_id?: string;
  creator_nickname?: string;
  content_rating?: string;
  official_subtype?: string;
  verified_real_person?: boolean;
  pin_order?: number;
}

export interface RoleCommentItem {
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
}

export interface RoleCommentListResp {
  data: RoleCommentItem[];
  pagination: { page: number; limit: number; total: number };
}

export interface RoleLikeResp {
  liked: boolean;
  like_count: number;
}

export interface RoleCommentLikeResp {
  liked: boolean;
  like_count: number;
}

export interface ExploreRoleListResp {
  roles: ExploreRoleItem[];
  has_chatted_roles?: boolean;
}

export interface ExploreCategoryListResp {
  items: ExploreRoleCategory[];
}

export interface UpdateRoleReq {
  name?: string;
  introduction?: string;
  personality?: string[];
  appearance?: string;
  scene_name?: string;
  scene_desc?: string;
  figure_url?: string;
  avatar_url?: string;
  background_url?: string;
  voice_reference_id?: string;
  langs?: string[];
  i18n?: Record<string, RoleLocaleContent>;
  source_lang?: string;
  category_ids?: string[];
}

export interface PublishRoleResp {
  publish_status: string;
  moderation_note?: string;
}

export interface RoleRevisionItem {
  version: number;
  change_summary: string;
  created_at: number;
}

export interface RoleRevisionListResp {
  revisions: RoleRevisionItem[];
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'event_r' | 'event' | 'voice' | 'image' | 'media';
  content: string;
  image_url?: string;
  tone: string;
  action: string;
  is_interrupted: boolean;
  created_at: number;
}

export interface GetChatMessagesReq {
  role_id?: string;
  session_id?: string;
}

export interface GetChatMessagesResp {
  session_id: string;
  messages: ChatMessageItem[];
  /** 新 session 正在异步生成开场白；前端应展示 thinking 并等待 WS / 轮询 */
  welcome_pending?: boolean;
}

export interface CreateChatSessionReq {
  role_id: string;
}

export interface CreateChatSessionResp {
  session_id: string;
  inherit_profile: boolean;
  welcome_pending?: boolean;
}

export interface ChatSessionListItem {
  session_id: string;
  status: string;
  inherit_profile: boolean;
  started_at: number;
  ended_at?: number;
  message_count: number;
  last_message_at?: number;
  /** 列表预览文案 */
  preview?: string;
}

export interface ListChatSessionsResp {
  total: number;
  page: number;
  limit: number;
  data: ChatSessionListItem[];
}

/**
 * 跨 Agent 会话列表项（左栏「聊天」历史）。
 * `GET /chat/conversations` — 见 docs/api/chat-conversations.md
 */
export interface ChatConversationListItem {
  role_id: string;
  role_name: string;
  /** 头像 URL（相对或绝对）；前端用 resolveStaticUrl */
  avatar_url?: string;
  /** 该 Agent 下最新（或进行中）会话 id */
  session_id: string;
  /** 列表预览文案（最后一条消息摘要） */
  preview?: string;
  /** Unix 秒或毫秒均可；前端会兼容 */
  last_message_at?: number;
  message_count?: number;
  verified_real_person?: boolean;
  /** 模糊好感度（等级文案 + 进度；不含原始分数） */
  bond?: BondInfo;
}

export interface ListChatConversationsReq {
  page?: number;
  limit?: number;
  /** 按角色名 / 预览文案搜索（可选；未实现时前端本地过滤） */
  q?: string;
}

export interface ListChatConversationsResp {
  total: number;
  page: number;
  limit: number;
  data: ChatConversationListItem[];
}

export interface DeleteChatSessionResp {
  session_id: string;
  deleted: boolean;
}

export interface SendMessageReq {
  session_id: string;
  role_id: string;
  content: string;
  type: 'text' | 'voice' | 'image';
  image_url?: string;
}

export interface RegenerateMessageReq {
  session_id: string;
  role_id: string;
  message_id: string;
}

export interface SendMessageResp {
  message_id: string;
}

export interface ChatQuotaPeriodItem {
  period: 'day' | 'month' | 'year';
  granted: number;
  used: number;
  remaining: number;
  resets_at: number;
}

export interface ChatQuotaResp {
  cost_per_message: number;
  unlimited: boolean;
  plan_code: string;
  periods: ChatQuotaPeriodItem[];
  remaining_messages_hint: number;
}

export interface VoiceQuotaResp {
  enabled: boolean;
  unlimited: boolean;
  plan_code: string;
  periods: ChatQuotaPeriodItem[];
  remaining_hint: number;
}

export interface InterruptReq {
  session_id: string;
}

export interface InterruptResp {
  success: boolean;
}

export interface TriggerEventReq {
  session_id: string;
  role_id: string;
  event_name: string;
}

export interface TriggerEventResp {
  success: boolean;
}

export interface GetChatStateReq {
  session_id?: string;
  role_id?: string;
}

export interface GetInspirationRepliesReq {
  session_id: string;
  role_id: string;
}

export interface InspirationRepliesResp {
  items: string[];
}

/** Fuzzy relationship state — no raw affection points. */
export interface BondInfo {
  bond_state: string;
  bond_label: string;
  bond_hint: string;
  /** 0..1 visual fill for progress bar (not shown as a number). */
  bond_progress?: number;
  tier_changed_recently?: boolean;
  milestones?: string[];
}

export interface ChatStateResp {
  session_id: string;
  mood: string;
  activity: string;
  trust_level: number;
  intimacy_level: number;
  unresolved_topics: string[];
  bond?: BondInfo;
}

export interface GetChatAffectionReq {
  session_id?: string;
  role_id?: string;
}

export interface GetChatAffectionResp {
  role_id: string;
  bond: BondInfo;
}

export type WSMessageType =
  | 'auth'
  | 'auth_ok'
  | 'auth_waiting'
  | 'auth_failed'
  | 'ping'
  | 'pong'
  | 'text'
  | 'text_delta'
  | 'text_finalize'
  | 'tone'
  | 'action'
  | 'done'
  | 'audio'
  | 'audio_chunk'
  | 'audio_done'
  | 'interrupted'
  | 'error'
  | 'bond_update'
  | 'erotic_addiction_unlocked'
  | 'media'
  | 'story_bad_end'
  | 'story_beat_advance'
  | 'story_scene_clear'
  | 'story_image'
  | 'story_reward_enter'
  | 'story_reward_stage'
  | 'story_reward_complete';

export interface WSMessage {
  type: WSMessageType;
  content?: string;
  data?: string;
  format?: string;
  message_id?: string;
  image_url?: string;
  media_id?: string;
  media_type?: string;
  file_url?: string;
  cover_url?: string;
  seq?: number;
  total_chunks?: number;
  ts?: number;
  retry_after?: number;
}

/** Payload inside `bond_update` WS `data` (JSON string). */
export interface BondUpdatePayload {
  bond_state: string;
  bond_label: string;
  bond_hint: string;
  bond_progress?: number;
  tier_changed?: boolean;
  source?: string;
}

/** Payload inside `erotic_addiction_unlocked` WS `data` (JSON string). */
export interface EroticAddictionUnlockedWsPayload {
  role_id: string;
  category: string;
  label: string;
  active_count: number;
  is_first_for_role: boolean;
  all9_achieved: boolean;
  reward_points: number;
}

export interface UploadChatImageResp {
  image_id: string;
  image_url: string;
  width: number;
  height: number;
}

export type PhotoStyle = 'sexy' | 'playful' | 'daily' | 'nsfw';

export interface RequestPhotoReq {
  session_id: string;
  role_id: string;
  style: PhotoStyle;
}

export interface SendMediaResp {
  message_id: string;
  type: string;
  content: string;
  image_url?: string;
  media_id: string;
  media_type: string;
  file_url?: string;
  cover_url?: string;
  content_rating?: string;
  blur_url?: string;
  need_blur?: boolean;
  locked_reason?: string;
}

export interface FreeChatMessage {
  id: string;
  role: 'player' | 'agent' | 'system';
  text: string;
  imageUrl?: string;
  /** text | image (user upload) | media (agent library photo) */
  messageKind?: 'text' | 'image' | 'media';
  timestamp: number;
  agentName?: string;
  agentColor?: string;
  agentAvatar?: string;
  playerAvatar?: string;
  isStreaming?: boolean;
  tone?: string;
  action?: string;
  isInterrupted?: boolean;
  audioData?: string;
  audioFormat?: 'mp3' | 'wav';
}

export interface ASRReq {
  format: string;
  audio_base64: string;
  /** ISO-639-1 hint (zh/en/ja/ru/es); improves accuracy when UI ≠ spoken language */
  language?: string;
}

export interface ASRResp {
  text: string;
}

export type ReferralActivityStatus = 'active' | 'ended';

export interface ReferralValidateResp {
  valid: boolean;
  activity_status: ReferralActivityStatus;
  inviter_nickname?: string;
  invitee_points?: number;
  inviter_points_per_invite?: number;
}

export interface ReferralMeResp {
  invite_code: string;
  share_url: string;
  activity_status: ReferralActivityStatus;
  total_invites: number;
  points_earned_from_referral: number;
  invitee_points: number;
  inviter_points_per_invite: number;
}

export interface ReferralInviteItem {
  invitee_email_masked: string;
  status: string;
  created_at: number;
  completed_at?: number;
}

export interface ReferralInviteListResp {
  items: ReferralInviteItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AffiliateMeResp {
  is_partner: boolean;
  aff_code?: string;
  share_url?: string;
  status?: string;
  total_invitees?: number;
}

export interface AffiliateInviteeItem {
  nickname: string;
  invitee_email_masked: string;
  bound_at: number;
  registered_at: number;
}

export interface AffiliateInviteeListResp {
  items: AffiliateInviteeItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PointsBalanceResp {
  points: number;
}

export interface PointsLedgerItem {
  id: string;
  delta: number;
  balance_after: number;
  source: string;
  remark?: string;
  created_at: number;
}

export interface PointsLedgerListResp {
  items: PointsLedgerItem[];
  total: number;
  page: number;
  limit: number;
}

export type PointsCatalogCategory = 'story_item' | 'story_unlock' | 'other';

export interface PointsCatalogItem {
  id: string;
  code: string;
  category: PointsCatalogCategory;
  name: string;
  description?: string;
  cost_points: number;
  ref_type?: string;
  ref_id?: string;
  image_url?: string;
  reward_type?: string;
  reward_amount?: number;
  repeatable?: boolean;
  owned: boolean;
}

export interface PointsCatalogListResp {
  items: PointsCatalogItem[];
}

export interface ConsumePointsReq {
  catalog_id: string;
  code?: string;
}

export interface ConsumePointsResp {
  catalog_id: string;
  balance_after: number;
  unlock_id: string;
  already_owned: boolean;
}

export interface PointsUnlockItem {
  catalog_id: string;
  code: string;
  category: PointsCatalogCategory;
  name: string;
  ref_type?: string;
  ref_id?: string;
  created_at: number;
}

export interface PointsUnlockListResp {
  items: PointsUnlockItem[];
}

export type SurveyQuestionType =
  | 'text'
  | 'textarea'
  | 'single_choice'
  | 'multi_choice'
  | 'rating';

export interface SurveyQuestionItem {
  question_id: string;
  question_type: SurveyQuestionType;
  title: string;
  description?: string;
  required: boolean;
  sort_order?: number;
  options?: string[];
  config?: string;
}

export interface SurveyItem {
  survey_id: string;
  code: string;
  title: string;
  description: string;
  is_active: boolean;
  allow_resubmit: boolean;
  sort_order: number;
  starts_at?: number;
  ends_at?: number;
  questions?: SurveyQuestionItem[];
  submitted?: boolean;
}

export interface SurveyListResp {
  items: SurveyItem[];
}

export interface SubmitSurveyAnswer {
  question_id: string;
  answer: string;
}

export interface SubmitSurveyReq {
  answers: SubmitSurveyAnswer[];
}

export interface SubmitSurveyResp {
  response_id: string;
}

export interface TaskMilestoneItem {
  threshold: number;
  reward_points: number;
  reached: boolean;
  claimed: boolean;
  claimable: boolean;
}

export interface TaskDailyActivity {
  current: number;
  max: number;
  milestones: TaskMilestoneItem[];
}

export interface TaskItem {
  task_id: string;
  code: string;
  task_type: string;
  title: string;
  description: string;
  reward_points: number;
  activity_points?: number;
  category?: string;
  status: 'in_progress' | 'claimable' | 'claimed' | 'expired';
  progress_value: number;
  progress_target: number;
  claimable: boolean;
  claimed: boolean;
  target_url?: string;
  share_text?: string;
  invite_url?: string;
}

export interface TaskListResp {
  system_enabled: boolean;
  daily_activity?: TaskDailyActivity;
  items: TaskItem[];
}

export interface TaskDetailResp extends TaskItem {}

export interface TaskClaimResp {
  claim_id: string;
  points_granted: number;
  balance_after: number;
  activity_added?: number;
  activity_current?: number;
}

export interface ClaimActivityMilestoneResp {
  claim_id: string;
  threshold: number;
  points_granted: number;
  balance_after: number;
  daily_activity: TaskDailyActivity;
}

export interface TaskDiscordAuthorizeResp {
  authorize_url: string;
}

export interface TaskClaimRecordItem {
  claim_id: string;
  task_id: string;
  task_title?: string;
  points_granted: number;
  created_at: number;
}

export interface TaskClaimListResp {
  items: TaskClaimRecordItem[];
  total: number;
  page: number;
  limit: number;
}

/** Community feed / Agent posts (F1b) */
export type CommunityFeedTab = 'for_you' | 'following';

export interface PostImageView {
  image_url?: string;
  sort_order: number;
  width?: number;
  height?: number;
  media_id?: string;
  content_rating?: string;
  blur_url?: string;
  need_blur?: boolean;
  locked_reason?: string;
  locked?: boolean;
  visibility?: string;
  price_points?: number;
  bundle_id?: string;
  bundle_price_points?: number;
}

export interface RoleMediaItem {
  media_id: string;
  role_id: string;
  media_type: 'image' | 'video' | string;
  visibility: string;
  status?: string;
  price_points: number;
  title?: string;
  description?: string;
  file_url?: string;
  cover_url?: string;
  mime_type?: string;
  file_size?: number;
  duration_ms?: number;
  width?: number;
  height?: number;
  sort_order: number;
  locked?: boolean;
  published_at?: number;
  created_at?: number;
  /** Sold only via published pack when set. */
  bundle_id?: string;
  bundle_price_points?: number;
  content_rating?: string;
  blur_url?: string;
  blur_cover_url?: string;
  need_blur?: boolean;
  locked_reason?: string;
  unlock_requirements?: {
    min_affection_tier?: string;
    affection_met?: boolean;
    price_points?: number;
    points_met?: boolean;
    min_vip_tier?: number;
    vip_met?: boolean;
  };
  caption_status?: string;
  caption_prompt?: string;
  suggested_rating?: string;
  rating_pending?: boolean;
}

export interface RoleMediaListResp {
  items: RoleMediaItem[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  image_count?: number;
  video_count?: number;
  gallery_unlocked?: boolean;
  gallery_unlock_price?: number;
  gallery_unlock_eligible?: boolean;
}

export interface UnlockGalleryResp {
  role_id: string;
  already_owned: boolean;
  points_spent?: number;
  creator_earn_points?: number;
}

export interface UploadRoleMediaResp {
  media_id: string;
  url: string;
  status: string;
}

export interface UpdateRoleMediaReq {
  visibility?: string;
  price_points?: number;
  title?: string;
  description?: string;
  cover_url?: string;
  sort_order?: number;
  content_rating?: string;
}

export interface ConfirmMediaRatingReq {
  accept: boolean;
}

export interface UnlockMediaResp {
  media_id: string;
  already_owned: boolean;
  file_url?: string;
  points_spent?: number;
  creator_earn_points?: number;
}

export interface RoleMediaBundleItemView {
  media_id: string;
  media_type?: string;
  cover_url?: string;
  file_url?: string;
  title?: string;
  locked?: boolean;
  content_rating?: string;
  need_blur?: boolean;
  blur_url?: string;
}

export interface RoleMediaBundleView {
  bundle_id: string;
  role_id: string;
  title?: string;
  description?: string;
  cover_url?: string;
  price_points: number;
  status?: string;
  sort_order: number;
  media_ids: string[];
  media_count: number;
  items?: RoleMediaBundleItemView[];
  locked?: boolean;
  published_at?: number;
  created_at?: number;
}

export interface RoleMediaBundleListResp {
  items: RoleMediaBundleView[];
}

export interface CreateRoleMediaBundleReq {
  title?: string;
  description?: string;
  cover_url?: string;
  price_points: number;
  media_ids: string[];
  sort_order?: number;
}

export interface UpdateRoleMediaBundleReq {
  title?: string;
  description?: string;
  cover_url?: string;
  price_points?: number;
  media_ids?: string[];
  sort_order?: number;
}

export interface UnlockMediaBundleResp {
  bundle_id: string;
  already_owned: boolean;
  media_ids: string[];
  points_spent?: number;
  creator_earn_points?: number;
}

export interface GiftItemView {
  gift_id: string;
  source: string;
  name: string;
  description?: string;
  cost_points: number;
  image_url: string;
  status?: string;
  sort_order?: number;
  created_at?: number;
  effect_tier?: number;
}

export interface GiftCatalogResp {
  items: GiftItemView[];
}

export interface SendGiftReq {
  gift_id: string;
  quantity?: number;
  client_gift_id?: string;
}

export interface SendGiftResp {
  role_gift_id: string;
  points_spent: number;
  platform_cut_percent: number;
  platform_cut_points: number;
  creator_earn_points: number;
  already_processed?: boolean;
  effect_tier?: number;
  gift_name?: string;
  gift_image_url?: string;
  reward?: SendMediaResp;
}

export interface PostItem {
  post_id: string;
  role_id: string;
  author_user_id: string;
  content: string;
  lang: string;
  status?: string;
  /** post = Social Feed; forum = Web forum */
  surface?: 'post' | 'forum' | string;
  /** Forum board slug when surface=forum */
  board?: ForumBoardSlug | string;
  like_count: number;
  comment_count?: number;
  char_count: number;
  images: PostImageView[];
  liked_by_me?: boolean;
  published_at?: number;
  created_at?: number;
  has_mature_media?: boolean;
  source?: string;
  trigger?: string;
  /** agent = Agent persona; user = personal identity */
  author_kind?: 'agent' | 'user' | string;
  role_name?: string;
  role_avatar?: string;
  verified_real_person?: boolean;
}

export type ForumBoardSlug = 'general' | 'works' | 'social' | 'verified';

export interface CreateForumPostReq {
  content?: string;
  lang?: string;
  image_urls?: string[];
  board: ForumBoardSlug;
}

export interface ForumBoardItem {
  slug: ForumBoardSlug | string;
  requires_review: boolean;
}

export interface ForumBoardsResp {
  items: ForumBoardItem[];
}

export interface CreatePostReq {
  content?: string;
  lang?: string;
  image_urls?: string[];
}

export interface UploadPostMediaResp {
  url: string;
}

export interface PostCommentItem {
  comment_id: string;
  post_id: string;
  role_id: string;
  author_type: 'user' | 'agent' | string;
  user_id?: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  reply_to_comment_id?: string;
  source?: string;
  like_count?: number;
  liked_by_me?: boolean;
  created_at: number;
}

export interface PostCommentListResp {
  items: PostCommentItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface PostListResp {
  items: PostItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface PostLikeResp {
  liked: boolean;
  like_count: number;
}

/** `GET /api/v1/creators/:user_id` */
export interface CreatorProfileResp {
  user_id: string;
  nickname: string;
  avatar_url?: string;
  follower_count: number;
  like_count: number;
  agents_like_total: number;
  agents_follower_total: number;
  agents_gift_points_total: number;
  agents_view_total: number;
  published_agent_count: number;
  followed_by_me?: boolean;
  liked_by_me?: boolean;
}

export interface FollowingCreatorItem {
  user_id: string;
  nickname: string;
  avatar_url?: string;
  follower_count: number;
  like_count: number;
  published_agent_count: number;
  followed_at?: number;
}

/** `GET /api/v1/me/following/creators` */
export interface MeFollowingCreatorsResp {
  creators: FollowingCreatorItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

/** Soul wallet / redeem / withdraw (`/soul/*`) */
export interface SoulWalletResp {
  soul_balance: number;
  /** @deprecated alias of soul_balance */
  points?: number;
  withdrawable_soul: number;
  available_cents: number;
  lifetime_redeemed_cents?: number;
  lifetime_withdrawn_cents?: number;
  payout_method: string;
  payout_account: string;
  stripe_connected_account_id?: string;
  is_banned: boolean;
  is_enabled: boolean;
  soul_per_usd: number;
  min_redeem_soul: number;
  min_withdraw_cents: number;
  fee_mode: string;
  fee_value: number;
  fee_min_cents: number;
  fee_max_cents?: number | null;
  fee_preview_cents: number;
  payout_provider_mode: string;
  stripe_ready?: boolean;
}

export interface SoulRedeemReq {
  soul: number;
}

export interface SoulRedeemResp {
  redeem_id: string;
  soul_balance: number;
  points?: number;
  withdrawable_soul: number;
  available_cents: number;
  usd_cents: number;
  soul_per_usd: number;
}

export interface SoulWithdrawReq {
  amount_cents: number;
}

export interface SoulWithdrawalItem {
  withdrawal_id: string;
  amount_cents: number;
  fee_cents: number;
  net_payout_cents: number;
  status: string;
  payout_method: string;
  payout_account: string;
  payout_ref?: string;
  admin_note?: string;
  paid_at?: number;
  created_at: number;
  updated_at: number;
}

export interface SoulWithdrawResp {
  withdrawal: SoulWithdrawalItem;
  available_cents: number;
}

export interface SoulWithdrawalsResp {
  items: SoulWithdrawalItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SoulPayoutAccountReq {
  payout_method: string;
  payout_account?: string;
}

export interface SoulPayoutAccountResp {
  payout_method: string;
  payout_account: string;
  stripe_connected_account_id?: string;
  stripe_ready?: boolean;
}

export interface SoulStripeOnboardingReq {
  return_url?: string;
  refresh_url?: string;
}

export interface SoulStripeOnboardingResp {
  onboarding_url?: string;
  expires_at?: number;
  stripe_connected_account_id: string;
  already_ready: boolean;
  stripe_ready: boolean;
}

export interface CampaignListItem {
  campaign_id: string;
  name: string;
  description: string;
  banner_url?: string;
  starts_at?: number;
  ends_at?: number;
}

export interface CampaignListResp {
  items: CampaignListItem[];
}

/** 社区造角赛（UGC 赛季） */
export interface ContestListItem {
  contest_id: string;
  slug: string;
  name: string;
  status: string;
  starts_at?: number;
  ends_at?: number;
  banner_url?: string;
  theme_title?: string;
}

export interface ContestListResp {
  items: ContestListItem[];
}

export interface ContestThemeView {
  theme_id: string;
  title: string;
  subtitle?: string;
  sort_order: number;
  is_primary?: boolean;
  starts_at?: number;
  ends_at?: number;
  is_current?: boolean;
}

export interface ContestPrizeView {
  prize_id: string;
  rank_from: number;
  rank_to: number;
  reward_soul: number;
  reward_usdt: number;
  badge_key?: string;
}

export interface ContestDetailResp {
  contest_id: string;
  slug: string;
  name: string;
  description: string;
  status: string;
  starts_at?: number;
  ends_at?: number;
  themes: ContestThemeView[];
  prizes: ContestPrizeView[];
  banner_url?: string;
  hero_url?: string;
  rules_markdown?: string;
}

export interface ContestLeaderboardItem {
  rank: number;
  entry_id: string;
  entry_type?: string;
  subject_id?: string;
  role_id: string;
  role_name: string;
  role_avatar_url?: string;
  creator_user_id?: string;
  creator_nickname?: string;
  theme_id?: string;
  score: number;
  chat_users?: number;
  like_count?: number;
  follow_count?: number;
  gift_points?: number;
}

export interface ContestLeaderboardResp {
  contest_id: string;
  theme_id?: string;
  status: string;
  items: ContestLeaderboardItem[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface CampaignRoleItem {
  role_id: string;
  role_name: string;
  avatar_url?: string;
  figure_url?: string;
  introduction?: string;
  sort_order: number;
}

export interface CampaignMediaProgressItem {
  media_id: string;
  role_id: string;
  min_affection_tier?: string;
  min_affection_points?: number;
  unlocked: boolean;
  title?: string;
  file_url?: string;
  cover_url?: string;
  media_type?: string;
  content_rating?: string;
}

export interface CampaignTaskProgressItem {
  task_id: string;
  role_id: string;
  task_type: string;
  title: string;
  description: string;
  reward_points: number;
  available_below_tier: string;
  min_messages: number;
  status: string;
  progress_value: number;
  progress_target: number;
}

export interface CampaignDetailResp {
  campaign_id: string;
  name: string;
  description: string;
  banner_url?: string;
  starts_at?: number;
  ends_at?: number;
  roles: CampaignRoleItem[];
  media: CampaignMediaProgressItem[];
  tasks: CampaignTaskProgressItem[];
}

export interface CampaignClaimResp {
  claim_id: string;
  points_granted: number;
  balance_after: number;
}

export interface CampaignTaskBoardRole {
  role_id: string;
  role_name: string;
}

export interface CampaignTaskBoardItem {
  campaign_id: string;
  name: string;
  starts_at?: number;
  ends_at?: number;
  roles: CampaignTaskBoardRole[];
  tasks: CampaignTaskProgressItem[];
}

export interface CampaignTaskBoardResp {
  items: CampaignTaskBoardItem[];
}
