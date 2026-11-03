import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { themedScrollViewProps } from '../../../theme/webScrollbar';
import { MessageHost } from '../../../components/ui/Message';
import { useDailyTasksModal } from '../../../hooks/useDailyTasksModal';
import {
  useCampaignTaskBoard,
  type CampaignProgressView,
  type CampaignRoleProgressView,
} from '../../../hooks/useCampaignTaskBoard';
import type {
  CampaignTaskProgressItem,
  TaskDailyActivity,
  TaskItem,
  TaskMilestoneItem,
} from '../../../types/api';
import { isMobileWeb } from '../../../utils/webBookmark';
import { resolveStaticUrl } from '../../../constants/config';
import { TOKENS } from '../theme/tokens';

type TasksTab = 'daily' | 'achievement' | 'campaign';

function isAchievementTask(task: TaskItem): boolean {
  if (task.task_type === 'daily_checkin' || task.task_type === 'share_link') return false;
  if (task.category === 'achievement') return true;
  if (task.category === 'daily') return false;
  return true;
}

type DefaultDailyTasksModalProps = {
  visible: boolean;
  onClose: () => void;
  onBindEmail?: () => void;
};

function getActivityHint(dailyActivity: TaskDailyActivity, t: (key: string) => string): string {
  const { current, milestones } = dailyActivity;
  if (milestones.some((m) => m.claimable)) {
    return t('dailyTasks.activityHintClaimable');
  }
  if (milestones.length > 0 && milestones.every((m) => m.claimed)) {
    return t('dailyTasks.activityHintAllDone');
  }
  const next = milestones.find((m) => !m.reached && !m.claimed);
  if (!next) {
    return milestones.some((m) => m.reached && !m.claimed)
      ? t('dailyTasks.activityHintClaimable')
      : t('dailyTasks.activityHintAllDone');
  }
  const remaining = Math.max(0, next.threshold - current);
  if (remaining <= 0) {
    return t('dailyTasks.activityHintClaimable');
  }
  return t('dailyTasks.activityHintRemaining').replace('{points}', String(remaining));
}

function ActivityRing({ current, max, size }: { current: number; max: number; size: number }) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, current / max) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={TOKENS.colors.accent}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function MilestoneDot({
  milestone,
  busy,
  onClaim,
}: {
  milestone: TaskMilestoneItem;
  busy: boolean;
  onClaim: (threshold: number) => void;
}) {
  const reached = milestone.reached || milestone.claimable || milestone.claimed;
  const showReward = reached && milestone.reward_points > 0;
  const content = milestone.claimed ? (
    <Ionicons name="checkmark" size={14} color={TOKENS.colors.textSecondary} />
  ) : showReward ? (
    <Text style={styles.milestoneDotText}>{milestone.reward_points}</Text>
  ) : null;

  const dotStyle = [
    styles.milestoneDot,
    reached && styles.milestoneDotReached,
    milestone.claimable && styles.milestoneDotClaimable,
    milestone.claimed && styles.milestoneDotClaimed,
  ];

  if (milestone.claimable) {
    return (
      <Pressable
        style={dotStyle}
        disabled={busy}
        onPress={() => onClaim(milestone.threshold)}
        accessibilityRole="button"
        accessibilityLabel={`Claim ${milestone.reward_points}`}
      >
        {busy ? <ActivityIndicator size="small" color={TOKENS.colors.accent} /> : content}
      </Pressable>
    );
  }

  return <View style={dotStyle}>{content}</View>;
}

function TaskRow({
  task,
  busy,
  onAction,
}: {
  task: TaskItem;
  busy: boolean;
  onAction: (task: TaskItem) => void;
}) {
  const { t } = useI18n();
  const progressRatio =
    task.progress_target > 0 ? Math.min(1, task.progress_value / task.progress_target) : 0;
  const showProgress =
    task.task_type === 'chat_with_role' ||
    task.task_type === 'story_chapter_clear' ||
    task.task_type === 'publish_role' ||
    task.task_type === 'publish_world' ||
    task.task_type === 'checkin_streak' ||
    task.task_type === 'reach_affection' ||
    task.task_type === 'like_role' ||
    task.task_type === 'follow_role' ||
    task.task_type === 'post_likes_received' ||
    (task.progress_target > 1 && !task.claimed);

  let actionLabel = t('dailyTasks.goComplete');
  let actionDisabled = false;
  let actionMuted = false;

  if (task.claimed || task.status === 'claimed') {
    actionLabel = t('dailyTasks.completed');
    actionDisabled = true;
    actionMuted = true;
  } else if (task.status === 'expired') {
    actionLabel = t('dailyTasks.expired');
    actionDisabled = true;
    actionMuted = true;
  } else if (task.claimable || task.status === 'claimable') {
    actionLabel =
      task.task_type === 'daily_checkin' ? t('dailyTasks.checkIn') : t('dailyTasks.claim');
  } else if (task.task_type === 'follow_x' || task.task_type === 'follow_telegram') {
    actionLabel = t('dailyTasks.confirmDone');
  }

  return (
    <View style={styles.taskRow}>
      <View style={styles.taskBody}>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
        {showProgress ? (
          <>
            <View style={styles.taskProgressTrack}>
              <View style={[styles.taskProgressFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
            </View>
            {task.progress_target > 1 ? (
              <Text style={styles.taskProgressLabel}>
                {t('dailyTasks.progressCount')
                  .replace('{current}', String(task.progress_value))
                  .replace('{target}', String(task.progress_target))}
              </Text>
            ) : null}
          </>
        ) : null}
        <View style={styles.taskRewardRow}>
          {task.reward_points > 0 ? (
            <Text style={styles.taskReward}>
              {t('dailyTasks.pointsReward').replace('{points}', String(task.reward_points))}
            </Text>
          ) : null}
          {(task.activity_points ?? 0) > 0 ? (
            <Text style={styles.taskActivityReward}>
              {t('dailyTasks.activityReward').replace('{points}', String(task.activity_points))}
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.taskAction, actionMuted && styles.taskActionMuted, busy && styles.taskActionBusy]}
        disabled={actionDisabled || busy}
        activeOpacity={0.85}
        onPress={() => onAction(task)}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.taskActionText, actionMuted && styles.taskActionTextMuted]} numberOfLines={1}>
            {actionLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function CampaignTaskRow({
  task,
  busy,
  onClaim,
  onChat,
}: {
  task: CampaignTaskProgressItem;
  busy: boolean;
  onClaim: (taskId: string) => void;
  onChat: (roleId: string) => void;
}) {
  const { t } = useI18n();
  const progressRatio =
    task.progress_target > 0 ? Math.min(1, task.progress_value / task.progress_target) : 0;
  const showProgress = task.progress_target > 1 && task.status !== 'claimed';
  const claimed = task.status === 'claimed';
  const claimable = task.status === 'claimable';
  const locked = task.status === 'locked';

  let actionLabel = t('dailyTasks.goChat');
  let actionDisabled = false;
  let actionMuted = false;
  if (claimed) {
    actionLabel = t('campaign.claimed');
    actionDisabled = true;
    actionMuted = true;
  } else if (locked) {
    actionLabel = t('campaign.locked');
    actionDisabled = true;
    actionMuted = true;
  } else if (claimable) {
    actionLabel = t('dailyTasks.claim');
  }

  return (
    <View style={styles.taskRow}>
      <View style={styles.taskBody}>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
        {showProgress ? (
          <>
            <View style={styles.taskProgressTrack}>
              <View style={[styles.taskProgressFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
            </View>
            <Text style={styles.taskProgressLabel}>
              {t('dailyTasks.progressCount')
                .replace('{current}', String(task.progress_value))
                .replace('{target}', String(task.progress_target))}
            </Text>
          </>
        ) : null}
        {task.reward_points > 0 ? (
          <Text style={styles.taskReward}>
            {t('dailyTasks.pointsReward').replace('{points}', String(task.reward_points))}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.taskAction, actionMuted && styles.taskActionMuted, busy && styles.taskActionBusy]}
        disabled={actionDisabled || busy}
        activeOpacity={0.85}
        onPress={() => {
          if (claimable) onClaim(task.task_id);
          else if (task.role_id) onChat(task.role_id);
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.taskActionText, actionMuted && styles.taskActionTextMuted]} numberOfLines={1}>
            {actionLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function campaignProgressHint(board: CampaignProgressView, t: (key: string) => string): string {
  if (board.taskTotal > 0 && board.claimedTasks >= board.taskTotal) {
    return t('dailyTasks.campaignHintAllDone');
  }
  const remainingTasks = Math.max(0, board.taskTotal - board.claimedTasks);
  if (remainingTasks > 0) {
    return t('dailyTasks.campaignHintRemaining').replace('{n}', String(remainingTasks));
  }
  if (board.mediaTotal > 0 && board.unlockedCount < board.mediaTotal) {
    return t('dailyTasks.campaignHintUnlock').replace(
      '{n}',
      String(board.mediaTotal - board.unlockedCount),
    );
  }
  return t('dailyTasks.campaignSubtitle');
}

function RoleProgressCard({
  role,
  busyTaskId,
  onClaim,
  onChat,
}: {
  role: CampaignRoleProgressView;
  busyTaskId: string | null;
  onClaim: (taskId: string) => void;
  onChat: (roleId: string) => void;
}) {
  const { t, lang } = useI18n();
  const avatarUri = role.avatarUrl ? resolveStaticUrl(role.avatarUrl) : undefined;
  const unlockRatio = role.mediaTotal > 0 ? Math.min(1, role.unlockedCount / role.mediaTotal) : 0;
  const stageRatio = role.taskTotal > 0 ? Math.min(1, role.claimedTasks / role.taskTotal) : 0;
  const canChat = Boolean(role.roleId && role.roleId !== '_');

  return (
    <View style={styles.roleCard}>
      <View style={styles.roleHeader}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.roleAvatar} />
        ) : (
          <View style={styles.roleAvatarFallback}>
            <Ionicons name="person" size={14} color={TOKENS.colors.textMuted} />
          </View>
        )}
        <Text style={Typo(styles.roleName, 'sans', lang)} numberOfLines={1}>
          {role.roleName || t('campaign.roles')}
        </Text>
        {canChat ? (
          <Pressable
            onPress={() => onChat(role.roleId)}
            style={styles.roleChatBtn}
            accessibilityRole="button"
          >
            <Text style={styles.roleChatText}>{t('dailyTasks.goChat')}</Text>
          </Pressable>
        ) : null}
      </View>

      {role.mediaTotal > 0 ? (
        <View style={styles.roleMetric}>
          <Text style={Typo(styles.roleMetricLabel, 'sans', lang)}>
            {t('dailyTasks.unlockProgress')
              .replace('{current}', String(role.unlockedCount))
              .replace('{target}', String(role.mediaTotal))}
          </Text>
          <View style={styles.taskProgressTrack}>
            <View style={[styles.taskProgressFill, { width: `${Math.round(unlockRatio * 100)}%` }]} />
          </View>
        </View>
      ) : null}

      {role.taskTotal > 0 ? (
        <View style={styles.roleMetric}>
          <Text style={Typo(styles.roleMetricLabel, 'sans', lang)}>
            {t('dailyTasks.stageProgress')
              .replace('{current}', String(role.claimedTasks))
              .replace('{target}', String(role.taskTotal))}
          </Text>
          <View style={styles.taskProgressTrack}>
            <View style={[styles.taskProgressFill, { width: `${Math.round(stageRatio * 100)}%` }]} />
          </View>
        </View>
      ) : null}

      {role.tasks.map((task) => (
        <CampaignTaskRow
          key={task.task_id}
          task={task}
          busy={busyTaskId === task.task_id}
          onClaim={onClaim}
          onChat={onChat}
        />
      ))}
    </View>
  );
}

export function DefaultDailyTasksModal({ visible, onClose, onBindEmail }: DefaultDailyTasksModalProps) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const {
    loading,
    tasks,
    dailyActivity,
    systemEnabled,
    busyTaskId,
    busyMilestoneThreshold,
    handleTaskAction,
    handleMilestoneClaim,
    bookmarkGuideOpen,
    closeBookmarkGuide,
    confirmBookmark,
  } = useDailyTasksModal(visible, t, onBindEmail);
  const campaignBoard = useCampaignTaskBoard(visible, t);
  const [tab, setTab] = useState<TasksTab>('daily');
  const mobileWeb = isMobileWeb();
  const dailyTasks = useMemo(
    () => tasks.filter((task) => !isAchievementTask(task)),
    [tasks],
  );
  const achievementTasks = useMemo(
    () => tasks.filter((task) => isAchievementTask(task)),
    [tasks],
  );
  const visibleTabs = useMemo(() => {
    const keys: TasksTab[] = ['daily', 'achievement'];
    if (campaignBoard.hasLiveCampaign) keys.push('campaign');
    return keys;
  }, [campaignBoard.hasLiveCampaign]);

  const onTaskAction = (task: TaskItem) => {
    if (task.claimable || task.status === 'claimable' || task.claimed || task.status === 'claimed') {
      void handleTaskAction(task);
      return;
    }
    if (task.task_type === 'community_post') {
      onClose();
      router.push('/social');
      return;
    }
    if (task.task_type === 'publish_role') {
      onClose();
      router.push('/create-agent');
      return;
    }
    if (task.task_type === 'publish_world') {
      onClose();
      router.push('/create-world');
      return;
    }
    if (task.task_type === 'reach_affection') {
      onClose();
      router.push('/');
      return;
    }
    if (task.task_type === 'like_role' || task.task_type === 'follow_role') {
      onClose();
      router.push('/');
      return;
    }
    if (task.task_type === 'set_avatar') {
      onClose();
      router.push('/profile');
      return;
    }
    if (task.task_type === 'post_likes_received') {
      onClose();
      router.push('/social');
      return;
    }
    if (task.task_type === 'checkin_streak') {
      setTab('daily');
      return;
    }
    void handleTaskAction(task);
  };

  useEffect(() => {
    if (!campaignBoard.loading && !campaignBoard.hasLiveCampaign && tab === 'campaign') {
      setTab('daily');
    }
  }, [campaignBoard.hasLiveCampaign, campaignBoard.loading, tab]);

  useEffect(() => {
    if (!visible) setTab('daily');
  }, [visible]);

  const cardWidth = Math.min(Math.round(windowWidth * 0.92), 560);
  const maxBodyHeight = Math.min(windowHeight * 0.62, 520);
  const activityRatio = dailyActivity.max > 0 ? dailyActivity.current / dailyActivity.max : 0;
  const activityHint = getActivityHint(dailyActivity, t);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.card, { width: cardWidth, maxHeight: maxBodyHeight + 180 }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={Typo(styles.title, 'serif', lang)}>{t('dailyTasks.title')}</Text>
              <Text style={Typo(styles.subtitle, 'sans', lang)}>
                {tab === 'campaign'
                  ? t('dailyTasks.campaignSubtitle')
                  : tab === 'achievement'
                    ? t('dailyTasks.achievementSubtitle')
                    : t('dailyTasks.subtitle')}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={TOKENS.colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {visibleTabs.map((key) => {
              const active = tab === key;
              const label =
                key === 'campaign'
                  ? t('dailyTasks.tabCampaign')
                  : key === 'achievement'
                    ? t('dailyTasks.tabAchievement')
                    : t('dailyTasks.tabDaily');
              return (
                <Pressable
                  key={key}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setTab(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            {...scrollWebProps}
            style={[styles.bodyScroll, { maxHeight: maxBodyHeight }, scrollWebProps.style]}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {tab === 'campaign' ? (
              campaignBoard.loading && campaignBoard.boards.length === 0 ? (
                <ActivityIndicator style={styles.loader} color={TOKENS.colors.accent} />
              ) : campaignBoard.boards.length === 0 ? (
                <Text style={Typo(styles.emptyText, 'sans', lang)}>{t('dailyTasks.campaignEmpty')}</Text>
              ) : (
                campaignBoard.boards.map((board) => {
                  const progressMax =
                    board.mediaTotal > 0 ? board.mediaTotal : Math.max(1, board.taskTotal);
                  const progressCurrent =
                    board.mediaTotal > 0 ? board.unlockedCount : board.claimedTasks;
                  const progressRatio = progressMax > 0 ? progressCurrent / progressMax : 0;
                  return (
                    <View key={board.campaignId} style={styles.campaignBlock}>
                      <Text style={Typo(styles.campaignName, 'serif', lang)}>{board.name}</Text>
                      <View style={styles.summaryPanel}>
                        <View style={styles.summaryLeft}>
                          <ActivityRing current={progressCurrent} max={progressMax} size={52} />
                          <View style={styles.activityTextCol}>
                            <Text style={Typo(styles.activityLabel, 'mono', lang)}>
                              {t('dailyTasks.campaignProgress')}
                            </Text>
                            <View style={styles.activityScoreRow}>
                              <Text style={styles.activityScore}>{progressCurrent}</Text>
                              <Text style={styles.activityMax}>/{progressMax}</Text>
                            </View>
                            <View style={styles.activityBarTrack}>
                              <View
                                style={[
                                  styles.activityBarFill,
                                  { width: `${Math.round(progressRatio * 100)}%` },
                                ]}
                              />
                            </View>
                            <Text style={Typo(styles.activityHint, 'sans', lang)}>
                              {campaignProgressHint(board, t)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {board.roles.map((role) => (
                        <RoleProgressCard
                          key={`${board.campaignId}-${role.roleId}`}
                          role={role}
                          busyTaskId={campaignBoard.busyTaskId}
                          onClaim={(taskId) => void campaignBoard.claim(taskId)}
                          onChat={(roleId) => {
                            onClose();
                            router.push(`/free-chat/${encodeURIComponent(roleId)}`);
                          }}
                        />
                      ))}
                      <Pressable
                        onPress={() => {
                          onClose();
                          router.push(`/activities/${encodeURIComponent(board.campaignId)}`);
                        }}
                        style={styles.eventLink}
                        accessibilityRole="button"
                      >
                        <Text style={styles.eventLinkText}>{t('dailyTasks.openEvent')}</Text>
                        <Ionicons name="chevron-forward" size={14} color={TOKENS.colors.accent} />
                      </Pressable>
                    </View>
                  );
                })
              )
            ) : (
            <>
            {tab === 'daily' ? (
            <View style={styles.summaryPanel}>
              <View style={styles.summaryLeft}>
                <ActivityRing current={dailyActivity.current} max={dailyActivity.max} size={52} />
                <View style={styles.activityTextCol}>
                  <Text style={Typo(styles.activityLabel, 'mono', lang)}>{t('dailyTasks.activityLabel')}</Text>
                  <View style={styles.activityScoreRow}>
                    <Text style={styles.activityScore}>{dailyActivity.current}</Text>
                    <Text style={styles.activityMax}>/{dailyActivity.max}</Text>
                  </View>
                  <View style={styles.activityBarTrack}>
                    <View style={[styles.activityBarFill, { width: `${Math.round(activityRatio * 100)}%` }]} />
                  </View>
                  <Text style={Typo(styles.activityHint, 'sans', lang)}>{activityHint}</Text>
                </View>
              </View>
              {dailyActivity.milestones.length > 0 ? (
                <View style={styles.summaryRight}>
                  <Text style={Typo(styles.milestoneLabel, 'mono', lang)}>{t('dailyTasks.dailyRewards')}</Text>
                  <View style={styles.milestoneRow}>
                    {dailyActivity.milestones.map((milestone) => (
                      <MilestoneDot
                        key={milestone.threshold}
                        milestone={milestone}
                        busy={busyMilestoneThreshold === milestone.threshold}
                        onClaim={handleMilestoneClaim}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
            ) : null}

            {loading ? (
              <ActivityIndicator style={styles.loader} color={TOKENS.colors.accent} />
            ) : !systemEnabled ? (
              <Text style={Typo(styles.emptyText, 'sans', lang)}>{t('dailyTasks.systemDisabled')}</Text>
            ) : (tab === 'achievement' ? achievementTasks : dailyTasks).length === 0 ? (
              <Text style={Typo(styles.emptyText, 'sans', lang)}>
                {tab === 'achievement' ? t('dailyTasks.achievementEmpty') : t('dailyTasks.empty')}
              </Text>
            ) : (
              (tab === 'achievement' ? achievementTasks : dailyTasks).map((task) => (
                <TaskRow
                  key={task.task_id}
                  task={task}
                  busy={busyTaskId === task.task_id}
                  onAction={onTaskAction}
                />
              ))
            )}
            </>
            )}
          </ScrollView>
        </View>
        {bookmarkGuideOpen ? (
          <View style={styles.guideBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeBookmarkGuide} accessibilityRole="button" />
            <View style={[styles.guideCard, { width: Math.min(cardWidth, 440) }]}>
              <Text style={Typo(styles.guideTitle, 'serif', lang)}>{t('dailyTasks.bookmarkGuideTitle')}</Text>
              {mobileWeb ? (
                <>
                  <Text style={Typo(styles.guideBody, 'sans', lang)}>{t('dailyTasks.bookmarkGuideMobileBody')}</Text>
                  <Text style={Typo(styles.guideStep, 'sans', lang)}>{t('dailyTasks.bookmarkGuideIosStep')}</Text>
                  <Text style={Typo(styles.guideStep, 'sans', lang)}>{t('dailyTasks.bookmarkGuideAndroidStep')}</Text>
                </>
              ) : (
                <Text style={Typo(styles.guideBody, 'sans', lang)}>{t('dailyTasks.bookmarkGuideDesktopBody')}</Text>
              )}
              <View style={styles.guideActions}>
                <Pressable style={styles.guideSecondary} onPress={closeBookmarkGuide}>
                  <Text style={styles.guideSecondaryText}>{t('confirmModal.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.guidePrimary, busyTaskId != null && styles.taskActionBusy]}
                  disabled={busyTaskId != null}
                  onPress={() => void confirmBookmark()}
                >
                  {busyTaskId != null ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.guidePrimaryText}>
                      {mobileWeb
                        ? t('dailyTasks.bookmarkGuideConfirmMobile')
                        : t('dailyTasks.bookmarkGuideConfirmDesktop')}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
      {/* 与 Modal 同层，避免 toast 被系统 Modal 窗口压住；visible 时才挂载以抢占 Host 栈顶 */}
      {visible ? <MessageHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 8, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    maxWidth: '100%',
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
    borderRadius: TOKENS.radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: TOKENS.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  tabActive: {
    backgroundColor: TOKENS.colors.accent,
  },
  tabText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    'sans',
  ),
  tabTextActive: {
    color: '#fff',
  },
  campaignBlock: {
    gap: 10,
  },
  campaignName: {
    color: TOKENS.colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  roleCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    borderRadius: TOKENS.radius.card,
    padding: 12,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.bgElevated,
  },
  roleAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.bgElevated,
  },
  roleName: {
    flex: 1,
    color: TOKENS.colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  roleChatBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: TOKENS.colors.accent,
  },
  roleChatText: Typo(
    {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    'sans',
  ),
  roleMetric: {
    gap: 6,
  },
  roleMetricLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
  },
  eventLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  eventLinkText: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
  taskProgressLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 2,
  },
  bodyScroll: {},
  bodyContent: {
    gap: 10,
    paddingBottom: 8,
  },
  summaryPanel: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    borderRadius: TOKENS.radius.card,
    padding: 14,
    gap: 14,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  activityLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  activityScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  activityScore: {
    color: TOKENS.colors.accent,
    fontSize: 28,
    fontWeight: '700',
  },
  activityMax: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    marginLeft: 2,
  },
  activityBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: TOKENS.colors.lineFaint,
    overflow: 'hidden',
  },
  activityBarFill: {
    height: '100%',
    backgroundColor: TOKENS.colors.accent,
    borderRadius: 2,
  },
  activityHint: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  summaryRight: {
    gap: 8,
  },
  milestoneLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  milestoneDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneDotReached: {
    borderColor: TOKENS.colors.accent,
  },
  milestoneDotClaimable: {
    backgroundColor: TOKENS.colors.inviteBanner,
    borderColor: TOKENS.colors.accent,
  },
  milestoneDotClaimed: {
    backgroundColor: 'rgba(132, 132, 132, 0.2)',
    borderColor: TOKENS.colors.line,
  },
  milestoneDotText: {
    color: TOKENS.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 24,
  },
  emptyText: {
    color: TOKENS.colors.textMuted,
    textAlign: 'center',
    marginVertical: 20,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    borderRadius: TOKENS.radius.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  taskTitle: {
    color: TOKENS.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  taskDesc: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  taskProgressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: TOKENS.colors.lineFaint,
    overflow: 'hidden',
    marginTop: 2,
  },
  taskProgressFill: {
    height: '100%',
    backgroundColor: TOKENS.colors.accent,
  },
  taskRewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskReward: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
  },
  taskActivityReward: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
  },
  taskAction: {
    minWidth: 64,
    maxWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskActionMuted: {
    backgroundColor: 'rgba(132, 132, 132, 0.35)',
  },
  taskActionBusy: {
    opacity: 0.85,
  },
  taskActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  taskActionTextMuted: {
    color: TOKENS.colors.textSecondary,
  },
  guideBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4, 5, 8, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 4,
  },
  guideCard: {
    maxWidth: '100%',
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 10,
    zIndex: 1,
  },
  guideTitle: {
    color: TOKENS.colors.text,
    fontSize: 20,
    lineHeight: 26,
  },
  guideBody: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  guideStep: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  guideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  guideSecondary: {
    flex: 1,
    minHeight: 40,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  guideSecondaryText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  guidePrimary: {
    flex: 1,
    minHeight: 40,
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  guidePrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
