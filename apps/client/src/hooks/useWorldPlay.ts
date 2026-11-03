import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { enterWorldLevel, getWorldMessages, interruptWorld, saveWorldCheckpoint } from '../api/world';
import { sendWorldMessageStream } from '../api/worldStream';
import { useI18n } from '../i18n/I18nContext';
import { useAuthStore } from '../stores/authStore';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';
import { unlockWebAudioAutoplay } from '../utils/streamAudioPlayer';
import {
  resolveStreamCast,
  splitWorldSpeech,
  stripCastPrefix,
  toWorldFreeChatMessages,
} from '../utils/worldCastSpeech';
import type { FreeChatMessage } from '../types/api';
import type { WorldEnterLevelResp } from '../types/world';
import { useStreamTtsPlayback } from './useStreamTtsPlayback';

export function useWorldPlay(worldId: string, levelCode: string) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const playerAvatar = user?.avatar_url;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<WorldEnterLevelResp | null>(null);
  const [messages, setMessages] = useState<FreeChatMessage[]>([]);
  const [levelCleared, setLevelCleared] = useState(false);
  const [badEndId, setBadEndId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const streamMsgIdRef = useRef<string | null>(null);
  /** message_id → active cast_id from turn_envelope */
  const activeCastByMsgRef = useRef<Map<string, string>>(new Map());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const tts = useStreamTtsPlayback({
    getMessages: () => messagesRef.current,
    setMessages,
  });
  const ttsRef = useRef(tts);
  ttsRef.current = tts;

  const castById = useMemo(() => {
    const map = new Map((session?.cast ?? []).map((c) => [c.cast_id, c]));
    return map;
  }, [session?.cast]);

  const castList = session?.cast ?? [];

  const leadCast = useMemo(() => {
    const id = session?.lead_cast_id;
    if (!id) return session?.cast?.[0];
    return castById.get(id) ?? session?.cast?.[0];
  }, [session?.lead_cast_id, session?.cast, castById]);

  const playerCast = useMemo(() => {
    const id = session?.player_cast_id;
    if (!id) return null;
    return castById.get(id) ?? null;
  }, [session?.player_cast_id, castById]);

  const bootstrap = useCallback(async () => {
    if (!worldId || !levelCode) return;
    setLoading(true);
    setLoadError(null);
    setLevelCleared(false);
    setBadEndId(null);
    ttsRef.current.stopAllAudio();
    try {
      const entered = await enterWorldLevel(worldId, levelCode);
      setSession(entered);
      const castMap = new Map((entered.cast ?? []).map((c) => [c.cast_id, c]));
      const casts = entered.cast ?? [];
      const lead =
        (entered.lead_cast_id ? castMap.get(entered.lead_cast_id) : undefined) ?? casts[0];
      const playing =
        (entered.player_cast_id ? castMap.get(entered.player_cast_id) : undefined) ?? null;
      const hist = await getWorldMessages(worldId, entered.world_session_id).catch(() => null);
      if (hist?.messages?.length) {
        setMessages(
          hist.messages.flatMap((m) =>
            toWorldFreeChatMessages(m, castMap, casts, {
              playerAvatar,
              playerCastId: entered.player_cast_id,
              playerCastName: playing?.name,
              playerCastAvatar: playing?.figure_image,
              fallbackCast: lead,
            }),
          ),
        );
      } else {
        const boot: FreeChatMessage[] = [];
        for (const ev of entered.events ?? []) {
          const payload = ev.payload as { effects?: { narration?: string } } | null;
          const narration = payload?.effects?.narration?.trim();
          if (!narration) continue;
          boot.push({
            id: `evt-${ev.id}`,
            role: 'system',
            text: narration,
            timestamp: (ev.created_at || Date.now() / 1000) * 1000,
          });
        }
        if (entered.opening?.content) {
          boot.push(
            ...toWorldFreeChatMessages(entered.opening, castMap, casts, {
              playerAvatar,
              playerCastId: entered.player_cast_id,
              playerCastName: playing?.name,
              playerCastAvatar: playing?.figure_image,
              fallbackCast: lead,
            }),
          );
        }
        setMessages(boot);
      }
      void ttsRef.current.refreshVoiceQuota();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VIP_010') {
        setLoadError('vip_required');
        notifyWarning(t('settings.matureVipRequired'));
      } else if (e instanceof ApiError && e.code === 'WORLD_008') {
        setLoadError('locked');
        notifyWarning(t('worldPlay.levelLocked'));
      } else if (e instanceof ApiError && e.code === 'WORLD_020') {
        setLoadError('need_player_cast');
        notifyWarning(t('worldPlay.pickCastRequired'));
      } else {
        const msg = e instanceof ApiError ? e.message : t('worldPlay.loadFailed');
        setLoadError(msg);
        notifyError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [levelCode, playerAvatar, t, worldId]);

  useEffect(() => {
    void bootstrap();
    return () => {
      abortRef.current?.abort();
      ttsRef.current.stopAllAudio();
    };
  }, [bootstrap]);

  const interrupt = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    ttsRef.current.stopAllAudio();
    ttsRef.current.finishAwaitingTts();
    const sid = session?.world_session_id;
    if (sid) {
      try {
        await interruptWorld(worldId, sid);
      } catch {
        /* ignore */
      }
    }
    setSending(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false, isInterrupted: true } : m)),
    );
  }, [session?.world_session_id, worldId]);

  const saveProgress = useCallback(async () => {
    const sid = session?.world_session_id;
    if (!sid || saving || levelCleared) return;
    setSaving(true);
    try {
      await saveWorldCheckpoint(worldId, sid);
      notifySuccess(t('worldPlay.saveProgressOk'));
    } catch (e) {
      notifyError(e instanceof ApiError ? e.message : t('worldPlay.saveProgressFailed'));
    } finally {
      setSaving(false);
    }
  }, [levelCleared, saving, session?.world_session_id, t, worldId]);

  const send = useCallback(
    async (text: string, imageUrl?: string) => {
      const sid = session?.world_session_id;
      const content = text.trim();
      if (!sid || (!content && !imageUrl) || sending) return;
      unlockWebAudioAutoplay();
      ttsRef.current.stopAllAudio();

      const userId = `local-user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userId,
          role: 'player',
          text: content || (imageUrl ? '[Image]' : ''),
          imageUrl,
          timestamp: Date.now(),
          agentName: playerCast?.name,
          playerAvatar: playerCast?.figure_image || playerAvatar,
        },
      ]);
      setSending(true);
      setBadEndId(null);
      streamMsgIdRef.current = null;
      activeCastByMsgRef.current = new Map();
      const ac = new AbortController();
      abortRef.current = ac;

      const upsertAgent = (
        id: string,
        patch: Partial<FreeChatMessage> & { textAppend?: string; textReplace?: string },
      ) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === id);
          const activeId = activeCastByMsgRef.current.get(id);
          const resolved =
            resolveStreamCast(
              patch.textReplace ?? patch.textAppend ?? '',
              activeId,
              castById,
              castList,
              leadCast,
            ) ?? leadCast;
          if (idx >= 0) {
            const next = [...prev];
            const cur = next[idx];
            const nextText =
              patch.textReplace !== undefined
                ? patch.textReplace
                : patch.textAppend !== undefined
                  ? cur.text + patch.textAppend
                  : cur.text;
            const { textAppend: _a, textReplace: _r, ...rest } = patch;
            next[idx] = {
              ...cur,
              agentName: resolved?.name ?? cur.agentName,
              agentAvatar: resolved?.figure_image ?? cur.agentAvatar,
              ...rest,
              text: nextText,
            };
            return next;
          }
          const { textAppend: _a, textReplace: _r, ...rest } = patch;
          return [
            ...prev,
            {
              id,
              role: 'agent' as const,
              text: patch.textReplace ?? patch.textAppend ?? '',
              timestamp: Date.now(),
              isStreaming: true,
              agentName: resolved?.name,
              agentAvatar: resolved?.figure_image,
              ...rest,
            },
          ];
        });
      };

      const applySpeechToMessage = (id: string, full: string, streaming: boolean) => {
        const activeId = activeCastByMsgRef.current.get(id);
        const activeCast = activeId ? castById.get(activeId) : undefined;
        const segs = splitWorldSpeech(
          full,
          castList,
          activeCast ?? leadCast,
          session?.player_cast_id,
        );
        if (segs.length <= 1) {
          const seg = segs[0];
          upsertAgent(id, {
            textReplace: stripCastPrefix(seg?.text ?? full),
            isStreaming: streaming,
            agentName: seg?.cast?.name ?? activeCast?.name ?? leadCast?.name,
            agentAvatar: seg?.cast?.figure_image ?? activeCast?.figure_image ?? leadCast?.figure_image,
          });
          return;
        }
        setMessages((prev) => {
          const without = prev.filter((m) => m.id !== id && !m.id.startsWith(`${id}-s`));
          const expanded: FreeChatMessage[] = segs.map((seg, i) => ({
            id: i === 0 ? id : `${id}-s${i}`,
            role: 'agent' as const,
            text: stripCastPrefix(seg.text),
            timestamp: Date.now() + i,
            isStreaming: streaming && i === segs.length - 1,
            agentName: seg.cast?.name ?? leadCast?.name,
            agentAvatar: seg.cast?.figure_image ?? leadCast?.figure_image,
          }));
          return [...without, ...expanded];
        });
      };

      try {
        await sendWorldMessageStream(
          worldId,
          sid,
          content,
          {
            onTurnEnvelope: (env) => {
              if (env.assistant_message_id) {
                streamMsgIdRef.current = env.assistant_message_id;
                if (env.active_agent) {
                  activeCastByMsgRef.current.set(env.assistant_message_id, env.active_agent);
                }
                const cast = env.active_agent
                  ? castById.get(env.active_agent)
                  : leadCast;
                upsertAgent(env.assistant_message_id, {
                  isStreaming: true,
                  textReplace: '',
                  agentName: cast?.name,
                  agentAvatar: cast?.figure_image,
                });
              }
              if (env.scene_cleared) {
                setLevelCleared(true);
                notifySuccess(t('worldPlay.levelCleared'));
              }
              if (env.bad_end_id) {
                setBadEndId(env.bad_end_id);
                notifyWarning(t('worldPlay.badEnd'), env.bad_end_id);
              }
            },
            onTextDelta: (delta, messageId) => {
              const id = messageId || streamMsgIdRef.current || `stream-${Date.now()}`;
              streamMsgIdRef.current = id;
              upsertAgent(id, { textAppend: delta, isStreaming: true });
            },
            onText: (full, messageId) => {
              const id = messageId || streamMsgIdRef.current || `stream-${Date.now()}`;
              streamMsgIdRef.current = id;
              applySpeechToMessage(id, full, false);
            },
            onTextFinalize: (full, messageId) => {
              const id = messageId || streamMsgIdRef.current;
              if (!id) return;
              applySpeechToMessage(id, full, false);
            },
            onDone: (messageId) => {
              const id = messageId || streamMsgIdRef.current;
              if (id) {
                upsertAgent(id, { isStreaming: false });
                ttsRef.current.markAwaitingTts(id);
              }
              setSending(false);
            },
            onAudioChunk: (data, seq, format, messageId) => {
              ttsRef.current.handleStreamAudioChunk(data, seq, format, messageId);
            },
            onAudioDone: (data, format, messageId) => {
              ttsRef.current.handleStreamAudioDone(data, format, messageId);
            },
            onWorldEvent: (raw) => {
              try {
                const ev = JSON.parse(raw) as { event_type?: string };
                if (ev.event_type === 'world_bad_end') {
                  notifyWarning(t('worldPlay.badEnd'));
                }
              } catch {
                /* ignore */
              }
            },
            onError: (code) => {
              ttsRef.current.handleTtsError(code || '');
              if (!String(code || '').startsWith('tts_') && !String(code || '').includes('VOICE_')) {
                notifyError(code || t('worldPlay.sendFailed'));
              }
            },
            onInterrupted: () => {
              setSending(false);
            },
          },
          ac.signal,
          0,
          imageUrl,
        );
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          notifyError(e instanceof ApiError ? e.message : t('worldPlay.sendFailed'));
        }
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [
      castById,
      castList,
      leadCast,
      playerAvatar,
      playerCast,
      sending,
      session?.player_cast_id,
      session?.world_session_id,
      t,
      worldId,
    ],
  );

  const isThinking = useMemo(() => {
    if (!sending) return false;
    const streamingAgent = [...messages].reverse().find((m) => m.role === 'agent' && m.isStreaming);
    if (!streamingAgent) return true;
    return streamingAgent.text.trim().length === 0;
  }, [sending, messages]);

  return {
    loading,
    sending,
    loadError,
    session,
    messages,
    levelCleared,
    badEndId,
    leadCast,
    playerCast,
    isThinking,
    send,
    interrupt,
    saveProgress,
    saving,
    reload: bootstrap,
    voiceEnabled: tts.voiceEnabled,
    streamingAudioMsgId: tts.streamingAudioMsgId,
    playingMsgId: tts.playingMsgId,
    onToggleAudio: tts.handleToggleAudio,
    stopAllAudio: tts.stopAllAudio,
    voiceQuotaExceededVisible: tts.voiceQuotaExceededVisible,
    setVoiceQuotaExceededVisible: tts.setVoiceQuotaExceededVisible,
  };
}
