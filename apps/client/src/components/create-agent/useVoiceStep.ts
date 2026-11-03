import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useI18n } from '../../i18n/I18nContext';
import { listAllVoices, previewVoice } from '../../api/voices';
import { listUserDesignedVoices } from '../../api/voiceDesign';
import { formatApiError } from '../../utils/roleForm';
import { toBackendLang } from '../../utils/userLang';
import { audioPlayer } from '../../utils/audioPlayer';
import { unlockWebAudioAutoplay } from '../../utils/streamAudioPlayer';
import type { VoiceCatalogItem } from '../../types/api';

function matchesPreferredLang(item: VoiceCatalogItem, preferredLang: string): boolean {
  const lang = preferredLang.trim().toLowerCase();
  if (!lang) return false;
  const itemLang = (item.language || '').trim().toLowerCase();
  return itemLang === lang || itemLang.startsWith(`${lang}-`) || itemLang.startsWith(lang);
}

/** 自建音色置顶（网格「更多」后第二位），其余按语言偏好排序，不丢弃非匹配项 */
function sortVoicesForCreateAgent(
  voices: VoiceCatalogItem[],
  mineIds: Set<string>,
  preferredLang: string,
): VoiceCatalogItem[] {
  const own: VoiceCatalogItem[] = [];
  const matched: VoiceCatalogItem[] = [];
  const rest: VoiceCatalogItem[] = [];

  for (const voice of voices) {
    if (mineIds.has(voice.id)) {
      own.push(voice);
    } else if (matchesPreferredLang(voice, preferredLang)) {
      matched.push(voice);
    } else {
      rest.push(voice);
    }
  }

  return [...own, ...matched, ...rest];
}

export function useVoiceStep() {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<VoiceCatalogItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [previewErrorId, setPreviewErrorId] = useState<string | null>(null);
  const previewCacheRef = useRef<Map<string, string>>(new Map());

  const preferredLang = useMemo(() => toBackendLang(lang), [lang]);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      // 不按 language 硬过滤：否则自建音色一旦匹配语言，其它平台音色会被整表丢掉
      const [voices, designedResp] = await Promise.all([
        listAllVoices(),
        listUserDesignedVoices().catch(() => ({ items: [] })),
      ]);
      const mineIds = new Set((designedResp.items ?? []).map((v) => v.voice_id));
      setItems(sortVoicesForCreateAgent(voices, mineIds, preferredLang));
      hasLoadedRef.current = true;
    } catch (e) {
      setError(formatApiError(t, e));
    } finally {
      setLoading(false);
    }
  }, [preferredLang, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    return () => {
      void audioPlayer.stop();
    };
  }, []);

  const handlePreview = useCallback(
    async (item: VoiceCatalogItem) => {
      if (loadingPreviewId) return;

      if (playingId === item.id) {
        await audioPlayer.stop();
        setPlayingId(null);
        return;
      }

      unlockWebAudioAutoplay();
      setPreviewErrorId(null);
      setLoadingPreviewId(item.id);

      try {
        let audioData = previewCacheRef.current.get(item.id);
        if (!audioData) {
          const resp = await previewVoice(item.id, item.language || preferredLang);
          audioData = resp.data;
          previewCacheRef.current.set(item.id, audioData);
        }

        await audioPlayer.stop();
        setPlayingId(item.id);
        await audioPlayer.play(`voice-preview-${item.id}`, audioData, 'mp3', (playing) => {
          if (!playing) setPlayingId(null);
        });
      } catch {
        setPreviewErrorId(item.id);
      } finally {
        setLoadingPreviewId(null);
      }
    },
    [loadingPreviewId, playingId, preferredLang],
  );

  return {
    t,
    loading,
    error,
    items,
    load,
    playingId,
    loadingPreviewId,
    previewErrorId,
    handlePreview,
  };
}
