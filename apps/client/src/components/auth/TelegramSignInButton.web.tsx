import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { TELEGRAM_BOT_ID } from '../../constants/config';
import type { TelegramWidgetAuthReq } from '../../types/api';
import type { TelegramLoginUser } from '../../types/telegram';

type Props = {
  onCredential: (payload: TelegramWidgetAuthReq) => void;
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
  onError?: (error: unknown) => void;
};

let widgetLoadPromise: Promise<void> | null = null;

function loadTelegramWidgetScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Telegram?.Login?.auth) return Promise.resolve();
  if (widgetLoadPromise) return widgetLoadPromise;
  widgetLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-soulthread-telegram-login]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      window.setTimeout(() => resolve(), 1500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.dataset.soulthreadTelegramLogin = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load telegram-widget.js'));
    document.head.appendChild(script);
  });
  return widgetLoadPromise;
}

function toAuthReq(user: TelegramLoginUser): TelegramWidgetAuthReq {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    photo_url: user.photo_url,
    auth_date: user.auth_date,
    hash: user.hash,
  };
}

/** Web-only circular Telegram login (Login Widget via Telegram.Login.auth). */
export function TelegramSignInButton({
  onCredential,
  disabled,
  onReadyChange,
  onError,
}: Props) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const botId = Number(TELEGRAM_BOT_ID);

  useEffect(() => {
    let cancelled = false;
    if (!botId) {
      onReadyChange?.(false);
      return;
    }
    void loadTelegramWidgetScript()
      .then(() => {
        if (cancelled) return;
        const ok = Boolean(window.Telegram?.Login?.auth);
        setReady(ok);
        onReadyChange?.(ok);
      })
      .catch((err) => {
        if (cancelled) return;
        setReady(false);
        onReadyChange?.(false);
        onError?.(err);
      });
    return () => {
      cancelled = true;
    };
  }, [botId, onError, onReadyChange]);

  if (!botId || !ready) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in with Telegram"
      disabled={disabled || busy}
      onPress={() => {
        if (disabled || busy) return;
        const login = window.Telegram?.Login;
        if (!login?.auth) {
          onError?.(new Error('Telegram Login unavailable'));
          return;
        }
        setBusy(true);
        try {
          login.auth({ bot_id: botId, request_access: true }, (user: TelegramLoginUser | false) => {
            setBusy(false);
            if (!user) return;
            onCredential(toAuthReq(user));
          });
        } catch (err) {
          setBusy(false);
          onError?.(err);
        }
      }}
      style={({ pressed }) => [
        styles.hit,
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#E8EAED" />
      ) : (
        <FontAwesome name="telegram" size={28} color="#2AABEE" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
