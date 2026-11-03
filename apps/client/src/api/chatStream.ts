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
import type { TriggerEventReq, SendMessageReq, RegenerateMessageReq } from '../types/api';

export interface ChatStreamEvent {
  type: string;
  content?: string;
  message_id?: string;
  user_message_id?: string;
  format?: string;
  data?: string;
  seq?: number;
  total_chunks?: number;
}

export interface ChatStreamCallbacks {
  onUserMessage?: (messageId: string) => void;
  onText?: (content: string, messageId?: string) => void;
  onTextDelta?: (content: string, messageId?: string) => void;
  onTextFinalize?: (content: string, messageId?: string) => void;
  onTone?: (tone: string) => void;
  onAction?: (action: string) => void;
  onDone?: (messageId?: string) => void;
  onInterrupted?: () => void;
  onAudioChunk?: (base64: string, seq: number, format: string, messageId?: string) => void;
  onAudioDone?: (base64: string, format: string, messageId?: string) => void;
  onError?: (content: string) => void;
}

function dispatchStreamEvent(msg: ChatStreamEvent, callbacks: ChatStreamCallbacks) {
  switch (msg.type) {
    case 'user_message':
      if (msg.user_message_id || msg.message_id) {
        callbacks.onUserMessage?.(msg.user_message_id ?? msg.message_id!);
      }
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
    case 'action':
      callbacks.onAction?.(msg.content ?? '');
      break;
    case 'done':
      callbacks.onDone?.(msg.message_id);
      break;
    case 'interrupted':
      callbacks.onInterrupted?.();
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
    case 'error':
      callbacks.onError?.(msg.content ?? 'unknown');
      break;
    default:
      break;
  }
}

const SSE_MAX_CAPACITY_RETRIES = 3;

async function consumeChatSSE(
  path: string,
  body: object,
  callbacks: ChatStreamCallbacks,
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

  const url = `${getApiBase()}${path}`;
  const payload = JSON.stringify(body);

  const onData = (raw: string) => {
    try {
      const msg = JSON.parse(raw) as ChatStreamEvent;
      dispatchStreamEvent(msg, callbacks);
    } catch (err) {
      console.error('Failed to parse SSE event:', err, raw);
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
      return consumeChatSSE(path, body, callbacks, signal, attempt + 1);
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

export async function sendMessageStream(
  req: SendMessageReq,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  return consumeChatSSE('/chat/send', req, callbacks, signal);
}

export async function regenerateMessageStream(
  req: RegenerateMessageReq,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  return consumeChatSSE('/chat/regenerate', req, callbacks, signal);
}

export async function triggerEventStream(
  req: TriggerEventReq,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  return consumeChatSSE('/chat/event', req, callbacks, signal);
}
