import { apiFetch } from './client';

export type AutoPostConfig = {
  role_id: string;
  enabled: boolean;
  interact_enabled: boolean;
  trending_enabled: boolean;
  require_review: boolean;
  daily_quota: number;
  timezone: string;
  active_start_minute: number;
  active_end_minute: number;
  allow_mature_media: boolean;
  media_weight_standard: number;
  media_weight_r: number;
  media_weight_mature: number;
  caption_min_score: number;
  post_liked_threshold: number;
  updated_at?: number;
};

export type UpdateAutoPostConfigBody = {
  enabled?: boolean;
  interact_enabled?: boolean;
  trending_enabled?: boolean;
  require_review?: boolean;
  daily_quota?: number;
  timezone?: string;
  active_start_minute?: number;
  active_end_minute?: number;
  allow_mature_media?: boolean;
  media_weight_standard?: number;
  media_weight_r?: number;
  media_weight_mature?: number;
  caption_min_score?: number;
  post_liked_threshold?: number;
};

/** `GET /api/v1/roles/:id/auto-post/config` — missing row returns product defaults. */
export function getAutoPostConfig(roleId: string) {
  return apiFetch<AutoPostConfig>(`/roles/${encodeURIComponent(roleId)}/auto-post/config`);
}

/** `PUT /api/v1/roles/:id/auto-post/config` — persists schedule / switches permanently. */
export function updateAutoPostConfig(roleId: string, body: UpdateAutoPostConfigBody) {
  return apiFetch<AutoPostConfig>(`/roles/${encodeURIComponent(roleId)}/auto-post/config`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/** Product default when creator has not customized. */
export const DEFAULT_AUTO_POST_TIMEZONE = 'Etc/GMT+5'; // fixed UTC-5
export const DEFAULT_ACTIVE_START_MINUTE = 8 * 60;
export const DEFAULT_ACTIVE_END_MINUTE = 24 * 60;
export const DEFAULT_MEDIA_WEIGHT_STANDARD = 80;
export const DEFAULT_MEDIA_WEIGHT_R = 20;
export const DEFAULT_MEDIA_WEIGHT_MATURE = 0;

export function clampMediaWeight(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

/** Common IANA zones for Community Schedule (labels are shown in UI). */
export type AutoPostTimezoneOption = {
  id: string;
  /** Short offset badge, e.g. UTC−5 */
  offset: string;
  en: string;
  zh: string;
};

export const AUTO_POST_TIMEZONE_OPTIONS: AutoPostTimezoneOption[] = [
  { id: 'Etc/GMT+5', offset: 'UTC−5', en: 'UTC−5 (default)', zh: 'UTC−5（默认）' },
  { id: 'UTC', offset: 'UTC±0', en: 'UTC', zh: '世界协调时 UTC' },
  { id: 'America/New_York', offset: 'UTC−5/−4', en: 'Eastern Time (US)', zh: '美国东部' },
  { id: 'America/Chicago', offset: 'UTC−6/−5', en: 'Central Time (US)', zh: '美国中部' },
  { id: 'America/Denver', offset: 'UTC−7/−6', en: 'Mountain Time (US)', zh: '美国山地' },
  { id: 'America/Los_Angeles', offset: 'UTC−8/−7', en: 'Pacific Time (US)', zh: '美国太平洋' },
  { id: 'Europe/London', offset: 'UTC±0/+1', en: 'London', zh: '伦敦' },
  { id: 'Europe/Paris', offset: 'UTC+1/+2', en: 'Central Europe', zh: '欧洲中部' },
  { id: 'Asia/Dubai', offset: 'UTC+4', en: 'Dubai', zh: '迪拜' },
  { id: 'Asia/Shanghai', offset: 'UTC+8', en: 'China (Beijing)', zh: '中国（北京）' },
  { id: 'Asia/Singapore', offset: 'UTC+8', en: 'Singapore', zh: '新加坡' },
  { id: 'Asia/Tokyo', offset: 'UTC+9', en: 'Tokyo', zh: '东京' },
  { id: 'Australia/Sydney', offset: 'UTC+10/+11', en: 'Sydney', zh: '悉尼' },
];

export function timezoneOptionLabel(opt: AutoPostTimezoneOption, lang: string): string {
  return lang === 'zh' ? opt.zh : opt.en;
}

export function findTimezoneOption(id: string): AutoPostTimezoneOption | undefined {
  return AUTO_POST_TIMEZONE_OPTIONS.find((o) => o.id === id);
}

/** Classify window: same calendar day, overnight (crosses midnight), or all-day. */
export function classifyScheduleWindow(
  startHour: number,
  endHour: number,
): 'same_day' | 'overnight' | 'all_day' {
  const start = hourToMinutes(startHour);
  const end = hourToMinutes(endHour);
  if (start === end) return 'all_day';
  if (start < end) return 'same_day';
  return 'overnight';
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function minutesToHour(minute: number): number {
  if (minute >= 1440) return 24;
  if (minute <= 0) return 0;
  return Math.floor(minute / 60);
}

export function hourToMinutes(hour: number): number {
  if (hour >= 24) return 1440;
  if (hour <= 0) return 0;
  return hour * 60;
}
