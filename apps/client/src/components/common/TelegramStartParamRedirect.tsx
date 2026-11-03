import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { captureAffFromUrl } from '../../utils/affiliateAttribution';
import {
  parseTelegramStartParam,
  readTelegramStartParamFromWindow,
} from '../../utils/telegramStartParam';

const POLL_MS = 250;
const POLL_BUDGET_MS = 8_000;

/**
 * Channel「开启小程序」uses t.me/<bot>?startapp=agent_<roleId>.
 * Telegram still boots the Mini App at BotFather's home URL; this hops to /free-chat/:id.
 */
export function TelegramStartParamRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const apply = (raw: string): boolean => {
      const parsed = parseTelegramStartParam(raw);
      if (!parsed.roleId) return false;
      if (attemptedRef.current) return true;

      if (parsed.affCode) {
        void captureAffFromUrl(
          `${window.location.origin}/?aff=${encodeURIComponent(parsed.affCode)}`,
        );
      }

      const target = `/free-chat/${encodeURIComponent(parsed.roleId)}`;
      const path = pathname ?? '/';
      if (path === target || path.startsWith(`${target}/`)) {
        attemptedRef.current = true;
        return true;
      }

      attemptedRef.current = true;
      router.replace(target as never);
      return true;
    };

    if (apply(readTelegramStartParamFromWindow())) return;

    const started = Date.now();
    const timer = setInterval(() => {
      if (attemptedRef.current || apply(readTelegramStartParamFromWindow())) {
        clearInterval(timer);
        return;
      }
      if (Date.now() - started >= POLL_BUDGET_MS) {
        clearInterval(timer);
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [pathname, router]);

  return null;
}

