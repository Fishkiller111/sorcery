import { getApiBase } from '../constants/config';
import { getApiAcceptLanguage } from './apiLang';
import { ApiError, applyClientHeaders, getAuthToken } from './client';
import { handleUnauthorized } from './unauthorized';
import { postEventStream, throwIfAborted } from './sseConsume';
import {
  isSseCapacityCode,
  parseRetryAfterSec,
  sleep,
  sseRetryDelayMs,
} from './sseRetry';
import type {
  StoryBadEndPayload,
  StoryBeatAdvancePayload,
  StoryRewardCompletePayload,
  StoryRewardEnterPayload,
  StoryRewardStagePayload,
  StorySceneClearPayload,
} from '../types/story';

export interface StoryTurnEnvelope {
  user_message_id?: string;
  message_id?: string;
  assistant_message_id?: string;
  generation_id?: string;
  generation_status?: string;
  active_agent?: string;
  reward_id?: string;
  reward_complete?: boolean;
  scene_cleared?: boolean;
  next_scene_code?: string;
  next_scene_type?: string;
  show_paywall?: boolean;
  bad_end_id?: string;
  retry_hint?: string;
  rollback_beat?: string;
  bad_end_min_seconds?: number;
}

export interface StoryStreamEvent {
  type: string;
  content?: string;
  message_id?: string;
  user_message_id?: string;
  assistant_message_id?: string;
  generation_id?: string;
  generation_status?: string;
  active_agent?: string;
  reward_id?: string;
  reward_complete?: boolean;
  scene_cleared?: boolean;
  next_scene_code?: string;
  next_scene_type?: string;
  show_paywall?: boolean;
  bad_end_id?: string;
  retry_hint?: string;
  rollback_beat?: string;
  bad_end_min_seconds?: number;
  format?: string;
  data?: string;
  seq?: number;
  total_chunks?: number;
}

export interface StoryStreamCallbacks {
  onTurnEnvelope?: (env: StoryTurnEnvelope) => void;
  onText?: (content: string, messageId?: string) => void;
  onTextDelta?: (content: string, messageId?: string) => void;
  onTextFinalize?: (content: string, messageId?: string) => void;
  onTone?: (tone: string) => void;
  onDone?: (messageId?: string) => void;
  onInterrupted?: () => void;
  onError?: (content: string) => void;
  onBadEnd?: (payload: StoryBadEndPayload) => void;
  onBeatAdvance?: (payload: StoryBeatAdvancePayload) => void;
  onSceneClear?: (payload: StorySceneClearPayload) => void;
  onRewardEnter?: (payload: StoryRewardEnterPayload) => void;
  onRewardStage?: (payload: StoryRewardStagePayload) => void;
  onRewardComplete?: (payload: StoryRewardCompletePayload) => void;
  onAudioChunk?: (base64: string, seq: number, format: string, messageId?: string) => void;
  onAudioDone?: (base64: string, format: string, messageId?: string) => void;
}

function parseJsonPayload<T>(raw?: string): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function turnEnvelopeFromEvent(msg: StoryStreamEvent): StoryTurnEnvelope {
  return {
    user_message_id: msg.user_message_id ?? msg.message_id,
    message_id: msg.message_id ?? msg.user_message_id,
    assistant_message_id: msg.assistant_message_id,
    generation_id: msg.generation_id,
    generation_status: msg.generation_status,
    active_agent: msg.active_agent,
    reward_id: msg.reward_id,
    reward_complete: msg.reward_complete,
    scene_cleared: msg.scene_cleared,
    next_scene_code: msg.next_scene_code,
    next_scene_type: msg.next_scene_type,
    show_paywall: msg.show_paywall,
    bad_end_id: msg.bad_end_id,
    retry_hint: msg.retry_hint,
    rollback_beat: msg.rollback_beat,
    bad_end_min_seconds: msg.bad_end_min_seconds,
  };
}

function dispatchStoryStreamEvent(msg: StoryStreamEvent, callbacks: StoryStreamCallbacks) {
  switch (msg.type) {
    case 'turn_envelope':
      callbacks.onTurnEnvelope?.(turnEnvelopeFromEvent(msg));
      break;
    case 'text':
      callbacks.onText?.(msg.content ?? '', msg.message_id);
      break;
    case 'text_delta':
      callbacks.onTextDelta?.(msg.content ?? '', msg.message_id);
      break;
    case 'text_finalize':
      callbacks.onTextFinalize?.(msg.content ?? '', msg.message_id);
      break;
    case 'tone':
      callbacks.onTone?.(msg.content ?? '');
      break;
    case 'done':
      callbacks.onDone?.(msg.message_id);
      break;
    case 'interrupted':
      callbacks.onInterrupted?.();
      break;
    case 'story_bad_end': {
      const payload = parseJsonPayload<StoryBadEndPayload>(msg.content);
      if (payload) callbacks.onBadEnd?.(payload);
      break;
    }
    case 'story_beat_advance': {
      const payload = parseJsonPayload<StoryBeatAdvancePayload>(msg.content);
      if (payload) callbacks.onBeatAdvance?.(payload);
      break;
    }
    case 'story_scene_clear': {
      const payload = parseJsonPayload<StorySceneClearPayload>(msg.content);
      if (payload) callbacks.onSceneClear?.(payload);
      break;
    }
    case 'story_reward_enter': {
      const payload = parseJsonPayload<StoryRewardEnterPayload>(msg.content);
      if (payload) callbacks.onRewardEnter?.(payload);
      break;
    }
    case 'story_reward_stage': {
      const payload = parseJsonPayload<StoryRewardStagePayload>(msg.content);
      if (payload) callbacks.onRewardStage?.(payload);
      break;
    }
    case 'story_reward_complete': {
      const payload = parseJsonPayload<StoryRewardCompletePayload>(msg.content);
      if (payload) callbacks.onRewardComplete?.(payload);
      break;
    }
    case 'audio_chunk':
      if (msg.data) {
        callbacks.onAudioChunk?.(
          msg.data,
          msg.seq ?? 0,
          msg.format === 'wav' ? 'wav' : 'mp3',
          msg.message_id,
        );
      }
      break;
    case 'audio_done':
      callbacks.onAudioDone?.(msg.data ?? '', msg.format === 'wav' ? 'wav' : 'mp3', msg.message_id);
      break;
    case 'error':
      callbacks.onError?.(msg.content ?? 'unknown');
      break;
    default:
      break;
  }
}

const SSE_MAX_CAPACITY_RETRIES = 3;

export async function sendStoryMessageStream(
  storySessionId: string,
  content: string,
  callbacks: StoryStreamCallbacks,
  signal?: AbortSignal,
  attempt = 0,
): Promise<void> {
  throwIfAborted(signal);

  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    'Accept-Language': getApiAcceptLanguage(),
  };
  applyClientHeaders(headers);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${getApiBase()}/story/chat/send`;
  const payload = JSON.stringify({ story_session_id: storySessionId, content });

  const onData = (raw: string) => {
    try {
      const msg = JSON.parse(raw) as StoryStreamEvent;
      dispatchStoryStreamEvent(msg, callbacks);
    } catch (err) {
      console.error('Failed to parse story SSE event:', err, raw);
    }
  };

  const res = await postEventStream(url, headers, payload, onData, signal);

  if (res === null) {
    return;
  }

  if (res.status === 401) {
    handleUnauthorized();
    throw new ApiError('Unauthorized', 401, 'AUTH_EXPIRED');
  }

  if (res.status === 503 || res.status === 429) {
    let message = res.status === 429 ? 'rate limit exceeded' : 'server busy';
    let code: string | undefined;
    try {
      const errBody = await res.json();
      if (errBody.message) message = errBody.message;
      if (errBody.error_code) code = errBody.error_code;
      else if (errBody.code) code = String(errBody.code);
    } catch {
      /* ignore */
    }
    const retryAfter = parseRetryAfterSec(res.headers.get('Retry-After'));
    if (
      !signal?.aborted &&
      attempt < SSE_MAX_CAPACITY_RETRIES &&
      (res.status === 429 || isSseCapacityCode(code))
    ) {
      await sleep(sseRetryDelayMs(attempt, retryAfter));
      return sendStoryMessageStream(storySessionId, content, callbacks, signal, attempt + 1);
    }
    throw new ApiError(message, res.status, code);
  }

  if (!res.ok) {
    let message = `API error ${res.status}`;
    let code: string | undefined;
    try {
      const errBody = await res.json();
      if (errBody.message) message = errBody.message;
      if (errBody.error_code) code = errBody.error_code;
      else if (errBody.code) code = errBody.code;
    } catch {
      const text = await res.text().catch(() => '');
      if (text) message = text;
    }
    throw new ApiError(message, res.status, code);
  }
}
