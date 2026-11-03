/** 免费用户本会话玩家消息数超过该阈值时弹出软提醒 */
export const FREE_CHAT_SOFT_UPSELL_AFTER = 10;

/**
 * 是否应展示 Free Chat 软订阅提醒。
 * 仅非无限配额用户；本会话玩家消息数 > threshold；且本会话尚未展示过。
 */
export function shouldShowFreeChatSoftUpsell(opts: {
  unlimited: boolean | undefined;
  playerMessageCount: number;
  alreadyShown: boolean;
  threshold?: number;
}): boolean {
  if (opts.alreadyShown) return false;
  if (opts.unlimited) return false;
  const threshold = opts.threshold ?? FREE_CHAT_SOFT_UPSELL_AFTER;
  return opts.playerMessageCount > threshold;
}

export function countPlayerMessages(messages: { role: string }[]): number {
  return messages.reduce((n, m) => (m.role === 'player' ? n + 1 : n), 0);
}
