import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { getVoiceQuota } from '../api/chat';
import type { FreeChatMessage, VoiceQuotaResp } from '../types/api';
import { audioPlayer, stopFullAudio } from '../utils/audioPlayer';
import { getAudioBundle, saveAudio } from '../utils/audioStorage';
import { streamAudioPlayer } from '../utils/streamAudioPlayer';
import { shouldShowVoiceQuotaExceededModal } from '../components/free-chat/VoiceQuotaExceededModal';

const TTS_AWAIT_TIMEOUT_MS = 90_000;

type QueuedFullPlay = {
  messageId: string;
  data: string;
  format: 'mp3' | 'wav';
};

/**
 * FreeChat-compatible streamed TTS playback (SSE audio_chunk / audio_done).
 * Used by free-chat and world level play.
 * Multi-message TTS is sequential: stream autoplay queues in streamAudioPlayer;
 * full-audio fallback also waits until the previous message finishes.
 */
export function useStreamTtsPlayback(options?: {
  getMessages?: () => FreeChatMessage[];
  setMessages?: Dispatch<SetStateAction<FreeChatMessage[]>>;
}) {
  const [voiceQuota, setVoiceQuota] = useState<VoiceQuotaResp | null>(null);
  const [streamingAudioMsgId, setStreamingAudioMsgId] = useState<string | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [awaitingTtsMessageId, setAwaitingTtsMessageId] = useState<string | null>(null);
  const [voiceQuotaExceededVisible, setVoiceQuotaExceededVisible] = useState(false);

  const voiceEnabled = Boolean(
    voiceQuota?.enabled && (voiceQuota.unlimited || (voiceQuota.remaining_hint ?? 0) > 0),
  );
  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const ttsStreamedRef = useRef(new Set<string>());
  const awaitingTtsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingAudioMsgIdRef = useRef<string | null>(null);
  const playingMsgIdRef = useRef<string | null>(null);
  const pendingAudioPatchRef = useRef(new Map<string, { data: string; format: 'mp3' | 'wav' }>());
  const fullPlayQueueRef = useRef<QueuedFullPlay[]>([]);
  const refreshVoiceQuotaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setMessagesRef = useRef(options?.setMessages);
  setMessagesRef.current = options?.setMessages;
  const getMessagesRef = useRef(options?.getMessages);
  getMessagesRef.current = options?.getMessages;
  const finishAwaitingTtsRef = useRef<(messageId?: string) => void>(() => {});
  const drainFullPlayQueueRef = useRef<() => void>(() => {});

  useEffect(() => {
    streamingAudioMsgIdRef.current = streamingAudioMsgId;
  }, [streamingAudioMsgId]);
  useEffect(() => {
    playingMsgIdRef.current = playingMsgId;
  }, [playingMsgId]);

  const refreshVoiceQuota = useCallback(async () => {
    try {
      setVoiceQuota(await getVoiceQuota());
    } catch (err) {
      console.warn('Failed to load voice quota:', err);
    }
  }, []);

  const scheduleRefreshVoiceQuota = useCallback(() => {
    if (refreshVoiceQuotaTimerRef.current) {
      clearTimeout(refreshVoiceQuotaTimerRef.current);
    }
    refreshVoiceQuotaTimerRef.current = setTimeout(() => {
      refreshVoiceQuotaTimerRef.current = null;
      void refreshVoiceQuota();
    }, 800);
  }, [refreshVoiceQuota]);

  useEffect(() => {
    void refreshVoiceQuota();
    return () => {
      if (refreshVoiceQuotaTimerRef.current) clearTimeout(refreshVoiceQuotaTimerRef.current);
      if (awaitingTtsTimerRef.current) clearTimeout(awaitingTtsTimerRef.current);
    };
  }, [refreshVoiceQuota]);

  const applyMessageAudioPatch = useCallback((msgId: string, data: string, format: 'mp3' | 'wav') => {
    const setMessages = setMessagesRef.current;
    if (!setMessages) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], audioData: data, audioFormat: format };
      return updated;
    });
  }, []);

  const isMessageAudioActive = useCallback((msgId: string) => {
    return (
      streamingAudioMsgIdRef.current === msgId ||
      playingMsgIdRef.current === msgId ||
      streamAudioPlayer.isPlaying(msgId) ||
      (audioPlayer.isPlaying() && audioPlayer.currentMessageId() === msgId)
    );
  }, []);

  const flushPendingAudioPatch = useCallback(
    (msgId?: string) => {
      if (msgId) {
        const pending = pendingAudioPatchRef.current.get(msgId);
        if (pending) {
          pendingAudioPatchRef.current.delete(msgId);
          applyMessageAudioPatch(msgId, pending.data, pending.format);
        }
        return;
      }
      for (const [id, pending] of pendingAudioPatchRef.current.entries()) {
        applyMessageAudioPatch(id, pending.data, pending.format);
      }
      pendingAudioPatchRef.current.clear();
    },
    [applyMessageAudioPatch],
  );

  const patchMessageAudio = useCallback(
    (msgId: string, data: string, format: string) => {
      const fmt = format === 'mp3' ? 'mp3' : 'wav';
      void saveAudio(msgId, data, fmt);
      if (isMessageAudioActive(msgId)) {
        pendingAudioPatchRef.current.set(msgId, { data, format: fmt });
        return;
      }
      applyMessageAudioPatch(msgId, data, fmt);
    },
    [applyMessageAudioPatch, isMessageAudioActive],
  );

  const clearAwaitingTts = useCallback((messageId?: string) => {
    setAwaitingTtsMessageId((prev) => {
      if (messageId && prev && prev !== messageId) return prev;
      return null;
    });
    if (awaitingTtsTimerRef.current) {
      clearTimeout(awaitingTtsTimerRef.current);
      awaitingTtsTimerRef.current = null;
    }
  }, []);

  const markAwaitingTts = useCallback(
    (messageId?: string) => {
      clearAwaitingTts();
      if (!messageId || !voiceEnabledRef.current) return;
      setAwaitingTtsMessageId(messageId);
      awaitingTtsTimerRef.current = setTimeout(() => {
        awaitingTtsTimerRef.current = null;
        setAwaitingTtsMessageId(null);
        void scheduleRefreshVoiceQuota();
      }, TTS_AWAIT_TIMEOUT_MS);
    },
    [clearAwaitingTts, scheduleRefreshVoiceQuota],
  );

  const finishAwaitingTts = useCallback(
    (messageId?: string) => {
      clearAwaitingTts(messageId);
      scheduleRefreshVoiceQuota();
    },
    [clearAwaitingTts, scheduleRefreshVoiceQuota],
  );
  finishAwaitingTtsRef.current = finishAwaitingTts;

  const playFullAudioNow = useCallback(
    (messageId: string, audioData: string, audioFmt: 'mp3' | 'wav') => {
      if (!audioData || !voiceEnabledRef.current) return;
      streamAudioPlayer.stopMessage(messageId);
      void audioPlayer.play(messageId, audioData, audioFmt, (playing) => {
        setPlayingMsgId(playing ? messageId : null);
        if (!playing) {
          flushPendingAudioPatch(messageId);
          finishAwaitingTts(messageId);
          drainFullPlayQueueRef.current();
        }
      });
    },
    [finishAwaitingTts, flushPendingAudioPatch],
  );

  const drainFullPlayQueue = useCallback(() => {
    if (streamAudioPlayer.isAnyPlaying() || audioPlayer.isPlaying()) return;
    while (fullPlayQueueRef.current.length > 0) {
      const next = fullPlayQueueRef.current.shift()!;
      // Skip if this message already started via stream autoplay.
      if (streamAudioPlayer.hasStartedPlayback(next.messageId) || streamAudioPlayer.isPlaying(next.messageId)) {
        continue;
      }
      playFullAudioNow(next.messageId, next.data, next.format);
      return;
    }
  }, [playFullAudioNow]);
  drainFullPlayQueueRef.current = drainFullPlayQueue;

  const enqueueOrPlayFullAudio = useCallback(
    (messageId: string, audioData: string, audioFmt: 'mp3' | 'wav') => {
      if (!audioData || !voiceEnabledRef.current) return;
      const busy =
        streamAudioPlayer.isAnyPlaying() ||
        audioPlayer.isPlaying() ||
        fullPlayQueueRef.current.length > 0;
      if (busy) {
        if (!fullPlayQueueRef.current.some((q) => q.messageId === messageId)) {
          fullPlayQueueRef.current.push({ messageId, data: audioData, format: audioFmt });
        }
        return;
      }
      playFullAudioNow(messageId, audioData, audioFmt);
    },
    [playFullAudioNow],
  );

  useEffect(() => {
    streamAudioPlayer.setPlaybackListener((messageId, playing) => {
      if (playing) {
        setPlayingMsgId(messageId);
        setStreamingAudioMsgId(messageId);
        // Stream took over — drop any queued full replay for this id.
        fullPlayQueueRef.current = fullPlayQueueRef.current.filter((q) => q.messageId !== messageId);
        return;
      }

      const audioPlayerActive =
        audioPlayer.isPlaying() && audioPlayer.currentMessageId() === messageId;
      if (audioPlayerActive) {
        return;
      }

      setPlayingMsgId((prev) => (prev === messageId ? null : prev));
      setStreamingAudioMsgId((prev) => (prev === messageId ? null : prev));
      flushPendingAudioPatch(messageId);
      finishAwaitingTtsRef.current(messageId);
      drainFullPlayQueue();
    });
    return () => streamAudioPlayer.setPlaybackListener(null);
  }, [drainFullPlayQueue, flushPendingAudioPatch]);

  const handleStreamAudioChunk = useCallback((data: string, seq: number, format: string, messageId?: string) => {
    if (!messageId || !data) return;
    ttsStreamedRef.current.add(messageId);
    setStreamingAudioMsgId(messageId);
    streamAudioPlayer.feedChunk(messageId, data, seq, format === 'wav' ? 'wav' : 'mp3');
  }, []);

  const handleStreamAudioDone = useCallback(
    (data: string, format: string, messageId?: string) => {
      if (!messageId) return;
      const fmt = format === 'mp3' ? 'mp3' : 'wav';
      const receivedChunks = ttsStreamedRef.current.has(messageId);
      const wasStreaming =
        receivedChunks || streamAudioPlayer.isPlaying(messageId) || streamAudioPlayer.isAnyPlaying();

      const merged = !data ? streamAudioPlayer.getConcatenatedBase64(messageId) : null;
      const audioData = data || merged?.data || '';
      const audioFmt = merged?.format ?? fmt;

      if (audioData) {
        patchMessageAudio(messageId, audioData, audioFmt);
      }

      streamAudioPlayer.finalize(messageId);

      const streamStarted = streamAudioPlayer.hasStartedPlayback(messageId);

      if (audioData && voiceEnabledRef.current && !wasStreaming) {
        enqueueOrPlayFullAudio(messageId, audioData, audioFmt);
      } else if (audioData && voiceEnabledRef.current && receivedChunks && !streamStarted) {
        // Buffered while another message was speaking — play after queue drains
        // (stream autoplay may still start; full queue is a fallback).
        enqueueOrPlayFullAudio(messageId, audioData, audioFmt);
      } else if (
        !streamAudioPlayer.isAnyPlaying() &&
        !streamAudioPlayer.isPlaying(messageId) &&
        !audioPlayer.isPlaying() &&
        fullPlayQueueRef.current.length === 0
      ) {
        finishAwaitingTts(messageId);
      }

      ttsStreamedRef.current.delete(messageId);
    },
    [patchMessageAudio, finishAwaitingTts, enqueueOrPlayFullAudio],
  );

  const stopAllAudio = useCallback(() => {
    fullPlayQueueRef.current = [];
    streamAudioPlayer.stopAll();
    void stopFullAudio();
    setPlayingMsgId(null);
    setStreamingAudioMsgId(null);
  }, []);

  const resolveMessageAudio = useCallback(async (msgId: string, msg?: FreeChatMessage) => {
    const pending = pendingAudioPatchRef.current.get(msgId);
    if (pending) return pending;
    if (msg?.audioData && msg.audioFormat) {
      return { data: msg.audioData, format: msg.audioFormat };
    }
    const bundle = await getAudioBundle(msgId);
    if (bundle) return bundle;
    return null;
  }, []);

  const handleToggleAudio = useCallback(
    async (msgId: string) => {
      const msg = getMessagesRef.current?.().find((m) => m.id === msgId);
      const streamActive = streamingAudioMsgId === msgId || streamAudioPlayer.isPlaying(msgId);
      const replayActive = playingMsgId === msgId && audioPlayer.currentMessageId() === msgId;

      if (streamActive) {
        streamAudioPlayer.stopMessage(msgId);
        setStreamingAudioMsgId((prev) => (prev === msgId ? null : prev));
        setPlayingMsgId((prev) => (prev === msgId ? null : prev));
        return;
      }

      const bundle = await resolveMessageAudio(msgId, msg);
      if (!bundle) return;

      if (replayActive) {
        await audioPlayer.play(msgId, bundle.data, bundle.format, (playing) => {
          setPlayingMsgId(playing ? msgId : null);
        });
        return;
      }

      stopAllAudio();
      await audioPlayer.play(msgId, bundle.data, bundle.format, (playing) => {
        setPlayingMsgId(playing ? msgId : null);
        if (!playing) {
          flushPendingAudioPatch(msgId);
        }
      });
    },
    [streamingAudioMsgId, playingMsgId, resolveMessageAudio, stopAllAudio, flushPendingAudioPatch],
  );

  const handleTtsError = useCallback(
    async (content: string) => {
      if (content.startsWith('VOICE_') || content.includes('voice quota') || content.includes(':VOICE_')) {
        if (await shouldShowVoiceQuotaExceededModal()) {
          setVoiceQuotaExceededVisible(true);
        }
        void refreshVoiceQuota();
      }
    },
    [refreshVoiceQuota],
  );

  return {
    voiceEnabled,
    voiceQuota,
    refreshVoiceQuota,
    streamingAudioMsgId,
    playingMsgId,
    awaitingTtsMessageId,
    markAwaitingTts,
    finishAwaitingTts,
    handleStreamAudioChunk,
    handleStreamAudioDone,
    handleToggleAudio,
    stopAllAudio,
    voiceQuotaExceededVisible,
    setVoiceQuotaExceededVisible,
    handleTtsError,
  };
}
