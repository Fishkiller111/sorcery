import { getWsBase } from '../constants/config';
import type { WSMessage } from '../types/api';
import type {
  StoryBadEndPayload,
  StoryBeatAdvancePayload,
  StoryImagePayload,
  StoryRewardCompletePayload,
  StoryRewardEnterPayload,
  StoryRewardStagePayload,
  StorySceneClearPayload,
} from '../types/story';
import { isWsCapacityError, wsReconnectDelayMs } from './wsReconnect';

export interface StoryWebSocketCallbacks {
  onAuthOk?: () => void;
  onText?: (content: string, messageId?: string) => void;
  onTextDelta?: (content: string, messageId?: string) => void;
  onTextFinalize?: (content: string, messageId?: string) => void;
  onTone?: (tone: string) => void;
  onDone?: () => void;
  onBadEnd?: (payload: StoryBadEndPayload) => void;
  onBeatAdvance?: (payload: StoryBeatAdvancePayload) => void;
  onSceneClear?: (payload: StorySceneClearPayload) => void;
  onStoryImage?: (payload: StoryImagePayload) => void;
  onRewardEnter?: (payload: StoryRewardEnterPayload) => void;
  onRewardStage?: (payload: StoryRewardStagePayload) => void;
  onRewardComplete?: (payload: StoryRewardCompletePayload) => void;
  onError?: (content: string) => void;
  onInterrupted?: () => void;
  onClose?: () => void;
  onReconnecting?: (content: string, delayMs: number) => void;
  onAuthWaiting?: (content: string, retryAfterSec: number) => void;
}

function parseJsonPayload<T>(raw?: string): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export class StoryWebSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private callbacks: StoryWebSocketCallbacks;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedIntentionally = false;
  private activeStorySessionId: string | null = null;
  private reconnectAttempt = 0;
  private networkReconnectAttempt = 0;
  private readonly maxNetworkReconnect = 8;

  constructor(token: string, callbacks: StoryWebSocketCallbacks) {
    this.token = token;
    this.callbacks = callbacks;
  }

  connect(storySessionId: string) {
    this.cancelReconnect();
    if (this.ws) this.disconnect();
    this.closedIntentionally = false;
    this.activeStorySessionId = storySessionId;
    this.reconnectAttempt = 0;
    this.networkReconnectAttempt = 0;
    this.openSocket(storySessionId);
  }

  private openSocket(storySessionId: string) {
    const affinityId = `story:${storySessionId}`;
    this.ws = new WebSocket(
      `${getWsBase()}/api/v1/story/listen?session_id=${encodeURIComponent(affinityId)}`,
    );

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({
          type: 'auth',
          token: this.token,
          story_session_id: storySessionId,
        }),
      );
    };

    this.ws.onmessage = (event) => {
      try {
        this.handleMessage(JSON.parse(event.data) as WSMessage & { data?: string });
      } catch (err) {
        console.error('Story WS parse error:', err);
      }
    };

    this.ws.onerror = () => {
      console.warn(`[StoryWebSocket] connection error session=${storySessionId}`);
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.ws = null;
      if (this.closedIntentionally || this.reconnectTimer) {
        return;
      }
      if (this.activeStorySessionId && this.networkReconnectAttempt < this.maxNetworkReconnect) {
        this.scheduleNetworkReconnect();
        return;
      }
      this.networkReconnectAttempt = 0;
      this.callbacks.onClose?.();
    };
  }

  private scheduleNetworkReconnect() {
    if (this.closedIntentionally || !this.activeStorySessionId) return;

    const delayMs = wsReconnectDelayMs(this.networkReconnectAttempt);
    this.networkReconnectAttempt += 1;
    this.callbacks.onReconnecting?.('ws_network', delayMs);

    this.cancelReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closedIntentionally && this.activeStorySessionId) {
        this.openSocket(this.activeStorySessionId);
      }
    }, delayMs);
  }

  private handleMessage(msg: WSMessage & { data?: string }) {
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
        if (isWsCapacityError(msg.content) && this.activeStorySessionId) {
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
      case 'done':
        this.callbacks.onDone?.();
        break;
      case 'story_bad_end': {
        const payload = parseJsonPayload<StoryBadEndPayload>(msg.content);
        if (payload) this.callbacks.onBadEnd?.(payload);
        break;
      }
      case 'story_beat_advance': {
        const payload = parseJsonPayload<StoryBeatAdvancePayload>(msg.content);
        if (payload) this.callbacks.onBeatAdvance?.(payload);
        break;
      }
      case 'story_scene_clear': {
        const payload = parseJsonPayload<StorySceneClearPayload>(msg.content);
        if (payload) this.callbacks.onSceneClear?.(payload);
        break;
      }
      case 'story_image': {
        const payload = parseJsonPayload<StoryImagePayload>(msg.data || msg.content);
        if (payload?.image_url) this.callbacks.onStoryImage?.(payload);
        break;
      }
      case 'story_reward_enter': {
        const payload = parseJsonPayload<StoryRewardEnterPayload>(msg.content);
        if (payload) this.callbacks.onRewardEnter?.(payload);
        break;
      }
      case 'story_reward_stage': {
        const payload = parseJsonPayload<StoryRewardStagePayload>(msg.content);
        if (payload) this.callbacks.onRewardStage?.(payload);
        break;
      }
      case 'story_reward_complete': {
        const payload = parseJsonPayload<StoryRewardCompletePayload>(msg.content);
        if (payload) this.callbacks.onRewardComplete?.(payload);
        break;
      }
      case 'error':
        if (isWsCapacityError(msg.content)) {
          this.scheduleCapacityReconnect(msg.content || 'ws_preempted', msg.retry_after);
          break;
        }
        this.callbacks.onError?.(msg.content || 'Unknown error');
        break;
      case 'interrupted':
        this.callbacks.onInterrupted?.();
        break;
      default:
        break;
    }
  }

  private scheduleCapacityReconnect(content: string, retryAfterSec?: number) {
    if (this.closedIntentionally || !this.activeStorySessionId) return;

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
      if (!this.closedIntentionally && this.activeStorySessionId) {
        this.openSocket(this.activeStorySessionId);
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
    this.activeStorySessionId = null;
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
