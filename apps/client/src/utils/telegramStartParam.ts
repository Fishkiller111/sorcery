/**
 * Telegram Main Mini App startapp / start_param.
 * Channel CTA uses https://t.me/<bot>?startapp=agent_<roleId>[__aff_<code>]
 */

export type TelegramStartParam = {
  raw: string;
  roleId?: string;
  affCode?: string;
};

export function parseTelegramStartParam(raw: string | undefined | null): TelegramStartParam {
  const value = (raw ?? '').trim();
  if (!value) return { raw: '' };

  const parts = value.split('__');
  const head = parts[0] ?? '';
  let affCode: string | undefined;
  for (const seg of parts.slice(1)) {
    const aff = seg.match(/^(?:aff|ref)[_-](.+)$/i);
    if (aff?.[1]) affCode = aff[1];
  }

  const agent = head.match(/^agent[_-](.+)$/i);
  if (agent?.[1]) {
    return { raw: value, roleId: agent[1], affCode };
  }
  return { raw: value, affCode };
}

export function readTelegramStartParamFromWindow(): string {
  if (typeof window === 'undefined') return '';
  const fromUnsafe = window.Telegram?.WebApp?.initDataUnsafe?.start_param?.trim();
  if (fromUnsafe) return fromUnsafe;
  try {
    const q = new URLSearchParams(window.location.search);
    return (q.get('tgWebAppStartParam') || q.get('startapp') || '').trim();
  } catch {
    return '';
  }
}
