import { getWsBase } from '../constants/config';
import type { WSMessage } from '../types/api';
import { isWsCapacityError, wsReconnectDelayMs } from './wsReconnect';

export interface ChatWebSocketCallbacks {
  onAuthOk?: () => void;
  onText?: (content: string, messageId?: string) => void;
  onTextDelta?: (content: string, messageId?: string) => void;
  onTextFinalize?: (content: string, messageId?: string) => void;
  onTone?: (tone: string) => void;
  onAction?: (action: string) => void;
  onDone?: (messageId?: string) => void;
  onInterrupted?: () => void;
  onAudio?: (base64: string, format: string, messageId?: string) => void;
  onAudioChunk?: (base64: string, seq: number, format: string, messageId?: string) => void;
  onAudioDone?: (base64: string, format: string, messageId?: string) => void;
  onError?: (content: string) => void;
  onClose?: () => void;
  /** 容量限流时即将退避重连 */
  onReconnecting?: (content: string, delayMs: number) => void;
  /** 鉴权阶段进入等待队列 */
  onAuthWaiting?: (content: string, retryAfterSec: number) => void;
  /** 好感模糊态更新（data 为 JSON 字符串） */
  onBondUpdate?: (data: string) => void;
  /** 性瘾染上提醒（data 为 JSON 字符串） */
  onEroticAddictionUnlocked?: (data: string) => void;
  /** Agent media library photo pushed into chat */
  onMedia?: (payload: {
    messageId?: string;
    imageUrl?: string;
    mediaId?: string;
    content?: string;
  }) => void;
}

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private callbacks: ChatWebSocketCallbacks;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedIntentionally = false;
  private activeSessionId: string | null = null;
  private reconnectAttempt = 0;
  private networkReconnectAttempt = 0;
  private readonly maxNetworkReconnect = 8;

  constructor(token: string, callbacks: ChatWebSocketCallbacks) {
    this.token = token;
    this.callbacks = callbacks;
  }

  connect(sessionId: string) {
    this.cancelReconnect();
    if (this.ws) {
      this.disconnect();
    }

    this.closedIntentionally = false;
    this.activeSessionId = sessionId;
    this.reconnectAttempt = 0;
    this.networkReconnectAttempt = 0;
    this.openSocket(sessionId);
  }

  private openSocket(sessionId: string) {
    const url = `${getWsBase()}/api/v1/chat/listen?session_id=${encodeURIComponent(sessionId)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({
          type: 'auth',
          token: this.token,
          session_id: sessionId,
        }),
      );
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        this.handleMessage(msg);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    this.ws.onerror = () => {
      // RN LogBox treats console.error as a full-screen overlay; the Event payload is empty.
      console.warn(`[ChatWebSocket] connection error session=${sessionId}`);
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.ws = null;
      if (this.closedIntentionally || this.reconnectTimer) {
        return;
      }
      if (this.activeSessionId && this.networkReconnectAttempt < this.maxNetworkReconnect) {
        this.scheduleNetworkReconnect();
        return;
      }
      this.networkReconnectAttempt = 0;
      this.callbacks.onClose?.();
    };
  }

  private handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'auth_ok':
        this.reconnectAttempt = 0;
        this.networkReconnectAttempt = 0;
        this.startPing();
        this.callbacks.onAuthOk?.();
        break;
      case 'auth_waiting':
        this.callbacks.onAuthWaiting?.(msg.content || 'ws_capacity_soft', msg.retry_after ?? 2);
        break;
      case 'auth_failed':
        if (isWsCapacityError(msg.content) && this.activeSessionId) {
          this.scheduleCapacityReconnect(msg.content, msg.retry_after);
          break;
        }
        this.callbacks.onError?.(msg.content || 'Authentication failed');
        this.disconnect();
        break;
      case 'text':
        this.callbacks.onText?.(msg.content || '', msg.message_id);
        break;
      case 'text_delta':
        this.callbacks.onTextDelta?.(msg.content || '', msg.message_id);
        break;
      case 'text_finalize':
        this.callbacks.onTextFinalize?.(msg.content || '', msg.message_id);
        break;
      case 'tone':
        this.callbacks.onTone?.(msg.content || '');
        break;
      case 'action':
        this.callbacks.onAction?.(msg.content || '');
        break;
      case 'done':
        this.callbacks.onDone?.(msg.message_id);
        break;
      case 'interrupted':
        this.callbacks.onInterrupted?.();
        break;
      case 'error':
        if (isWsCapacityError(msg.content)) {
          this.scheduleCapacityReconnect(msg.content || 'ws_preempted', msg.retry_after);
          break;
        }
        this.callbacks.onError?.(msg.content || 'Unknown error');
        break;
      case 'audio':
        this.callbacks.onAudio?.(msg.data || '', msg.format || 'wav', msg.message_id);
        break;
      case 'audio_chunk':
        this.callbacks.onAudioChunk?.(
          msg.data || '',
          msg.seq ?? 0,
          msg.format || 'wav',
          msg.message_id,
        );
        break;
      case 'audio_done':
        this.callbacks.onAudioDone?.(msg.data || '', msg.format || 'wav', msg.message_id);
        break;
      case 'bond_update':
        this.callbacks.onBondUpdate?.(msg.data || '');
        break;
      case 'erotic_addiction_unlocked':
        this.callbacks.onEroticAddictionUnlocked?.(msg.data || '');
        break;
      case 'media': {
        const imageUrl =
          msg.image_url ||
          msg.file_url ||
          msg.cover_url ||
          (() => {
            try {
              const parsed = JSON.parse(msg.content || '') as {
                file_url?: string;
                image_url?: string;
                cover_url?: string;
              };
              return parsed.file_url || parsed.image_url || parsed.cover_url || '';
            } catch {
              return '';
            }
          })();
        this.callbacks.onMedia?.({
          messageId: msg.message_id,
          imageUrl: imageUrl || undefined,
          mediaId: msg.media_id,
          content: msg.content,
        });
        break;
      }
      default:
        break;
    }
  }

  private scheduleNetworkReconnect() {
    if (this.closedIntentionally || !this.activeSessionId) return;

    const delayMs = wsReconnectDelayMs(this.networkReconnectAttempt, 2);
    this.networkReconnectAttempt += 1;
    this.callbacks.onReconnecting?.('network_disconnect', delayMs);

    this.stopPing();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.cancelReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closedIntentionally && this.activeSessionId) {
        this.openSocket(this.activeSessionId);
      }
    }, delayMs);
  }

  private scheduleCapacityReconnect(content: string, retryAfterSec?: number) {
    if (this.closedIntentionally || !this.activeSessionId) return;

    const delayMs = wsReconnectDelayMs(this.reconnectAttempt, retryAfterSec);
    this.reconnectAttempt += 1;
    this.callbacks.onReconnecting?.(content, delayMs);

    this.stopPing();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.cancelReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closedIntentionally && this.activeSessionId) {
        this.openSocket(this.activeSessionId);
      }
    }, delayMs);
  }

  private cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startPing(intervalMs = 30000) {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.ws?.send(JSON.stringify({ type: 'ping' }));
    }, intervalMs);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.closedIntentionally = true;
    this.activeSessionId = null;
    this.reconnectAttempt = 0;
    this.networkReconnectAttempt = 0;
    this.cancelReconnect();
    this.stopPing();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
