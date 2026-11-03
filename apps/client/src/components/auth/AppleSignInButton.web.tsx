import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_SITE_URL, APPLE_CLIENT_ID } from '../../constants/config';
import type { AppleAuthReq } from '../../types/api';

type Props = {
  onCredential: (req: AppleAuthReq) => void | Promise<void>;
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
  onError?: (error: unknown) => void;
};

type AppleIDSignInResponse = {
  authorization?: {
    id_token?: string;
    code?: string;
  };
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
};

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (cfg: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state?: string;
          nonce?: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<AppleIDSignInResponse>;
      };
    };
  }
}

let appleSdkPromise: Promise<void> | null = null;

function loadAppleSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.AppleID?.auth) return Promise.resolve();
  if (appleSdkPromise) return appleSdkPromise;
  appleSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-apple-signin="1"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Apple SDK load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.dataset.appleSignin = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Apple Sign-In SDK'));
    document.head.appendChild(script);
  });
  return appleSdkPromise;
}

function resolveRedirectURI(): string {
  if (APP_SITE_URL) return `${APP_SITE_URL}/login`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/login`;
  }
  return '';
}

export function AppleSignInButton({ onCredential, disabled, onReadyChange, onError }: Props) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const setReadyFlag = useCallback(
    (value: boolean) => {
      setReady(value);
      onReadyChange?.(value);
    },
    [onReadyChange],
  );

  useEffect(() => {
    if (!APPLE_CLIENT_ID) {
      console.warn(
        '[AppleSignIn] EXPO_PUBLIC_APPLE_CLIENT_ID is not set; Apple button will not render.',
      );
      setReadyFlag(false);
      return;
    }

    let cancelled = false;
    setReadyFlag(false);

    void loadAppleSdk()
      .then(() => {
        if (cancelled) return;
        if (!window.AppleID?.auth) {
          console.error('[AppleSignIn] SDK loaded but AppleID.auth is unavailable.');
          setReadyFlag(false);
          return;
        }
        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI: resolveRedirectURI(),
          usePopup: true,
        });
        setReadyFlag(true);
      })
      .catch((err: unknown) => {
        console.error('[AppleSignIn] Failed to load Apple Sign-In SDK:', err);
        if (!cancelled) setReadyFlag(false);
      });

    return () => {
      cancelled = true;
      setReadyFlag(false);
    };
  }, [setReadyFlag]);

  if (!APPLE_CLIENT_ID || !ready) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple"
      disabled={disabled || busy}
      onPress={async () => {
        if (disabled || busy || !window.AppleID?.auth) return;
        setBusy(true);
        try {
          const resp = await window.AppleID.auth.signIn();
          const idToken = resp.authorization?.id_token;
          if (!idToken) {
            onErrorRef.current?.(new Error('Apple Sign In did not return an identity token'));
            return;
          }
          const req: AppleAuthReq = {
            identity_token: idToken,
            authorization_code: resp.authorization?.code,
          };
          if (resp.user?.email || resp.user?.name) {
            req.user = {
              email: resp.user.email,
              name: resp.user.name
                ? {
                    firstName: resp.user.name.firstName,
                    lastName: resp.user.name.lastName,
                  }
                : undefined,
            };
          }
          await onCredentialRef.current(req);
        } catch (e: unknown) {
          const err = e as { error?: string; message?: string };
          if (err?.error === 'popup_closed_by_user' || err?.error === 'user_cancelled_authorize') {
            return;
          }
          onErrorRef.current?.(e);
        } finally {
          setBusy(false);
        }
      }}
      style={({ pressed }) => [
        styles.hit,
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.inner}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="logo-apple" size={28} color="#fff" />
        )}
      </View>
      {/* Hidden host kept for Apple SDK popup association if needed */}
      {createElement('div', {
        id: 'appleid-signin',
        style: { display: 'none' },
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
  },
});
