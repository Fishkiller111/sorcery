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

export type SimulatorTurnEnvelope = {
  user_message_id?: string;
  message_id?: string;
  assistant_message_id?: string;
  generation_status?: string;
  active_agent?: string;
};

export type SimulatorStreamEvent = {
  type: string;
  content?: string;
  message_id?: string;
  user_message_id?: string;
  assistant_message_id?: string;
  generation_status?: string;
  active_agent?: string;
};

export type SimulatorStreamCallbacks = {
  onTurnEnvelope?: (env: SimulatorTurnEnvelope) => void;
  onText?: (content: string, messageId?: string) => void;
  onTextDelta?: (content: string, messageId?: string) => void;
  onTextFinalize?: (content: string, messageId?: string) => void;
  /** JSON payload: narrations */
  onFlag?: (raw: string) => void;
  /** JSON payload: matched_goals / matched_fails / flags */
  onGoalProgress?: (raw: string) => void;
  /** JSON payload: victory_text, matched_goals, flags */
  onVictory?: (raw: string) => void;
  /** JSON payload: failure_text, matched_fails, flags */
  onFailure?: (raw: string) => void;
  onDone?: (messageId?: string) => void;
  onInterrupted?: () => void;
  onError?: (content: string) => void;
};

function turnEnvelopeFromEvent(msg: SimulatorStreamEvent): SimulatorTurnEnvelope {
  return {
    user_message_id: msg.user_message_id ?? msg.message_id,
    message_id: msg.message_id ?? msg.user_message_id,
    assistant_message_id: msg.assistant_message_id,
    generation_status: msg.generation_status,
    active_agent: msg.active_agent,
  };
}

function dispatchSimulatorStreamEvent(msg: SimulatorStreamEvent, callbacks: SimulatorStreamCallbacks) {
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
    case 'flag':
      callbacks.onFlag?.(msg.content ?? '');
      break;
    case 'goal_progress':
      callbacks.onGoalProgress?.(msg.content ?? '');
      break;
    case 'victory':
      callbacks.onVictory?.(msg.content ?? '');
      break;
    case 'failure':
      callbacks.onFailure?.(msg.content ?? '');
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

export async function sendSimulatorMessageStream(
  simulatorId: string,
  sessionId: string,
  content: string,
  callbacks: SimulatorStreamCallbacks,
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

  const url = `${getApiBase()}/simulators/${encodeURIComponent(simulatorId)}/play/chat/send`;
  const payload = JSON.stringify({
    session_id: sessionId,
    content,
    ...(imageUrl ? { image_url: imageUrl } : {}),
  });

  const onData = (raw: string) => {
    try {
      const msg = JSON.parse(raw) as SimulatorStreamEvent;
      dispatchSimulatorStreamEvent(msg, callbacks);
    } catch (err) {
      console.error('Failed to parse simulator SSE event:', err, raw);
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
      return sendSimulatorMessageStream(
        simulatorId,
        sessionId,
        content,
        callbacks,
        signal,
        attempt + 1,
        imageUrl,
      );
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
