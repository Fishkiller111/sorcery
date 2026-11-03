import type { UserInfo } from '../types/api';

const TELEGRAM_PLACEHOLDER_SUFFIX = '@telegram.users.soulthread.talk';

export function isAccountEmailBound(user?: UserInfo | null): boolean {
  if (!user?.email) return false;
  if (user.email_bound === true) return true;
  if (user.email_bound === false) return false;
  return !user.email.toLowerCase().endsWith(TELEGRAM_PLACEHOLDER_SUFFIX);
}

export function accountEmailDisplay(user: UserInfo | null | undefined, unboundLabel: string): string {
  if (isAccountEmailBound(user) && user?.email) {
    return user.email;
  }
  return unboundLabel;
}
