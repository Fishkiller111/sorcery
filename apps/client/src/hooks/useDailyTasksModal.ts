import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import {
  ackTask,
  claimActivityMilestone,
  claimTask,
  getTaskDiscordAuthorize,
  listTasks,
  reportTaskShare,
} from '../api/tasks';
import type { TaskDailyActivity, TaskItem } from '../types/api';
import { normalizeDailyActivity } from '../components/daily-tasks/dailyTasksStatic';
import { Message } from '../components/ui/Message';
import { shareTaskLink } from '../utils/copyOrShare';
import { formatApiError } from '../utils/apiError';
import {
  BOOKMARK_APP_TASK_TYPE,
  isStandaloneWebApp,
  shouldShowBookmarkAppTask,
} from '../utils/webBookmark';

export function useDailyTasksModal(
  visible: boolean,
  t: (key: string) => string,
  onBindEmail?: () => void,
) {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dailyActivity, setDailyActivity] = useState<TaskDailyActivity>(() => normalizeDailyActivity());
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [busyMilestoneThreshold, setBusyMilestoneThreshold] = useState<number | null>(null);
  const [bookmarkGuideOpen, setBookmarkGuideOpen] = useState(false);
  const [bookmarkGuideTask, setBookmarkGuideTask] = useState<TaskItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await listTasks();
      setSystemEnabled(resp.system_enabled);
      let items = (resp.items ?? []).filter(
        (task) => task.task_type !== BOOKMARK_APP_TASK_TYPE || shouldShowBookmarkAppTask(),
      );
      if (shouldShowBookmarkAppTask() && isStandaloneWebApp()) {
        const pending = items.filter(
          (task) =>
            task.task_type === BOOKMARK_APP_TASK_TYPE &&
            !task.claimed &&
            task.status !== 'claimed' &&
            !task.claimable &&
            task.status !== 'claimable',
        );
        if (pending.length > 0) {
          await Promise.all(pending.map((task) => ackTask(task.task_id).catch(() => undefined)));
          const refreshed = await listTasks();
          setSystemEnabled(refreshed.system_enabled);
          items = (refreshed.items ?? []).filter(
            (task) => task.task_type !== BOOKMARK_APP_TASK_TYPE || shouldShowBookmarkAppTask(),
          );
          setDailyActivity(normalizeDailyActivity(refreshed.daily_activity));
          setTasks(items);
          return;
        }
      }
      setTasks(items);
      setDailyActivity(normalizeDailyActivity(resp.daily_activity));
    } catch (err) {
      setTasks([]);
      Message.error(formatApiError(t, err));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  const handleMilestoneClaim = useCallback(
    async (threshold: number) => {
      if (busyMilestoneThreshold != null || busyTaskId) return;
      setBusyMilestoneThreshold(threshold);
      try {
        const resp = await claimActivityMilestone(threshold);
        setDailyActivity(normalizeDailyActivity(resp.daily_activity));
        Message.success(
          `${t('dailyTasks.claimSuccess')} · ${t('dailyTasks.pointsReward').replace('{points}', String(resp.points_granted))}`,
        );
      } catch (err) {
        Message.error(formatApiError(t, err));
      } finally {
        setBusyMilestoneThreshold(null);
      }
    },
    [busyMilestoneThreshold, busyTaskId, t],
  );

  const handleTaskAction = useCallback(
    async (task: TaskItem) => {
      if (busyTaskId || busyMilestoneThreshold != null) return;
      setBusyTaskId(task.task_id);
      try {
        if (task.claimable || task.status === 'claimable') {
          const resp = await claimTask(task.task_id);
          Message.success(
            `${t('dailyTasks.claimSuccess')} · ${t('dailyTasks.pointsReward').replace('{points}', String(resp.points_granted))}`,
          );
          await load();
          return;
        }

        if (task.task_type === 'follow_x' || task.task_type === 'follow_telegram') {
          const link = task.target_url || task.invite_url;
          if (link) {
            await Linking.openURL(link);
          }
          await ackTask(task.task_id);
          await load();
          return;
        }

        if (task.task_type === 'follow_discord') {
          const returnUrl =
            Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : undefined;
          const resp = await getTaskDiscordAuthorize(task.task_id, returnUrl);
          if (resp.authorize_url) {
            await Linking.openURL(resp.authorize_url);
          }
          return;
        }

        if (task.task_type === 'bind_email') {
          onBindEmail?.();
          return;
        }

        if (task.task_type === BOOKMARK_APP_TASK_TYPE) {
          setBookmarkGuideTask(task);
          setBookmarkGuideOpen(true);
          return;
        }

        if (task.task_type === 'share_link') {
          const url = task.target_url?.trim();
          if (!url) {
            Message.error(t('dailyTasks.shareNoUrl'));
            return;
          }
          const shared = await shareTaskLink({
            url,
            text: task.share_text,
            title: task.title,
          });
          if (!shared) {
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) {
              Message.error(t('dailyTasks.shareNotSupported'));
            } else {
              Message.warning(t('dailyTasks.shareCancelled'));
            }
            return;
          }
          await reportTaskShare(task.task_id);
          await load();
          return;
        }

        const link = task.target_url || task.invite_url;
        if (link) {
          await Linking.openURL(link);
        }
      } catch (err) {
        Message.error(formatApiError(t, err));
      } finally {
        setBusyTaskId(null);
      }
    },
    [busyMilestoneThreshold, busyTaskId, load, onBindEmail, t],
  );

  const closeBookmarkGuide = useCallback(() => {
    setBookmarkGuideOpen(false);
    setBookmarkGuideTask(null);
  }, []);

  const confirmBookmark = useCallback(async () => {
    const task = bookmarkGuideTask;
    if (!task || busyTaskId || busyMilestoneThreshold != null) return;
    setBusyTaskId(task.task_id);
    try {
      await ackTask(task.task_id);
      setBookmarkGuideOpen(false);
      setBookmarkGuideTask(null);
      await load();
    } catch (err) {
      Message.error(formatApiError(t, err));
    } finally {
      setBusyTaskId(null);
    }
  }, [bookmarkGuideTask, busyMilestoneThreshold, busyTaskId, load, t]);

  useEffect(() => {
    if (visible) return;
    setBookmarkGuideOpen(false);
    setBookmarkGuideTask(null);
  }, [visible]);

  return {
    loading,
    tasks,
    dailyActivity,
    systemEnabled,
    busyTaskId,
    busyMilestoneThreshold,
    bookmarkGuideOpen,
    handleTaskAction,
    handleMilestoneClaim,
    closeBookmarkGuide,
    confirmBookmark,
    reload: load,
  };
}
