import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import {
  abandonSimulatorPlay,
  enterSimulatorPlay,
  interruptSimulatorPlay,
  listSimulatorMessages,
} from '../api/simulator';
import { sendSimulatorMessageStream } from '../api/simulatorStream';
import { useI18n } from '../i18n/I18nContext';
import type {
  SimulatorCastPreview,
  SimulatorGoalProgress,
  SimulatorPlayEnterResp,
  SimulatorPlayMessage,
  SimulatorSettleKind,
} from '../types/simulator';
import { formatApiError } from '../utils/apiError';
import { notifyError } from '../utils/notify';

function mapHistoryRole(role: string): SimulatorPlayMessage['role'] {
  const r = role.toLowerCase();
  if (r === 'user' || r === 'player') return 'user';
  if (r === 'system') return 'system';
  return 'agent';
}

function parseSettlePayload(
  raw: string,
  kind: 'victory' | 'failure',
): { text: string; flags?: Record<string, boolean> } {
  try {
    const data = JSON.parse(raw) as {
      victory_text?: string;
      failure_text?: string;
      flags?: Record<string, boolean>;
    };
    const text =
      kind === 'victory'
        ? (data.victory_text || '').trim()
        : (data.failure_text || '').trim();
    return { text, flags: data.flags };
  } catch {
    return { text: '' };
  }
}

function parseGoalProgress(raw: string): SimulatorGoalProgress | null {
  try {
    const data = JSON.parse(raw) as {
      matched_goals?: string[];
      matched_fails?: string[];
      flags?: Record<string, boolean>;
      round_count?: number;
      max_rounds?: number;
    };
    return {
      matchedGoals: Array.isArray(data.matched_goals) ? data.matched_goals : [],
      matchedFails: Array.isArray(data.matched_fails) ? data.matched_fails : [],
      flags: data.flags && typeof data.flags === 'object' ? data.flags : {},
      roundCount: typeof data.round_count === 'number' ? data.round_count : undefined,
      maxRounds: typeof data.max_rounds === 'number' ? data.max_rounds : undefined,
    };
  } catch {
    return null;
  }
}

function mapHistoryMessages(
  messages: {
    id: string;
    role: string;
    content: string;
    cast_id?: string;
    image_url?: string;
    created_at: number;
  }[],
): SimulatorPlayMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: mapHistoryRole(m.role),
    text: m.content,
    imageUrl: m.image_url,
    castId: m.cast_id,
    timestamp: m.created_at > 0 ? m.created_at : Date.now(),
  }));
}

export function useSimulatorPlay(simulatorId: string) {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<SimulatorPlayEnterResp | null>(null);
  const [messages, setMessages] = useState<SimulatorPlayMessage[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [settleKind, setSettleKind] = useState<SimulatorSettleKind>(null);
  const [settleText, setSettleText] = useState('');
  const [goalProgress, setGoalProgress] = useState<SimulatorGoalProgress | null>(null);
  const [abandoning, setAbandoning] = useState(false);
  const [needPlayerCast, setNeedPlayerCast] = useState(false);
  const [playableCast, setPlayableCast] = useState<SimulatorCastPreview[]>([]);
  const [selectingCast, setSelectingCast] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const streamMsgIdRef = useRef<string | null>(null);

  const applyEnteredSession = useCallback((entered: SimulatorPlayEnterResp) => {
    setSession(entered);
    setNeedPlayerCast(false);
    setPlayableCast(entered.playable_cast ?? []);
    setGoalProgress(null);

    const status = (entered.status || '').toLowerCase();
    if (status === 'won' || status === 'victory') {
      setSettleKind('victory');
      setSettleText(entered.victory_text || '');
      setShowIntro(false);
    } else if (status === 'failed' || status === 'failure') {
      setSettleKind('failure');
      setSettleText(entered.failure_text || '');
      setShowIntro(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    const hist = await listSimulatorMessages(simulatorId).catch(() => null);
    if (hist?.messages?.length) {
      setMessages(mapHistoryMessages(hist.messages));
      setShowIntro(false);
    } else {
      setMessages([]);
    }
  }, [simulatorId]);

  const bootstrap = useCallback(async () => {
    if (!simulatorId) return;
    setLoading(true);
    setLoadError(null);
    setSettleKind(null);
    setSettleText('');
    setGoalProgress(null);
    setShowIntro(true);
    setNeedPlayerCast(false);
    setPlayableCast([]);
    try {
      const entered = await enterSimulatorPlay(simulatorId);
      setSession(entered);
      setPlayableCast(entered.playable_cast ?? []);

      if (entered.need_player_cast && !entered.session_id) {
        setNeedPlayerCast(true);
        setMessages([]);
        setShowIntro(false);
        return;
      }

      applyEnteredSession(entered);
      await loadMessages();
    } catch (e) {
      const msg = formatApiError(t, e);
      setLoadError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }, [applyEnteredSession, loadMessages, simulatorId, t]);

  useEffect(() => {
    void bootstrap();
    return () => {
      abortRef.current?.abort();
    };
  }, [bootstrap]);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  const selectPlayerCast = useCallback(
    async (castId: string) => {
      if (!simulatorId || !castId || selectingCast) return;
      setSelectingCast(true);
      setLoadError(null);
      try {
        const entered = await enterSimulatorPlay(simulatorId, { player_cast_id: castId });
        if (entered.need_player_cast && !entered.session_id) {
          setNeedPlayerCast(true);
          setPlayableCast(entered.playable_cast ?? []);
          setSession(entered);
          return;
        }
        applyEnteredSession(entered);
        setShowIntro(true);
        await loadMessages();
      } catch (e) {
        notifyError(formatApiError(t, e));
      } finally {
        setSelectingCast(false);
      }
    },
    [applyEnteredSession, loadMessages, selectingCast, simulatorId, t],
  );

  const send = useCallback(
    async (text: string, imageUrl?: string) => {
      const sid = session?.session_id;
      const content = text.trim();
      if (!sid || (!content && !imageUrl) || sending || settleKind) return;

      const userId = `local-user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userId,
          role: 'user',
          text: content || (imageUrl ? '[image]' : ''),
          imageUrl,
          timestamp: Date.now(),
        },
      ]);
      setSending(true);
      setShowIntro(false);

      const ac = new AbortController();
      abortRef.current = ac;
      streamMsgIdRef.current = null;

      try {
        await sendSimulatorMessageStream(
          simulatorId,
          sid,
          content,
          {
            onTurnEnvelope: (env) => {
              if (env.assistant_message_id) {
                streamMsgIdRef.current = env.assistant_message_id;
              }
            },
            onText: (chunk, messageId) => {
              const id = messageId || streamMsgIdRef.current || `stream-${Date.now()}`;
              streamMsgIdRef.current = id;
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = { ...next[idx], text: chunk, isStreaming: true };
                  return next;
                }
                return [
                  ...prev,
                  {
                    id,
                    role: 'agent',
                    text: chunk,
                    castId: session?.lead_cast_id,
                    timestamp: Date.now(),
                    isStreaming: true,
                  },
                ];
              });
            },
            onTextDelta: (delta, messageId) => {
              const id = messageId || streamMsgIdRef.current || `stream-${Date.now()}`;
              streamMsgIdRef.current = id;
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = {
                    ...next[idx],
                    text: next[idx].text + delta,
                    isStreaming: true,
                    castId: next[idx].castId || session?.lead_cast_id,
                  };
                  return next;
                }
                return [
                  ...prev,
                  {
                    id,
                    role: 'agent',
                    text: delta,
                    castId: session?.lead_cast_id,
                    timestamp: Date.now(),
                    isStreaming: true,
                  },
                ];
              });
            },
            onTextFinalize: (finalText, messageId) => {
              const id = messageId || streamMsgIdRef.current;
              if (!id) return;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id
                    ? { ...m, text: finalText || m.text, isStreaming: false }
                    : m,
                ),
              );
            },
            onGoalProgress: (raw) => {
              const parsed = parseGoalProgress(raw);
              if (!parsed) return;
              setGoalProgress(parsed);
              setSession((s) => {
                if (!s) return s;
                const next = { ...s, flags: { ...s.flags, ...parsed.flags } };
                if (typeof parsed.roundCount === 'number') next.round_count = parsed.roundCount;
                if (typeof parsed.maxRounds === 'number') next.max_rounds = parsed.maxRounds;
                return next;
              });
            },
            onVictory: (raw) => {
              const parsed = parseSettlePayload(raw, 'victory');
              setSettleKind('victory');
              setSettleText(parsed.text || session?.victory_text || '');
              if (parsed.flags) {
                setSession((s) => (s ? { ...s, flags: parsed.flags!, status: 'won' } : s));
              }
            },
            onFailure: (raw) => {
              const parsed = parseSettlePayload(raw, 'failure');
              setSettleKind('failure');
              setSettleText(parsed.text || session?.failure_text || '');
              if (parsed.flags) {
                setSession((s) => (s ? { ...s, flags: parsed.flags!, status: 'failed' } : s));
              }
            },
            onDone: () => {
              setMessages((prev) =>
                prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
              );
            },
            onError: (contentErr) => {
              notifyError(contentErr || t('simulator.sendFailed'));
            },
          },
          ac.signal,
          0,
          imageUrl,
        );
      } catch (e) {
        if (e instanceof ApiError && e.code === 'ABORTED') return;
        if ((e as { name?: string })?.name === 'AbortError') return;
        notifyError(formatApiError(t, e) || t('simulator.sendFailed'));
        setMessages((prev) =>
          prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
        );
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [sending, session, settleKind, simulatorId, t],
  );

  const interrupt = useCallback(() => {
    if (!sending) return;
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    );
    if (simulatorId) {
      void interruptSimulatorPlay(simulatorId).catch(() => {
        /* best-effort server cancel */
      });
    }
  }, [sending, simulatorId]);

  const abandon = useCallback(async () => {
    if (!simulatorId || abandoning) return;
    setAbandoning(true);
    abortRef.current?.abort();
    try {
      if (session?.session_id) {
        await abandonSimulatorPlay(simulatorId);
      }
      setSettleKind(null);
      setSettleText('');
      setGoalProgress(null);
      setMessages([]);
      setSession(null);
      setNeedPlayerCast(false);
      setPlayableCast([]);
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setAbandoning(false);
    }
  }, [abandoning, session?.session_id, simulatorId, t]);

  const replay = useCallback(async () => {
    abortRef.current?.abort();
    try {
      const entered = await enterSimulatorPlay(simulatorId, { force_new: true });
      setPlayableCast(entered.playable_cast ?? []);
      setMessages([]);
      setSettleKind(null);
      setSettleText('');
      setGoalProgress(null);
      setLoadError(null);

      if (entered.need_player_cast && !entered.session_id) {
        setSession(entered);
        setNeedPlayerCast(true);
        setShowIntro(false);
        return;
      }

      applyEnteredSession(entered);
      setShowIntro(true);
    } catch (e) {
      notifyError(formatApiError(t, e));
    }
  }, [applyEnteredSession, simulatorId, t]);

  return {
    loading,
    sending,
    loadError,
    session,
    messages,
    showIntro,
    settleKind,
    settleText,
    goalProgress,
    abandoning,
    needPlayerCast,
    playableCast,
    selectingCast,
    dismissIntro,
    selectPlayerCast,
    send,
    interrupt,
    abandon,
    replay,
    reload: bootstrap,
  };
}
