import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  enterStoryScene,
  getStoryEvents,
  getStoryGeneration,
  getStoryMessages,
  interruptStory,
  issueStoryMatureConsent,
  setStoryMatureTier,
} from '../api/story';
import { sendStoryMessageStream, type StoryTurnEnvelope, type StoryStreamCallbacks } from '../api/storyStream';
import { StoryWebSocket } from '../api/storyWebSocket';
import { ApiError } from '../api/client';
import type {
  StoryBeatAdvancePayload,
  StoryBadEndPayload,
  StoryEnterResp,
  StoryImagePayload,
  StoryRewardCompletePayload,
  StoryRewardEnterPayload,
  StoryRewardStagePayload,
  StorySceneClearPayload,
  StoryMessageItem,
} from '../types/story';
import type {
  AgentId,
  BadEndConfig,
  BeatId,
  ChatMessage,
  SceneConfig,
  SceneState,
} from '../engine/types';
import {
  beatAdvanceChatMessages,
  hasAgentReplyAfterLastUser,
  hasAssistantAfterLastUser,
  hasAssistantMessageItem,
  hasMessageWithContent,
  hasOptimisticUserMessage,
  countUserRoundsInBeat,
  mapStoryMessages,
  mergeStoryMessages,
  mergeStoryMessageItems,
  normalizeBeatId,
  serverBadEndToConfig,
  syncBeatFromMessages,
} from '../utils/storyMessages';
import { useAuthStore } from '../stores/authStore';
import { useVipStore } from '../stores/vipStore';
import { pushContentTierToServer } from '../utils/contentTierSync';
import { notifyError, notifyWarning } from '../utils/notify';
import { useAiDataConsentStore } from '../stores/aiDataConsentStore';
import { useI18n } from '../i18n/I18nContext';
import { toAppLang } from '../utils/userLang';
import { unwrapAssistantContent } from '../utils/llmContent';
import { applyStoryEventItem, storyEventIdFromPayload } from '../utils/storyEvents';

const REPLY_POLL_INTERVAL_MS = 1500;
const REPLY_POLL_BACKOFF_MS = [500, 1000, 2000, 4000];
const REPLY_POLL_MAX_ATTEMPTS = 60;
const GENERATION_TIMEOUT_MS = 90_000;
const DONE_FALLBACK_MS = 2500;
const GENERATION_SYNC_INTERVAL_MS = 2500;
const STREAM_SYNC_GUARD_MS = 2800;
const BEAT_ADVANCE_MESSAGE_STAGGER_MS = 420;

type PendingTurn = {
  userMessageId: string;
  assistantMessageId: string;
  generationId: string;
};

export function useStoryServerScene(
  config: SceneConfig,
  opts?: { forceNewEnter?: boolean; replayEnter?: boolean },
) {
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const updateUserLang = useAuthStore((s) => s.updateUserLang);
  const fetchVip = useVipStore((s) => s.fetchVip);
  const { lang } = useI18n();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [storySessionId, setStorySessionId] = useState('');
  const [currentBeat, setCurrentBeat] = useState<BeatId>(config.entryCheckpoint);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [storyRawItems, setStoryRawItems] = useState<StoryMessageItem[]>([]);
  const [contentTier, setContentTier] = useState<'standard' | 'mature'>('standard');
  const [matureEnabled, setMatureEnabled] = useState(false);
  const [matureGateShown, setMatureGateShown] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingAssistantMessageId, setPendingAssistantMessageId] = useState<string | null>(null);
  const [respondingAgentId, setRespondingAgentId] = useState<AgentId>('narrator');
  const [badEnd, setBadEnd] = useState<BadEndConfig | null>(null);
  const [showClear, setShowClear] = useState(false);
  const [sceneClearInfo, setSceneClearInfo] = useState<StorySceneClearPayload | null>(null);
  const [storyImage, setStoryImage] = useState<StoryImagePayload | null>(null);
  const [rewardActive, setRewardActive] = useState(false);
  const [rewardEnter, setRewardEnter] = useState<StoryRewardEnterPayload | null>(null);
  const [rewardStage, setRewardStage] = useState<StoryRewardStagePayload | null>(null);
  const [rewardComplete, setRewardComplete] = useState(false);
  const [rewardSeen, setRewardSeen] = useState<string[]>([]);
  const [matureGateTarget, setMatureGateTarget] = useState<'bad_end' | 'reward' | null>(null);

  const wsRef = useRef<StoryWebSocket | null>(null);
  const contentTierRef = useRef(contentTier);
  const rewardActiveRef = useRef(rewardActive);
  const activeAgentRef = useRef<AgentId>('narrator');
  const generatingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGeneratingRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const storySessionIdRef = useRef('');
  const pendingSceneClearRef = useRef<StorySceneClearPayload | null>(null);
  const doneFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTurnRef = useRef<PendingTurn | null>(null);
  const lastEventIdRef = useRef('');
  const storyRawItemsRef = useRef<StoryMessageItem[]>([]);
  const lastStreamChunkAtRef = useRef(0);
  const beatAdvanceTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const replayModeRef = useRef(false);
  const badEndFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedBadEndIdRef = useRef<string | null>(null);
  const pendingStoryImageRef = useRef<StoryImagePayload | null>(null);
  contentTierRef.current = contentTier;
  rewardActiveRef.current = rewardActive;

  const clearGeneratingFallback = useCallback(() => {
    if (generatingFallbackRef.current) {
      clearTimeout(generatingFallbackRef.current);
      generatingFallbackRef.current = null;
    }
    if (doneFallbackRef.current) {
      clearTimeout(doneFallbackRef.current);
      doneFallbackRef.current = null;
    }
    if (pollRetryRef.current) {
      clearTimeout(pollRetryRef.current);
      pollRetryRef.current = null;
    }
  }, []);

  const finishGenerating = useCallback(() => {
    clearGeneratingFallback();
    for (const timer of beatAdvanceTimersRef.current) {
      clearTimeout(timer);
    }
    beatAdvanceTimersRef.current = [];
    pendingTurnRef.current = null;
    setPendingAssistantMessageId(null);
    isGeneratingRef.current = false;
    setIsGenerating(false);
  }, [clearGeneratingFallback]);

  const applySceneClear = useCallback((payload: StorySceneClearPayload) => {
    pendingSceneClearRef.current = null;
    setSceneClearInfo(payload);
    setShowClear(true);
    setCurrentBeat('scene_clear');
  }, []);

  const sceneClearFromEnter = useCallback(
    (enter: StoryEnterResp): StorySceneClearPayload | null => {
      if (enter.story_session_id) return null;
      if (enter.status !== 'cleared' && enter.current_beat !== 'scene_clear') return null;
      return {
        scene_code: enter.scene_code,
        next_scene_code: enter.next_scene_code,
        next_scene_type: enter.next_scene_type,
      };
    },
    [],
  );

  const sceneClearFromSend = useCallback(
    (env: StoryTurnEnvelope): StorySceneClearPayload | null => {
      if (!env.scene_cleared) return null;
      return {
        scene_code: config.sceneId,
        next_scene_code: env.next_scene_code,
        next_scene_type: env.next_scene_type,
        show_paywall: env.show_paywall,
      };
    },
    [config.sceneId],
  );

  const queueSceneClear = useCallback((payload: StorySceneClearPayload | null) => {
    if (!payload) return;
    pendingSceneClearRef.current = payload;
  }, []);

  const flushPendingSceneClear = useCallback(() => {
    if (pendingSceneClearRef.current) {
      applySceneClear(pendingSceneClearRef.current);
    }
  }, [applySceneClear]);

  const tryFinishGenerating = useCallback(() => {
    if (!isGeneratingRef.current) return false;
    finishGenerating();
    flushPendingSceneClear();
    return true;
  }, [finishGenerating, flushPendingSceneClear]);

  const reloadMessages = useCallback(
    async (sessionId: string, opts?: { sinceId?: string; merge?: boolean }) => {
      const res = await getStoryMessages(sessionId, {
        limit: opts?.sinceId ? 24 : 80,
        sinceId: opts?.sinceId,
      });
      const mapped = mapStoryMessages(res.messages);
      setMessages((prev) => {
        const preserveLocal =
          opts?.merge ||
          opts?.sinceId ||
          isGeneratingRef.current ||
          hasOptimisticUserMessage(prev);
        if (!preserveLocal) {
          storyRawItemsRef.current = res.messages;
        } else if (res.messages.length > 0) {
          storyRawItemsRef.current = mergeStoryMessageItems(
            storyRawItemsRef.current,
            res.messages,
          );
        }
        if (preserveLocal) {
          if (mapped.length === 0) return prev;
          return mergeStoryMessages(prev, mapped);
        }
        const turn = pendingTurnRef.current;
        if (turn && hasAssistantMessageItem(res.messages, turn.assistantMessageId)) {
          return mergeStoryMessages(prev, mapped);
        }
        if (hasAgentReplyAfterLastUser(mapped)) return mapped;
        if (hasAgentReplyAfterLastUser(prev) && !hasAssistantAfterLastUser(res.messages)) {
          return prev;
        }
        return mapped;
      });
      setStoryRawItems(storyRawItemsRef.current);
      const beat = syncBeatFromMessages(res.messages, config);
      if (beat) {
        setCurrentBeat(beat);
      }
      return res;
    },
    [config],
  );

  const pollForStoryReplyRef = useRef<(timedOut?: boolean) => void>(() => {});

  const pollForStoryReply = useCallback(
    async (timedOut = false) => {
      const sessionId = storySessionIdRef.current;
      if (!sessionId) {
        if (timedOut && isGeneratingRef.current) finishGenerating();
        return;
      }
      if (pollInFlightRef.current) {
        if (timedOut && isGeneratingRef.current) finishGenerating();
        else {
          if (pollRetryRef.current) clearTimeout(pollRetryRef.current);
          pollRetryRef.current = setTimeout(() => {
            pollRetryRef.current = null;
            pollForStoryReplyRef.current(timedOut);
          }, 600);
        }
        return;
      }
      pollInFlightRef.current = true;
      try {
        for (let attempt = 0; attempt < REPLY_POLL_MAX_ATTEMPTS; attempt += 1) {
          if (!isGeneratingRef.current) return;
          if (attempt > 0) {
            const backoff =
              REPLY_POLL_BACKOFF_MS[Math.min(attempt - 1, REPLY_POLL_BACKOFF_MS.length - 1)];
            await new Promise((resolve) => setTimeout(resolve, backoff));
          }
          if (!isGeneratingRef.current) return;

          const turn = pendingTurnRef.current;
          if (turn?.generationId) {
            try {
              const gen = await getStoryGeneration(turn.generationId);
              if (gen.status === 'done' || gen.status === 'failed') {
                await reloadMessages(sessionId, {
                  sinceId: turn.userMessageId,
                  merge: true,
                });
                tryFinishGenerating();
                return;
              }
            } catch {
              // fall through to message poll
            }
          }

          const res = await getStoryMessages(sessionId, {
            sinceId: turn?.userMessageId,
            limit: 24,
          });
          const turnDone = turn
            ? hasAssistantMessageItem(res.messages, turn.assistantMessageId)
            : hasAssistantAfterLastUser(res.messages);
          if (!turnDone) continue;

          setMessages((prev) =>
            mergeStoryMessages(prev, mapStoryMessages(res.messages)),
          );
          tryFinishGenerating();
          return;
        }
        if (isGeneratingRef.current) {
          finishGenerating();
          if (timedOut) {
            notifyWarning('Story', 'Response timed out. Pull to refresh or try again.');
          }
        }
      } catch (err) {
        console.warn('Story poll for reply failed:', err);
        if (isGeneratingRef.current) {
          if (pollRetryRef.current) clearTimeout(pollRetryRef.current);
          pollRetryRef.current = setTimeout(() => {
            pollRetryRef.current = null;
            pollForStoryReplyRef.current(timedOut);
          }, REPLY_POLL_INTERVAL_MS);
        }
      } finally {
        pollInFlightRef.current = false;
      }
    },
    [finishGenerating, reloadMessages, tryFinishGenerating],
  );

  pollForStoryReplyRef.current = pollForStoryReply;

  const appendBeatAdvanceMessages = useCallback((payload: StoryBeatAdvancePayload) => {
    const additions = beatAdvanceChatMessages(payload);
    if (!additions.length) return;
    additions.forEach((msg, index) => {
      const timer = setTimeout(() => {
        setMessages((prev) => {
          if (prev.some((m) => m.text.trim() === msg.text.trim())) return prev;
          return mergeStoryMessages(prev, [msg]);
        });
      }, index * BEAT_ADVANCE_MESSAGE_STAGGER_MS);
      beatAdvanceTimersRef.current.push(timer);
    });
  }, []);

  const syncAfterGenerationEvent = useCallback(
    (sessionId: string, delayMs = 300, force = false) => {
      setTimeout(() => {
        void (async () => {
          try {
            if (
              !force &&
              isGeneratingRef.current &&
              Date.now() - lastStreamChunkAtRef.current < STREAM_SYNC_GUARD_MS
            ) {
              return;
            }
            const turn = pendingTurnRef.current;
            if (turn?.generationId) {
              try {
                const gen = await getStoryGeneration(turn.generationId);
                if (gen.status === 'done' || gen.status === 'failed') {
                  const res = await reloadMessages(sessionId, {
                    sinceId: turn.userMessageId,
                    merge: true,
                  });
                  if (isGeneratingRef.current) {
                    tryFinishGenerating();
                  }
                  void res;
                  return;
                }
              } catch {
                // fall through
              }
            }

            const res = await reloadMessages(
              sessionId,
              turn || isGeneratingRef.current
                ? { sinceId: turn?.userMessageId, merge: true }
                : undefined,
            );
            if (isGeneratingRef.current) {
              const done = turn
                ? hasAssistantMessageItem(res.messages, turn.assistantMessageId)
                : hasAssistantAfterLastUser(res.messages);
              if (done) {
                tryFinishGenerating();
                return;
              }
            }
            if (isGeneratingRef.current) {
              void pollForStoryReply();
            }
          } catch {
            if (isGeneratingRef.current) void pollForStoryReply();
          }
        })();
      }, delayMs);
    },
    [pollForStoryReply, reloadMessages, tryFinishGenerating],
  );

  const completeAgentReply = useCallback(
    (sessionId: string) => {
      tryFinishGenerating();
      syncAfterGenerationEvent(sessionId, 0, true);
    },
    [syncAfterGenerationEvent, tryFinishGenerating],
  );

  const beginGenerating = useCallback(() => {
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setPendingAssistantMessageId(null);
    setRespondingAgentId(activeAgentRef.current);
    clearGeneratingFallback();
    generatingFallbackRef.current = setTimeout(() => {
      generatingFallbackRef.current = null;
      void pollForStoryReply(true);
    }, GENERATION_TIMEOUT_MS);
  }, [clearGeneratingFallback, pollForStoryReply]);

  function enrichRewardStage(payload: StoryRewardStagePayload): StoryRewardStagePayload {
    if (payload.image) return payload;
    const mature = contentTierRef.current === 'mature';
    for (const reward of config.rewards) {
      const stage = reward.stages.find((s) => s.round === payload.round);
      if (!stage) continue;
      const image = mature
        ? stage.matureImage || stage.standardImage
        : stage.standardImage || stage.matureImage;
      if (image) return { ...payload, image };
    }
    return payload;
  }

  useEffect(() => {
    const mature = user?.content_tier === 'mature';
    setContentTier(mature ? 'mature' : 'standard');
    setMatureEnabled(mature);
    setMatureGateShown(true);
  }, [user?.content_tier]);

  const syncSessionContentTier = useCallback(
    async (sessionId: string, tier: 'standard' | 'mature') => {
      try {
        if (tier === 'mature') {
          const vip = useVipStore.getState().vip;
          if (!vip?.permissions?.mature_mode) return;
          const consent = await issueStoryMatureConsent(sessionId);
          await setStoryMatureTier(sessionId, 'mature', consent.consent_token);
        } else {
          await setStoryMatureTier(sessionId, 'standard');
        }
      } catch {
        // Session may already match user tier from enter; ignore sync errors.
      }
    },
    [],
  );

  const appendAgentMessage = useCallback((text: string, agent: AgentId = 'narrator') => {
    setMessages((prev) => [
      ...prev,
      {
        id: `reward-${Date.now()}`,
        agent,
        text,
        timestamp: Date.now(),
        type: 'agent',
      },
    ]);
  }, []);

  const applyBadEnd = useCallback(
    (payload: StoryBadEndPayload) => {
      const eventId = storyEventIdFromPayload(payload);
      if (eventId) lastEventIdRef.current = eventId;
      const next = serverBadEndToConfig(payload, config);
      if (dismissedBadEndIdRef.current === next.badEndId) return;
      setBadEnd((prev) => {
        if (prev?.badEndId === next.badEndId) return prev;
        return next;
      });
      finishGenerating();
      setRewardActive(false);
      if (payload.rollback_beat) {
        setCurrentBeat(normalizeBeatId(payload.rollback_beat, config));
      }
    },
    [config, finishGenerating],
  );

  const noteStoryEventId = useCallback((eventId: string) => {
    if (eventId) lastEventIdRef.current = eventId;
  }, []);

  const seedStoryEventCursor = useCallback(async (sessionId: string) => {
    try {
      const res = await getStoryEvents(sessionId, { limit: 1 });
      if (res.latest_event_id) {
        lastEventIdRef.current = res.latest_event_id;
      }
    } catch {
      // non-fatal
    }
  }, []);

  const storyEventHandlers = useCallback(
    () => ({
      applyBadEnd,
      applySceneClear,
      onBeatAdvance: (payload: StoryBeatAdvancePayload) => {
        noteStoryEventId(storyEventIdFromPayload(payload));
        if (payload.beat_id) {
          setCurrentBeat(normalizeBeatId(payload.beat_id, config));
        }
        if (payload.agent) {
          activeAgentRef.current = payload.agent as AgentId;
          setRespondingAgentId(payload.agent as AgentId);
        }
        appendBeatAdvanceMessages(payload);
        syncAfterGenerationEvent(storySessionIdRef.current, 700);
      },
      onRewardEnter: (payload: StoryRewardEnterPayload) => {
        noteStoryEventId(storyEventIdFromPayload(payload));
        setRewardActive(true);
        setRewardComplete(false);
        setRewardEnter(payload);
        setStoryImage(null);
      },
      onRewardStage: (payload: StoryRewardStagePayload) => {
        noteStoryEventId(storyEventIdFromPayload(payload));
        setRewardActive(true);
        setRewardComplete(false);
        finishGenerating();
        setRewardStage(enrichRewardStage(payload));
      },
      onRewardComplete: (payload: StoryRewardCompletePayload) => {
        noteStoryEventId(storyEventIdFromPayload(payload));
        finishGenerating();
        setRewardComplete(true);
        if (payload.reward_id) {
          setRewardSeen((prev) => [...new Set([...prev, payload.reward_id!])]);
        }
        if (payload.return_to_beat) {
          setCurrentBeat(normalizeBeatId(payload.return_to_beat, config));
        }
      },
      noteEventId: noteStoryEventId,
    }),
    [
      applyBadEnd,
      applySceneClear,
      config,
      finishGenerating,
      appendBeatAdvanceMessages,
      noteStoryEventId,
      syncAfterGenerationEvent,
    ],
  );

  const syncMissedStoryEvents = useCallback(
    async (sessionId: string) => {
      const since = lastEventIdRef.current;
      if (!since) return;
      try {
        const res = await getStoryEvents(sessionId, { sinceEventId: since });
        if (res.latest_event_id) {
          lastEventIdRef.current = res.latest_event_id;
        }
        const handlers = storyEventHandlers();
        for (const event of res.events) {
          applyStoryEventItem(event, config, handlers);
        }
      } catch (err) {
        console.warn('Story event sync failed:', err);
      }
    },
    [config, storyEventHandlers],
  );

  const appendAgentStreamText = useCallback(
    (content: string, messageId: string | undefined, finalize = false) => {
      const text = unwrapAssistantContent(content || '');
      if (!text && !finalize) return;
      const msgId =
        messageId ||
        pendingTurnRef.current?.assistantMessageId ||
        `ws-${Date.now()}`;
      const agent = activeAgentRef.current;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msgId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], text: finalize ? text : next[idx].text + text };
          return next;
        }
        return [
          ...prev,
          {
            id: msgId,
            agent,
            text,
            timestamp: Date.now(),
            type: 'agent',
          },
        ];
      });
      if (text.trim()) {
        lastStreamChunkAtRef.current = Date.now();
        if (doneFallbackRef.current) clearTimeout(doneFallbackRef.current);
        doneFallbackRef.current = setTimeout(() => {
          doneFallbackRef.current = null;
          if (isGeneratingRef.current) {
            syncAfterGenerationEvent(storySessionIdRef.current, 0);
          }
        }, DONE_FALLBACK_MS);
      }
    },
    [syncAfterGenerationEvent],
  );

  const storyStreamAbortRef = useRef<AbortController | null>(null);

  const connectWs = useCallback(
    (sessionId: string, authToken: string) => {
      wsRef.current?.disconnect();
      const ws = new StoryWebSocket(authToken, {
        onAuthOk: () => {
          void syncMissedStoryEvents(sessionId);
        },
        onStoryImage: (payload) => {
          if (rewardActiveRef.current) return;
          pendingStoryImageRef.current = payload;
        },
        onError: (msg) => {
          console.warn('Story WS:', msg);
        },
        onClose: () => {
          if (isGeneratingRef.current) {
            void pollForStoryReply();
          }
        },
      });
      ws.connect(sessionId);
      wsRef.current = ws;
    },
    [pollForStoryReply, syncMissedStoryEvents],
  );

  const connectWsRef = useRef(connectWs);
  connectWsRef.current = connectWs;

  const recoverStorySession = useCallback(async (): Promise<string | null> => {
    if (!token) return null;
    try {
      const enter = await enterStoryScene(config.sceneId, {
        forceNew: false,
        replay: replayModeRef.current,
      });
      const cleared = sceneClearFromEnter(enter);
      if (cleared) {
        applySceneClear(cleared);
        return null;
      }
      const tier =
        useAuthStore.getState().user?.content_tier === 'mature' ? 'mature' : 'standard';
      setStorySessionId(enter.story_session_id);
      storySessionIdRef.current = enter.story_session_id;
      setCurrentBeat(normalizeBeatId(enter.current_beat, config));
      if (enter.active_agent) {
        activeAgentRef.current = enter.active_agent as AgentId;
      }
      setFlags(enter.flags || {});
      await syncSessionContentTier(enter.story_session_id, tier);
      await reloadMessages(enter.story_session_id);
      await seedStoryEventCursor(enter.story_session_id);
      connectWsRef.current(enter.story_session_id, token);
      return enter.story_session_id;
    } catch (err) {
      console.warn('recoverStorySession failed:', err);
      return null;
    }
  }, [applySceneClear, config, reloadMessages, sceneClearFromEnter, syncSessionContentTier, token]);

  const sendStoryWithRecovery = useCallback(
    async (
      sessionId: string,
      content: string,
      optimisticUserMsgId?: string,
      signal?: AbortSignal,
    ) => {
      const handlers = storyEventHandlers();
      const streamCallbacks: StoryStreamCallbacks = {
        onTurnEnvelope: (env: StoryTurnEnvelope) => {
          const serverUserId = env.user_message_id ?? env.message_id;
          if (serverUserId && optimisticUserMsgId) {
            setMessages((prev) =>
              prev.map((m) => (m.id === optimisticUserMsgId ? { ...m, id: serverUserId } : m)),
            );
          }
          if (env.assistant_message_id && env.generation_id && serverUserId) {
            pendingTurnRef.current = {
              userMessageId: serverUserId,
              assistantMessageId: env.assistant_message_id,
              generationId: env.generation_id,
            };
            setPendingAssistantMessageId(env.assistant_message_id);
          }
          if (env.active_agent) {
            activeAgentRef.current = env.active_agent as AgentId;
            setRespondingAgentId(env.active_agent as AgentId);
          }
          queueSceneClear(sceneClearFromSend(env));
          if (env.reward_id) {
            setRewardActive(true);
            setRewardEnter((prev) => prev ?? { reward_id: env.reward_id! });
          }
          if (env.reward_complete && env.reward_id) {
            finishGenerating();
            setRewardActive(false);
            setRewardSeen((prev) => [...new Set([...prev, env.reward_id!])]);
          }
          if (env.bad_end_id) {
            finishGenerating();
            if (optimisticUserMsgId) {
              setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsgId));
            }
            if (env.rollback_beat) {
              setCurrentBeat(normalizeBeatId(env.rollback_beat, config));
            }
            const fallbackPayload: StoryBadEndPayload = {
              bad_end_id: env.bad_end_id,
              retry_hint: env.retry_hint,
              rollback_beat: env.rollback_beat,
              min_seconds: env.bad_end_min_seconds,
            };
            if (badEndFallbackTimerRef.current) {
              clearTimeout(badEndFallbackTimerRef.current);
            }
            badEndFallbackTimerRef.current = setTimeout(() => {
              badEndFallbackTimerRef.current = null;
              if (dismissedBadEndIdRef.current === env.bad_end_id) return;
              setBadEnd((prev) => {
                if (prev?.badEndId === env.bad_end_id) return prev;
                return serverBadEndToConfig(fallbackPayload, config);
              });
            }, 900);
          }
        },
        onText: (text, messageId) => appendAgentStreamText(text, messageId),
        onTextDelta: (text, messageId) => appendAgentStreamText(text, messageId),
        onTextFinalize: (text, messageId) => appendAgentStreamText(text, messageId, true),
        onDone: () => {
          if (doneFallbackRef.current) {
            clearTimeout(doneFallbackRef.current);
            doneFallbackRef.current = null;
          }
          completeAgentReply(sessionId);
        },
        onInterrupted: () => {
          finishGenerating();
        },
        onBadEnd: (payload) => {
          if (optimisticUserMsgId) {
            setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsgId));
          } else {
            setMessages((prev) => prev.filter((m) => !m.id.startsWith('u-')));
          }
          applyBadEnd(payload);
        },
        onBeatAdvance: handlers.onBeatAdvance,
        onSceneClear: (payload) => {
          noteStoryEventId(storyEventIdFromPayload(payload));
          applySceneClear(payload);
        },
        onRewardEnter: handlers.onRewardEnter,
        onRewardStage: handlers.onRewardStage,
        onRewardComplete: handlers.onRewardComplete,
        onError: (msg) => {
          console.warn('Story SSE:', msg);
          finishGenerating();
          notifyWarning('Story', msg);
        },
      };

      try {
        await sendStoryMessageStream(sessionId, content, streamCallbacks, signal);
      } catch (e) {
        if (e instanceof ApiError && e.code === 'STORY_002') {
          const newId = await recoverStorySession();
          if (!newId) throw e;
          await sendStoryMessageStream(newId, content, streamCallbacks, signal);
          return;
        }
        throw e;
      }
    },
    [
      storyEventHandlers,
      appendAgentStreamText,
      completeAgentReply,
      applyBadEnd,
      applySceneClear,
      noteStoryEventId,
      queueSceneClear,
      sceneClearFromSend,
      finishGenerating,
      config,
      recoverStorySession,
    ],
  );

  useEffect(() => {
    storySessionIdRef.current = storySessionId;
  }, [storySessionId]);

  useEffect(() => {
    if (!isGenerating || !storySessionId) return;
    void syncAfterGenerationEvent(storySessionId, 0);
    const interval = setInterval(() => {
      void syncAfterGenerationEvent(storySessionId, 0);
    }, GENERATION_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isGenerating, storySessionId, syncAfterGenerationEvent]);

  const awaitingAssistantReply = useMemo(() => {
    if (!isGenerating) return false;
    if (pendingAssistantMessageId) {
      return !hasMessageWithContent(messages, pendingAssistantMessageId);
    }
    return true;
  }, [isGenerating, pendingAssistantMessageId, messages]);

  const showTurnProgress = useMemo(() => {
    if (!isGenerating || rewardActive) return false;
    if (pendingAssistantMessageId) {
      return hasMessageWithContent(messages, pendingAssistantMessageId);
    }
    return hasAgentReplyAfterLastUser(messages);
  }, [isGenerating, pendingAssistantMessageId, messages, rewardActive]);

  useEffect(() => {
    const pending = pendingStoryImageRef.current;
    if (!pending || rewardActiveRef.current) return;
    if (!isGenerating && !awaitingAssistantReply) {
      setStoryImage(pending);
      pendingStoryImageRef.current = null;
    }
  }, [messages, isGenerating, awaitingAssistantReply]);

  useEffect(() => {
    if (!isGenerating || generatingFallbackRef.current) return;
    generatingFallbackRef.current = setTimeout(() => {
      generatingFallbackRef.current = null;
      void pollForStoryReply(true);
    }, GENERATION_TIMEOUT_MS);
  }, [isGenerating, pollForStoryReply]);

  useEffect(() => {
    if (!isLoggedIn || !loaded) return;
    const currentUser = useAuthStore.getState().user;
    if (currentUser && toAppLang(currentUser.system_lang) !== lang) {
      void updateUserLang(lang).catch(() => {});
    }
  }, [isLoggedIn, loaded, lang, updateUserLang]);

  useEffect(() => {
    if (!storySessionId || !isLoggedIn) return;
    const tier = user?.content_tier === 'mature' ? 'mature' : 'standard';
    setContentTier(tier);
    setMatureEnabled(tier === 'mature');
    void syncSessionContentTier(storySessionId, tier);
  }, [user?.content_tier, storySessionId, isLoggedIn, syncSessionContentTier]);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      setLoadError('login_required');
      setLoaded(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await fetchVip();
        wsRef.current?.disconnect();
        const replayEnter = !!opts?.replayEnter;
        replayModeRef.current = replayEnter;
        if (replayEnter) {
          setShowClear(false);
          setSceneClearInfo(null);
          setBadEnd(null);
          setRewardActive(false);
          setRewardEnter(null);
          setRewardStage(null);
          setRewardComplete(false);
          setMessages([]);
          storyRawItemsRef.current = [];
          setStoryRawItems([]);
          setIsGenerating(false);
          lastEventIdRef.current = '';
          pendingTurnRef.current = null;
        }
        const enter = await enterStoryScene(config.sceneId, {
          forceNew: !!opts?.forceNewEnter,
          replay: replayEnter,
        });
        if (cancelled) return;
        const cleared = sceneClearFromEnter(enter);
        if (cleared) {
          applySceneClear(cleared);
          setLoadError('');
          return;
        }
        const tier = user?.content_tier === 'mature' ? 'mature' : 'standard';
        setContentTier(tier);
        setMatureEnabled(tier === 'mature');
        setMatureGateShown(true);
        setStorySessionId(enter.story_session_id);
        storySessionIdRef.current = enter.story_session_id;
        setCurrentBeat(normalizeBeatId(enter.current_beat, config));
        if (enter.active_agent) {
          activeAgentRef.current = enter.active_agent as AgentId;
        }
        setFlags(enter.flags || {});
        await syncSessionContentTier(enter.story_session_id, tier);
        const msgRes = await reloadMessages(enter.story_session_id);
        if (msgRes.messages.length === 0 && enter.opening?.content) {
          setMessages(mapStoryMessages([enter.opening]));
        }
        await seedStoryEventCursor(enter.story_session_id);
        connectWsRef.current(enter.story_session_id, token);
        setLoadError('');
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.code === 'VIP_001') {
          setLoadError('vip_required');
        } else if (e instanceof ApiError && e.code === 'STORY_015') {
          setLoadError('dev_required');
        } else {
          const msg = e instanceof ApiError ? e.message : 'Failed to enter scene';
          setLoadError(msg);
          notifyError('Error', msg);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
      clearGeneratingFallback();
      wsRef.current?.disconnect();
    };
  }, [
    config.sceneId,
    isLoggedIn,
    token,
    reloadMessages,
    config,
    fetchVip,
    opts?.forceNewEnter,
    opts?.replayEnter,
    syncSessionContentTier,
    clearGeneratingFallback,
    applySceneClear,
    sceneClearFromEnter,
  ]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !storySessionId || isGeneratingRef.current) return;

      const consented = await useAiDataConsentStore.getState().ensureConsent();
      if (!consented) return;

      dismissedBadEndIdRef.current = null;
      const userMsgId = `u-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          agent: 'player',
          text: trimmed,
          timestamp: Date.now(),
          type: 'player',
        },
      ]);
      beginGenerating();

      storyStreamAbortRef.current?.abort();
      const ac = new AbortController();
      storyStreamAbortRef.current = ac;

      try {
        const sessionId = storySessionIdRef.current || storySessionId;
        await sendStoryWithRecovery(sessionId, trimmed, userMsgId, ac.signal);
      } catch (e) {
        if (e instanceof ApiError && e.code === 'STORY_004') {
          finishGenerating();
          setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
          notifyWarning('Story', e.message);
          return;
        }
        if (e instanceof ApiError && e.code === 'STORY_002') {
          finishGenerating();
          setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
          if (!pendingSceneClearRef.current) {
            notifyWarning('Story', e.message);
          } else {
            flushPendingSceneClear();
          }
          return;
        }
        if (e instanceof Error && e.name === 'AbortError') {
          finishGenerating();
          return;
        }
        finishGenerating();
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
        notifyError('Error', e instanceof ApiError ? e.message : 'Send failed');
      } finally {
        if (storyStreamAbortRef.current === ac) {
          storyStreamAbortRef.current = null;
        }
      }
    },
    [
      storySessionId,
      finishGenerating,
      beginGenerating,
      sendStoryWithRecovery,
      flushPendingSceneClear,
    ],
  );

  const interruptGeneration = useCallback(async () => {
    const sessionId = storySessionIdRef.current;
    if (!sessionId) return;
    storyStreamAbortRef.current?.abort();
    storyStreamAbortRef.current = null;
    finishGenerating();
    try {
      await interruptStory(sessionId);
    } catch (err) {
      console.warn('Story interrupt failed:', err);
    }
  }, [finishGenerating]);

  const applySessionMatureTier = useCallback(
    async (tier: 'standard' | 'mature') => {
      if (!storySessionId) return;
      try {
        if (tier === 'mature') {
          const vip = useVipStore.getState().vip;
          if (!vip?.permissions?.mature_mode) {
            notifyWarning('VIP', 'Mature requires VIP mature_mode');
            return;
          }
          const consent = await issueStoryMatureConsent(storySessionId);
          await setStoryMatureTier(storySessionId, 'mature', consent.consent_token);
        } else {
          await setStoryMatureTier(storySessionId, 'standard');
        }
        setContentTier(tier);
        setMatureEnabled(tier === 'mature');
      } catch (e) {
        notifyError('Error', e instanceof ApiError ? e.message : 'Tier change failed');
      }
    },
    [storySessionId],
  );

  const setMature = useCallback(
    (enabled: boolean) => {
      setMatureEnabled(enabled);
      setMatureGateShown(true);
      setContentTier(enabled ? 'mature' : 'standard');
      if (isLoggedIn) {
        void pushContentTierToServer(enabled).catch(() => {});
        void applySessionMatureTier(enabled ? 'mature' : 'standard');
      }
    },
    [isLoggedIn, applySessionMatureTier],
  );

  const dismissBadEnd = useCallback(async () => {
    const rollbackBeat = badEnd?.rollbackCheckpoint ?? config.entryCheckpoint;
    if (badEnd?.badEndId) {
      dismissedBadEndIdRef.current = badEnd.badEndId;
    }
    if (badEndFallbackTimerRef.current) {
      clearTimeout(badEndFallbackTimerRef.current);
      badEndFallbackTimerRef.current = null;
    }
    setBadEnd(null);
    setCurrentBeat(normalizeBeatId(rollbackBeat, config));
    setMessages([]);
    storyRawItemsRef.current = [];
    setStoryRawItems([]);
    if (!storySessionId) return;
    try {
      await reloadMessages(storySessionId);
      const events = await getStoryEvents(storySessionId, { limit: 1 });
      if (events.latest_event_id) {
        lastEventIdRef.current = events.latest_event_id;
      }
    } catch (err) {
      console.warn('dismissBadEnd reload failed:', err);
    }
  }, [badEnd, config, storySessionId, reloadMessages]);

  const dismissReward = useCallback(() => {
    finishGenerating();
    setRewardActive(false);
    setRewardEnter(null);
    setRewardStage(null);
    setRewardComplete(false);
    setStoryImage(null);
    pendingStoryImageRef.current = null;
    if (storySessionId) void reloadMessages(storySessionId);
  }, [storySessionId, reloadMessages, finishGenerating]);

  const restart = useCallback(async () => {
    if (!token) return;
    wsRef.current?.disconnect();
    setShowClear(false);
    setSceneClearInfo(null);
    setBadEnd(null);
    setRewardActive(false);
    setRewardEnter(null);
    setRewardStage(null);
    setRewardComplete(false);
    setMessages([]);
    storyRawItemsRef.current = [];
    setStoryRawItems([]);
    replayModeRef.current = true;
    try {
      const enter = await enterStoryScene(config.sceneId, { replay: true });
      setStorySessionId(enter.story_session_id);
      storySessionIdRef.current = enter.story_session_id;
      setCurrentBeat(normalizeBeatId(enter.current_beat, config));
      setFlags(enter.flags || {});
      await reloadMessages(enter.story_session_id);
      await seedStoryEventCursor(enter.story_session_id);
      connectWsRef.current(enter.story_session_id, token);
    } catch (e) {
      notifyError('Error', e instanceof ApiError ? e.message : 'Restart failed');
    }
  }, [token, config, reloadMessages, seedStoryEventCursor]);

  const state: SceneState = {
    sceneId: config.sceneId,
    currentBeat,
    flags,
    messages,
    matureEnabled,
    matureGateShown,
    rewardSeen,
    badEndSeen: [],
    rewardRoundsInBeat4: 0,
  };

  const userRoundsInBeat = useMemo(
    () => countUserRoundsInBeat(storyRawItems, currentBeat),
    [storyRawItems, currentBeat],
  );

  return {
    state,
    loaded,
    loadError,
    send,
    interruptGeneration,
    setMature,
    restart,
    isGenerating,
    awaitingAssistantReply,
    showTurnProgress,
    respondingAgentId,
    badEnd,
    dismissBadEnd,
    showClear,
    sceneClearInfo,
    storyImage,
    dismissStoryImage: () => {
      pendingStoryImageRef.current = null;
      setStoryImage(null);
    },
    contentTier,
    applySessionMatureTier,
    rewardActive,
    rewardEnter,
    rewardStage,
    rewardComplete,
    dismissReward,
    matureGateTarget,
    setMatureGateTarget,
    userRoundsInBeat,
  };
}
