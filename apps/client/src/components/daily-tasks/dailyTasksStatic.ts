import type { TaskDailyActivity } from '../../types/api';

/** API 未返回 daily_activity 时的兜底（与后台默认一致） */
export const FALLBACK_DAILY_ACTIVITY: TaskDailyActivity = {
  current: 0,
  max: 100,
  milestones: [
    { threshold: 25, reward_points: 25, reached: false, claimed: false, claimable: false },
    { threshold: 50, reward_points: 50, reached: false, claimed: false, claimable: false },
    { threshold: 75, reward_points: 75, reached: false, claimed: false, claimable: false },
    { threshold: 100, reward_points: 100, reached: false, claimed: false, claimable: false },
  ],
};

export function normalizeDailyActivity(raw?: TaskDailyActivity | null): TaskDailyActivity {
  if (!raw) return { ...FALLBACK_DAILY_ACTIVITY, milestones: [...FALLBACK_DAILY_ACTIVITY.milestones] };
  return {
    current: raw.current ?? 0,
    max: raw.max > 0 ? raw.max : 100,
    milestones: raw.milestones ?? [],
  };
}
