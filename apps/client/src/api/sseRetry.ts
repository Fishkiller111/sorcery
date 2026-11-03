/** SSE 容量限流与退避重试（对齐 WS wsReconnect） */

export const SSE_CAPACITY_CODES = ['SSE_001', 'SSE_002'] as const;

export type SseCapacityCode = (typeof SSE_CAPACITY_CODES)[number];

export function isSseCapacityCode(code?: string): code is SseCapacityCode {
  if (!code) return false;
  return SSE_CAPACITY_CODES.includes(code as SseCapacityCode);
}

/** 指数退避，上限 120s；首档优先使用服务端 Retry-After */
export function sseRetryDelayMs(attempt: number, retryAfterSec?: number): number {
  const baseSec = Math.max(retryAfterSec ?? 30, 5);
  const cappedAttempt = Math.min(Math.max(attempt, 0), 4);
  const delaySec = Math.min(baseSec * 2 ** cappedAttempt, 120);
  return delaySec * 1000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseRetryAfterSec(header: string | null): number | undefined {
  if (!header) return undefined;
  const n = parseInt(header, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
