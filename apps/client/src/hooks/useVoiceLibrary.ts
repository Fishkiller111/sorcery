import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllVoices, previewVoice } from '../api/voices';
import {
  listUserDesignedVoices,
  listVoiceDesignRecords,
  publishUserDesignedVoice,
  unpublishUserDesignedVoice,
  updateUserDesignedVoice,
} from '../api/voiceDesign';
import { useI18n } from '../i18n/I18nContext';
import { useAuthStore } from '../stores/authStore';
import { formatApiError } from '../utils/roleForm';
import { toBackendLang } from '../utils/userLang';
import { audioPlayer } from '../utils/audioPlayer';
import { unlockWebAudioAutoplay } from '../utils/streamAudioPlayer';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';
import type { UserDesignedVoiceItem, VoiceCatalogItem, VoiceDesignRecordItem } from '../types/api';
import {
  estimateVoiceDesignProgress,
  voiceMatchesFilter,
  type VoiceLibraryFilterId,
} from '../constants/voiceLibrary';

export type VoiceLibraryTab = 'explore' | 'mine';

export type VoiceListItem =
  | { kind: 'catalog'; item: VoiceCatalogItem }
  | { kind: 'designed'; item: UserDesignedVoiceItem }
  | { kind: 'pending'; item: VoiceDesignRecordItem };

function toListItem(v: VoiceCatalogItem): VoiceListItem {
  return { kind: 'catalog', item: v };
}

function designedToListItem(v: UserDesignedVoiceItem): VoiceListItem {
  return {
    kind: 'designed',
    item: v,
  };
}

function pendingToListItem(v: VoiceDesignRecordItem): VoiceListItem {
  return {
    kind: 'pending',
    item: v,
  };
}

export function voiceListItemId(entry: VoiceListItem): string {
  if (entry.kind === 'catalog') return entry.item.id;
  if (entry.kind === 'designed') return entry.item.voice_id;
  return entry.item.record_id;
}

export function voiceListItemTitle(entry: VoiceListItem): string {
  if (entry.kind === 'pending') {
    return entry.item.prompt.trim();
  }
  return entry.item.title;
}

export function voiceListItemLanguage(entry: VoiceListItem): string {
  if (entry.kind === 'catalog') return entry.item.language;
  if (entry.kind === 'designed') return entry.item.language;
  return '';
}

export function voiceListItemProgress(entry: VoiceListItem, nowMs: number): number | null {
  if (entry.kind !== 'pending' || entry.item.status !== 'processing') return null;
  return estimateVoiceDesignProgress(entry.item.created_at, nowMs);
}

export function isVoicePublic(entry: VoiceListItem): boolean {
  if (entry.kind === 'designed') {
    return (entry.item.visibility || 'private') === 'public';
  }
  if (entry.kind === 'catalog') {
    return (entry.item.visibility || 'public') === 'public';
  }
  return false;
}

export function useVoiceLibrary() {
  const { t, tp, lang } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const preferredLang = useMemo(() => toBackendLang(lang), [lang]);

  const [tab, setTab] = useState<VoiceLibraryTab>('explore');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<VoiceLibraryFilterId | null>(null);
  const [catalog, setCatalog] = useState<VoiceCatalogItem[]>([]);
  const [mine, setMine] = useState<UserDesignedVoiceItem[]>([]);
  const [pendingRecords, setPendingRecords] = useState<VoiceDesignRecordItem[]>([]);
  const [progressNow, setProgressNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [publishBusyId, setPublishBusyId] = useState<string | null>(null);
  const [renameBusyId, setRenameBusyId] = useState<string | null>(null);

  const loadMine = useCallback(async () => {
    if (!isLoggedIn) {
      setMine([]);
      setPendingRecords([]);
      return;
    }
    try {
      const [designed, recordsResp] = await Promise.all([
        listUserDesignedVoices(),
        listVoiceDesignRecords({ page: 1, limit: 30 }),
      ]);
      setMine(designed.items ?? []);
      setPendingRecords(
        (recordsResp.items ?? []).filter(
          (record) =>
            record.status === 'processing' ||
            record.status === 'preview_ready' ||
            record.status === 'failed',
        ),
      );
    } catch {
      setMine([]);
      setPendingRecords([]);
    }
  }, [isLoggedIn]);

  const loadExplore = useCallback(async () => {
    // Explore：仅公开音色
    const voices = await listAllVoices({
      language: preferredLang,
      visibility: 'public',
    });
    setCatalog(voices);
  }, [preferredLang]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadExplore(), loadMine()]);
    } catch (e) {
      setError(formatApiError(t, e));
    } finally {
      setLoading(false);
    }
  }, [loadExplore, loadMine, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => {
    void audioPlayer.stop();
  }, []);

  const hasProcessing = pendingRecords.some((record) => record.status === 'processing');
  const hasActiveTasks = pendingRecords.length > 0;

  useEffect(() => {
    if (tab !== 'mine' || !isLoggedIn || !hasActiveTasks) return;
    const timer = setInterval(() => {
      void loadMine();
    }, 3000);
    return () => clearInterval(timer);
  }, [hasActiveTasks, isLoggedIn, loadMine, tab]);

  useEffect(() => {
    if (tab !== 'mine' || !hasProcessing) return;
    const timer = setInterval(() => {
      setProgressNow(Date.now());
    }, 400);
    return () => clearInterval(timer);
  }, [hasProcessing, tab]);

  const sourceItems = useMemo((): VoiceListItem[] => {
    if (tab === 'mine') {
      const pendingItems = pendingRecords.map(pendingToListItem);
      const designedItems = mine.map(designedToListItem);
      return [...pendingItems, ...designedItems];
    }
    return catalog.map(toListItem);
  }, [catalog, mine, pendingRecords, tab]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceItems.filter((entry) => {
      const title = voiceListItemTitle(entry).toLowerCase();
      const language = voiceListItemLanguage(entry).toLowerCase();
      if (q && !title.includes(q) && !language.includes(q)) return false;
      if (tab === 'explore' && activeFilter) {
        return voiceMatchesFilter(title, language, activeFilter, preferredLang);
      }
      return true;
    });
  }, [activeFilter, preferredLang, query, sourceItems, tab]);

  const featuredItems = useMemo(() => filteredItems.slice(0, 3), [filteredItems]);
  const gridItems = useMemo(() => filteredItems.slice(3), [filteredItems]);

  const toggleFilter = useCallback((id: VoiceLibraryFilterId) => {
    setActiveFilter((prev) => (prev === id ? null : id));
  }, []);

  const preview = useCallback(
    async (entry: VoiceListItem) => {
      if (entry.kind === 'pending') return;
      const voiceId = voiceListItemId(entry);
      const language = voiceListItemLanguage(entry);
      if (loadingPreviewId) return;

      if (playingId === voiceId) {
        await audioPlayer.stop();
        setPlayingId(null);
        return;
      }

      unlockWebAudioAutoplay();
      setLoadingPreviewId(voiceId);
      try {
        const resp = await previewVoice(voiceId, language || preferredLang);
        await audioPlayer.stop();
        setPlayingId(voiceId);
        await audioPlayer.play(`voice-lib-${voiceId}`, resp.data, 'mp3', (playing) => {
          if (!playing) setPlayingId(null);
        });
      } catch {
        notifyWarning(t('creationCenter.voiceLibrary.previewFailed'));
      } finally {
        setLoadingPreviewId(null);
      }
    },
    [loadingPreviewId, playingId, preferredLang, t],
  );

  const publishVoice = useCallback(
    async (voiceId: string) => {
      if (publishBusyId) return;
      setPublishBusyId(voiceId);
      try {
        const updated = await publishUserDesignedVoice(voiceId);
        setMine((prev) =>
          prev.map((item) =>
            item.voice_id === voiceId
              ? { ...item, ...updated, visibility: updated.visibility || 'public' }
              : item,
          ),
        );
        notifySuccess(t('creationCenter.voiceLibrary.publishSuccess'));
        void loadExplore();
      } catch (e) {
        notifyError(formatApiError(t, e));
      } finally {
        setPublishBusyId(null);
      }
    },
    [loadExplore, publishBusyId, t],
  );

  const unpublishVoice = useCallback(
    async (voiceId: string) => {
      if (publishBusyId) return;
      setPublishBusyId(voiceId);
      try {
        const updated = await unpublishUserDesignedVoice(voiceId);
        setMine((prev) =>
          prev.map((item) =>
            item.voice_id === voiceId
              ? { ...item, ...updated, visibility: updated.visibility || 'private' }
              : item,
          ),
        );
        notifySuccess(t('creationCenter.voiceLibrary.unpublishSuccess'));
        void loadExplore();
      } catch (e) {
        notifyError(formatApiError(t, e));
      } finally {
        setPublishBusyId(null);
      }
    },
    [loadExplore, publishBusyId, t],
  );

  const renameVoice = useCallback(
    async (voiceId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        notifyWarning(t('creationCenter.voiceLibrary.voiceNameRequired'));
        return false;
      }
      if (renameBusyId) return false;
      setRenameBusyId(voiceId);
      try {
        const updated = await updateUserDesignedVoice(voiceId, { title: trimmed });
        setMine((prev) =>
          prev.map((item) => (item.voice_id === voiceId ? { ...item, ...updated } : item)),
        );
        notifySuccess(t('creationCenter.voiceLibrary.renameSuccess'));
        void loadExplore();
        return true;
      } catch (e) {
        notifyError(formatApiError(t, e));
        return false;
      } finally {
        setRenameBusyId(null);
      }
    },
    [loadExplore, renameBusyId, t],
  );

  return {
    t,
    tp,
    tab,
    setTab,
    query,
    setQuery,
    activeFilter,
    toggleFilter,
    loading,
    error,
    load,
    loadMine,
    featuredItems,
    gridItems,
    filteredItems,
    playingId,
    loadingPreviewId,
    preview,
    isLoggedIn,
    progressNow,
    publishBusyId,
    publishVoice,
    unpublishVoice,
    renameBusyId,
    renameVoice,
  };
}
