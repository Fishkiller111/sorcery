import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '../i18n/I18nContext';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';
import {
  getStoryChapterAccess,
  getStoryProgress,
  listStoryScenes,
  resetStoryChapterProgress,
  unlockStoryChapter,
} from '../api/story';
import { getPointsBalance } from '../api/referral';
import { listWorldviews } from '../api/worldviews';
import { ApiError } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useVipStore } from '../stores/vipStore';
import { useIsDesktop } from './useIsDesktop';
import { SIDEBAR_WIDTH } from '../constants/layout';
import {
  DEFAULT_SEASON_ID,
  STORY_CHAPTERS,
  resolveStoryWorldviewId,
  sceneRoutePath,
} from '../constants/storyRegistry';
import { resolveStoryChapterListTitle } from '../constants/storyGalleryCatalog';
import { Message } from '../components/ui/Message';
import type { StoryChapterAccessResp, StoryListScenesResp } from '../types/story';

export type StoryHomeSceneItem = StoryListScenesResp['scenes'][0];

const CONTENT_MAX = 720;
const HORIZONTAL_PAD = 20;

export function useStoryHome() {
  const { t, lang, tp } = useI18n();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { width: windowWidth } = useWindowDimensions();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isDevUser = useAuthStore((s) => s.user?.is_dev === true);
  const vip = useVipStore((s) => s.vip);
  const fetchVip = useVipStore((s) => s.fetchVip);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [points, setPoints] = useState(0);
  const [seasonId, setSeasonId] = useState(DEFAULT_SEASON_ID);
  const [chapters, setChapters] = useState<Record<string, StoryListScenesResp>>({});
  const [access, setAccess] = useState<Record<string, StoryChapterAccessResp>>({});
  const [freshChapterCode, setFreshChapterCode] = useState<string | null>(null);
  const [debugResetTarget, setDebugResetTarget] = useState<{ code: string; title: string } | null>(null);
  const [debugResetLoading, setDebugResetLoading] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [vipLockedMessage, setVipLockedMessage] = useState<string | null>(null);
  const [storyWorldviewId, setStoryWorldviewId] = useState<string | null>(null);

  const contentWidth = useMemo(() => {
    const available = isDesktop
      ? Math.min(CONTENT_MAX, Math.max(windowWidth - SIDEBAR_WIDTH - 96, 480))
      : windowWidth - HORIZONTAL_PAD * 2;
    return Math.max(280, available);
  }, [isDesktop, windowWidth]);

  const cardWidth = contentWidth;

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    const [prog, pts, vipRes, worldviewsResp, ...rest] = await Promise.all([
      getStoryProgress(),
      getPointsBalance(),
      fetchVip(),
      listWorldviews(),
      ...STORY_CHAPTERS.map(async (ch) => {
        const [scenes, acc] = await Promise.all([
          listStoryScenes(ch.code),
          getStoryChapterAccess(ch.code),
        ]);
        return { code: ch.code, scenes, access: acc };
      }),
    ]);
    setSeasonId(prog.season_id || DEFAULT_SEASON_ID);
    setPoints(pts.points ?? 0);
    const sceneMap: Record<string, StoryListScenesResp> = {};
    const accessMap: Record<string, StoryChapterAccessResp> = {};
    for (const item of rest) {
      sceneMap[item.code] = item.scenes;
      accessMap[item.code] = item.access;
    }
    setChapters(sceneMap);
    setAccess(accessMap);
    setStoryWorldviewId(resolveStoryWorldviewId(worldviewsResp.items) ?? null);
    void vipRes;
  }, [isLoggedIn, fetchVip]);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    load()
      .catch((e) => notifyError(t('system.error'), e instanceof ApiError ? e.message : t('storyHome.loadFailed')))
      .finally(() => setLoading(false));
  }, [isLoggedIn, load, t]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const unlockChapter = (chapterCode: string) => {
    const info = access[chapterCode];
    if (info?.reason === 'temporarily_unavailable') return;
    if (!info?.cost_points) return;
    if (points < info.cost_points) {
      notifyWarning(
        t('storyHome.insufficientPoints'),
        t('storyHome.insufficientPointsDesc')
          .replace('{need}', String(info.cost_points))
          .replace('{have}', String(points)),
      );
      return;
    }
    setUnlockTarget(chapterCode);
  };

  const confirmUnlockChapter = async () => {
    if (!unlockTarget) return;
    const chapterCode = unlockTarget;
    setUnlockLoading(true);
    try {
      const res = await unlockStoryChapter(chapterCode, true);
      if (res.unlocked) {
        setUnlockTarget(null);
        notifySuccess(t('storyHome.unlocked'), t('storyHome.unlockedDesc'));
        await load();
      }
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      if (err?.code === 'PTS_001') {
        notifyWarning(t('storyHome.insufficientPoints'), err.message);
      } else if (err?.code === 'VIP_001') {
        setUnlockTarget(null);
        setVipLockedMessage(err.message);
      } else {
        notifyError(t('system.error'), err?.message || t('storyHome.unlockFailed'));
      }
    } finally {
      setUnlockLoading(false);
    }
  };

  const enterScene = (scene: StoryHomeSceneItem, chapterCode: string) => {
    if (!scene.unlocked) {
      notifyWarning(t('storyHome.locked'), t('storyHome.lockedDesc'));
      return;
    }
    const forceNew = freshChapterCode === chapterCode;
    const replay = scene.cleared && !forceNew;
    const route = sceneRoutePath(scene.scene_code, scene.scene_type);
    if (forceNew) {
      router.push(`${route}?fresh=1` as never);
      setFreshChapterCode(null);
      return;
    }
    router.push((replay ? `${route}?replay=1` : route) as never);
  };

  const openResetConfirm = (chapterCode: string, chapterTitle: string) => {
    setDebugResetTarget({ code: chapterCode, title: chapterTitle || chapterCode });
  };

  const confirmResetChapter = async () => {
    if (!debugResetTarget || debugResetLoading) return;
    const { code, title } = debugResetTarget;
    setDebugResetLoading(true);
    try {
      const res = await resetStoryChapterProgress(code);
      setDebugResetTarget(null);
      setFreshChapterCode(code);
      Message.success(
        `${t('storyHome.debugResetDone')}\n${tp('storyHome.debugResetStats', {
          title,
          flags: res.cleared_flags,
          sessions: res.sessions_abandoned,
        })}`,
        { duration: 4500 },
      );
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('storyHome.resetFailed');
      Message.error(msg);
    } finally {
      setDebugResetLoading(false);
    }
  };

  const vipActive = vip?.permissions?.story_mode === true;

  const openStoryWorldview = () => {
    if (!storyWorldviewId) {
      notifyWarning(t('system.error'), t('storyHome.worldviewMissing'));
      return;
    }
    router.push(`/story/worldview/${storyWorldviewId}` as never);
  };

  const openGallery = () => {
    router.push(`/story/gallery?seasonId=${seasonId}` as never);
  };

  const scrollPaddingHorizontal = isDesktop
    ? Math.max(24, (windowWidth - (isDesktop ? SIDEBAR_WIDTH : 0) - contentWidth) / 2)
    : HORIZONTAL_PAD;

  return {
    t,
    lang,
    tp,
    router,
    isDesktop,
    windowWidth,
    isLoggedIn,
    isDevUser,
    loading,
    refreshing,
    points,
    seasonId,
    chapters,
    access,
    contentWidth,
    cardWidth,
    scrollPaddingHorizontal,
    unlockTarget,
    unlockLoading,
    vipLockedMessage,
    debugResetTarget,
    debugResetLoading,
    vipActive,
    onRefresh,
    unlockChapter,
    confirmUnlockChapter,
    enterScene,
    openResetConfirm,
    confirmResetChapter,
    openStoryWorldview,
    openGallery,
    setUnlockTarget,
    setVipLockedMessage,
    setDebugResetTarget,
  };
}
