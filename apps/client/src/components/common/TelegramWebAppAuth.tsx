import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

const TG_SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js';
const POLL_MS = 250;
const POLL_BUDGET_MS = 10_000;

function loadTelegramScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.Telegram?.WebApp) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-soulthread-telegram-web-app]',
  );
  if (existing) {
    return new Promise((resolve) => {
      if (window.Telegram?.WebApp) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      window.setTimeout(() => resolve(), 1_500);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TG_SCRIPT_SRC;
    script.async = true;
    script.dataset.soulthreadTelegramWebApp = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load telegram-web-app.js'));
    document.head.appendChild(script);
  });
}

function readInitData(): string {
  return window.Telegram?.WebApp?.initData?.trim() ?? '';
}

/**
 * When running inside Telegram Mini App, exchange initData for a Soulthread JWT
 * so the Web session matches the Telegram-linked account used by soulthread-bot.
 */
export function TelegramWebAppAuth() {
  const isRestored = useAuthStore((s) => s.isRestored);
  const loginWithTelegram = useAuthStore((s) => s.loginWithTelegram);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isRestored) return;
    if (typeof window === 'undefined') return;
    if (attemptedRef.current) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const runLogin = (initData: string) => {
      if (attemptedRef.current || cancelled) return;
      attemptedRef.current = true;
      try {
        window.Telegram?.WebApp?.ready?.();
        window.Telegram?.WebApp?.expand?.();
      } catch {
        /* ignore */
      }

      void loginWithTelegram(initData).catch((err) => {
        attemptedRef.current = false;
        console.warn('[TelegramWebAppAuth] login failed', err);
      });
    };

    const tryOnce = (): boolean => {
      const initData = readInitData();
      if (!initData) return false;
      runLogin(initData);
      return true;
    };

    void (async () => {
      try {
        await loadTelegramScript();
      } catch (err) {
        console.warn('[TelegramWebAppAuth] script load failed', err);
      }
      if (cancelled || tryOnce()) return;

      const started = Date.now();
      timer = setInterval(() => {
        if (cancelled || attemptedRef.current) {
          if (timer) clearInterval(timer);
          return;
        }
        if (tryOnce() || Date.now() - started >= POLL_BUDGET_MS) {
          if (timer) clearInterval(timer);
        }
      }, POLL_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [isRestored, loginWithTelegram]);

  return null;
}
