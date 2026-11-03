import type { ChatQuotaResp } from '../types/api';

export type ChatQuotaGate = 'ok' | 'exhausted' | 'upgrade';

/** Whether the user must subscribe before Free Chat quota is available (CHAT_007). */
export function needsVipUpgrade(quota: ChatQuotaResp | null): boolean {
  if (!quota || quota.unlimited) return false;
  if (!quota.periods.length) return true;
  return quota.periods.every((p) => p.granted === 0);
}

/** Whether the current period chat quota is used up (CHAT_008). */
export function isChatQuotaExhausted(quota: ChatQuotaResp | null): boolean {
  if (!quota || quota.unlimited) return false;
  return quota.remaining_messages_hint <= 0;
}

export function resolveChatQuotaGate(quota: ChatQuotaResp | null): ChatQuotaGate {
  if (!quota || quota.unlimited) return 'ok';
  if (needsVipUpgrade(quota)) return 'upgrade';
  if (isChatQuotaExhausted(quota)) return 'exhausted';
  return 'ok';
}
