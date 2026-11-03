import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ApiError } from '../api/client';
import { enterWorld, getWorldProgress, listWorlds, setWorldPlayerCast } from '../api/world';
import { updateUser } from '../api/user';
import { useAuthStore } from '../stores/authStore';
import { useI18n } from '../i18n/I18nContext';
import { notifyError, notifyWarning } from '../utils/notify';
import { checkWorldMatureGate } from '../utils/worldMatureGate';
import type {
  WorldCastPreview,
  WorldItem,
  WorldLevelStatus,
  WorldPlayEnterResp,
  WorldPlayProgressResp,
} from '../types/world';

export function useWorldList() {
  const [loading, setLoading] = useState(true);
  const [worlds, setWorlds] = useState<WorldItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { t, lang } = useI18n();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listWorlds();
      setWorlds(resp.worlds ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('worldPlay.loadFailed');
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }, [t, lang]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, worlds, error, reload };
}

export function useWorldHome(worldId: string) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [enter, setEnter] = useState<WorldPlayEnterResp | null>(null);
  const [progress, setProgress] = useState<WorldPlayProgressResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmMature, setConfirmMature] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<string | null>(null);
  const [pickCastOpen, setPickCastOpen] = useState(false);
  const [pickingCast, setPickingCast] = useState(false);
  const [pendingAfterPick, setPendingAfterPick] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!worldId) return;
    setLoading(true);
    setError(null);
    try {
      const entered = await enterWorld(worldId);
      setEnter(entered);
      setPickCastOpen(!!entered.need_player_cast);
      const prog = await getWorldProgress(worldId);
      setProgress(prog);
    } catch (e) {
      setEnter(null);
      setProgress(null);
      if (e instanceof ApiError && (e.code === 'VIP_010' || e.code === 'VIP_001')) {
        setError('vip_required');
        notifyWarning(t('settings.matureVipRequired'));
      } else {
        const msg = e instanceof ApiError ? e.message : t('worldPlay.loadFailed');
        setError(msg);
        notifyError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [t, worldId, lang]);

  useEffect(() => {
    setEnter(null);
    setProgress(null);
    setError(null);
  }, [worldId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const goPlay = useCallback(
    (levelCode: string) => {
      router.push(`/world/${worldId}/play/${levelCode}`);
    },
    [router, worldId],
  );

  const ensurePlayerCastThen = useCallback(
    (levelCode: string) => {
      if (enter?.need_player_cast || !enter?.progress?.player_cast_id) {
        const playable = enter?.playable_cast ?? [];
        if (playable.length >= 2) {
          setPendingAfterPick(levelCode);
          setPickCastOpen(true);
          return;
        }
      }
      goPlay(levelCode);
    },
    [enter?.need_player_cast, enter?.playable_cast, enter?.progress?.player_cast_id, goPlay],
  );

  const selectPlayerCast = useCallback(
    async (castId: string, opts?: { forceReset?: boolean }) => {
      if (!worldId || pickingCast) return;
      setPickingCast(true);
      try {
        await setWorldPlayerCast(worldId, castId, { forceReset: opts?.forceReset });
        setPickCastOpen(false);
        const nextLevel = pendingAfterPick;
        setPendingAfterPick(null);
        await reload();
        if (nextLevel) goPlay(nextLevel);
      } catch (e) {
        notifyError(e instanceof ApiError ? e.message : t('worldPlay.loadFailed'));
      } finally {
        setPickingCast(false);
      }
    },
    [goPlay, pendingAfterPick, pickingCast, reload, t, worldId],
  );

  const enterLevel = useCallback(
    (level: WorldLevelStatus) => {
      if (!level.unlocked) {
        notifyWarning(t('worldPlay.levelLocked'));
        return;
      }
      const rating = enter?.content_rating;
      const gate = checkWorldMatureGate(rating, user);
      if (!gate.ok) {
        if (gate.reason === 'vip_required') {
          notifyWarning(t('settings.matureVipRequired'));
          return;
        }
        setPendingLevel(level.code);
        setConfirmMature(true);
        return;
      }
      ensurePlayerCastThen(level.code);
    },
    [enter?.content_rating, ensurePlayerCastThen, t, user],
  );

  const confirmMatureEnable = useCallback(async () => {
    try {
      const updated = await updateUser({ content_tier: 'mature' });
      useAuthStore.setState({ user: updated });
      setConfirmMature(false);
      const code = pendingLevel;
      setPendingLevel(null);
      if (code) ensurePlayerCastThen(code);
      else void reload();
    } catch (e) {
      notifyError(e instanceof ApiError ? e.message : t('worldPlay.loadFailed'));
      setConfirmMature(false);
    }
  }, [ensurePlayerCastThen, pendingLevel, reload, t]);

  const playableCast: WorldCastPreview[] = enter?.playable_cast ?? [];
  const playerCastId = progress?.progress?.player_cast_id || enter?.progress?.player_cast_id || '';
  const playerCast =
    (enter?.cast ?? []).find((c) => c.cast_id === playerCastId) ||
    playableCast.find((c) => c.cast_id === playerCastId) ||
    null;

  const switchPlayerCast = useCallback(
    async (castId: string) => {
      if (!worldId || pickingCast) return false;
      if (castId === playerCastId) return true;
      setPickingCast(true);
      try {
        await setWorldPlayerCast(worldId, castId, { forceReset: true });
        await reload();
        return true;
      } catch (e) {
        notifyError(e instanceof ApiError ? e.message : t('worldPlay.loadFailed'));
        return false;
      } finally {
        setPickingCast(false);
      }
    },
    [pickingCast, playerCastId, reload, t, worldId],
  );

  return {
    loading,
    enter,
    progress,
    levels: progress?.levels ?? [],
    cast: progress?.cast ?? enter?.cast ?? [],
    lore: progress?.lore,
    scenes: progress?.scenes ?? [],
    entries: progress?.entries ?? enter?.entries,
    isOwner: !!(progress?.is_owner ?? enter?.is_owner),
    error,
    reload,
    enterLevel,
    confirmMature,
    setConfirmMature,
    confirmMatureEnable,
    pickCastOpen,
    setPickCastOpen,
    playableCast,
    defaultPlayerCastId: enter?.default_player_cast_id ?? '',
    selectPlayerCast,
    switchPlayerCast,
    pickingCast,
    playerCastId,
    playerCast,
  };
}
