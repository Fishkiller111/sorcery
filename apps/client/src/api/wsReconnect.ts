/** WebSocket 容量限流错误与退避重连 */

export const WS_CAPACITY_ERRORS = [
  'ws_capacity_soft',
  'ws_capacity_hard',
  'ws_user_limit',
  'ws_preempted',
] as const;

export type WsCapacityError = (typeof WS_CAPACITY_ERRORS)[number];

export function isWsCapacityError(content?: string): content is WsCapacityError {
  if (!content) return false;
  return WS_CAPACITY_ERRORS.includes(content as WsCapacityError);
}

/** 指数退避，上限 120s；首档优先使用服务端 retry_after */
export function wsReconnectDelayMs(attempt: number, retryAfterSec?: number): number {
  const baseSec = Math.max(retryAfterSec ?? 30, 5);
  const cappedAttempt = Math.min(Math.max(attempt, 0), 4);
  const delaySec = Math.min(baseSec * 2 ** cappedAttempt, 120);
  return delaySec * 1000;
}
