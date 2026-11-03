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

export type WorldTurnEnvelope = {
  user_message_id?: string;
  message_id?: string;
  assistant_message_id?: string;
  generation_status?: string;
  active_agent?: string;
  scene_cleared?: boolean;
  bad_end_id?: string;
  rollback_beat?: string;
};

export type WorldStreamEvent = {
  type: string;
  content?: string;
  message_id?: string;
  user_message_id?: string;
  assistant_message_id?: string;
  generation_status?: string;
  active_agent?: string;
  scene_cleared?: boolean;
  bad_end_id?: string;
  rollback_beat?: string;
  format?: string;
  data?: string;
  seq?: number;
};

export type WorldStreamCallbacks = {
  onTurnEnvelope?: (env: WorldTurnEnvelope) => void;
  onText?: (content: string, messageId?: string) => void;
  onTextDelta?: (content: string, messageId?: string) => void;
  onTextFinalize?: (content: string, messageId?: string) => void;
  onTone?: (tone: string) => void;
  onWorldEvent?: (raw: string) => void;
  onDone?: (messageId?: string) => void;
  onInterrupted?: () => void;
  onError?: (content: string) => void;
  onAudioChunk?: (base64: string, seq: number, format: string, messageId?: string) => void;
  onAudioDone?: (base64: string, format: string, messageId?: string) => void;
};

function turnEnvelopeFromEvent(msg: WorldStreamEvent): WorldTurnEnvelope {
  return {
    user_message_id: msg.user_message_id ?? msg.message_id,
    message_id: msg.message_id ?? msg.user_message_id,
    assistant_message_id: msg.assistant_message_id,
    generation_status: msg.generation_status,
    active_agent: msg.active_agent,
    scene_cleared: msg.scene_cleared,
    bad_end_id: msg.bad_end_id,
    rollback_beat: msg.rollback_beat,
  };
}

function dispatchWorldStreamEvent(msg: WorldStreamEvent, callbacks: WorldStreamCallbacks) {
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
    case 'world_event':
      callbacks.onWorldEvent?.(msg.content ?? '');
      break;
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
    case 'done':
      callbacks.onDone?.(msg.message_id);
      break;
    case 'interrupted':
      callbacks.onInterrupted?.();
      break;
    case 'error':
      callbacks.onError?.(msg.content ?? 'unknown');
      break;
    default:
      break;
  }
}

const SSE_MAX_CAPACITY_RETRIES = 3;

export async function sendWorldMessageStream(
  worldId: string,
  worldSessionId: string,
  content: string,
  callbacks: WorldStreamCallbacks,
  signal?: AbortSignal,
  attempt = 0,
  imageUrl?: string,
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

  const url = `${getApiBase()}/worlds/${worldId}/play/chat/send`;
  const payload = JSON.stringify({
    world_session_id: worldSessionId,
    content,
    ...(imageUrl ? { image_url: imageUrl } : {}),
  });

  const onData = (raw: string) => {
    try {
      const msg = JSON.parse(raw) as WorldStreamEvent;
      dispatchWorldStreamEvent(msg, callbacks);
    } catch (err) {
      console.error('Failed to parse world SSE event:', err, raw);
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
      return sendWorldMessageStream(worldId, worldSessionId, content, callbacks, signal, attempt + 1, imageUrl);
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
