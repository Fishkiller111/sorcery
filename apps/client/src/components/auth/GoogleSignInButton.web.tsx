import { createElement, useCallback, useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOGLE_CLIENT_ID } from '../../constants/config';

type Props = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            cfg: {
              theme?: string;
              size?: string;
              type?: string;
              shape?: string;
              width?: number;
              text?: string;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

let gsiLoadPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;
  gsiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
  return gsiLoadPromise;
}

function buttonRendered(containerId: string): boolean {
  const el = document.getElementById(containerId);
  return !!el && (el as HTMLElement).childElementCount > 0;
}

export function GoogleSignInButton({ onCredential, disabled, onReadyChange }: Props) {
  const containerId = useId().replace(/:/g, '');

  const setReady = useCallback(
    (ready: boolean) => {
      onReadyChange?.(ready);
    },
    [onReadyChange],
  );

  const render = useCallback(() => {
    if (!window.google?.accounts?.id) return false;
    const el = document.getElementById(containerId);
    if (!el) return false;
    el.innerHTML = '';
    window.google.accounts.id.renderButton(el, {
      type: 'icon',
      shape: 'circle',
      theme: 'outline',
      size: 'large',
    });
    return buttonRendered(containerId);
  }, [containerId]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn(
        '[GoogleSignIn] EXPO_PUBLIC_GOOGLE_CLIENT_ID is not set; Google button will not render.',
      );
      setReady(false);
      return;
    }
    if (disabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);

    void loadGsiScript()
      .then(() => {
        if (cancelled) return;
        if (!window.google?.accounts?.id) {
          console.error('[GoogleSignIn] GSI script loaded but google.accounts.id is unavailable.');
          setReady(false);
          return;
        }
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => onCredential(resp.credential),
        });

        let attempts = 0;
        const tick = () => {
          if (cancelled) return;
          attempts += 1;
          const ok = render();
          if (ok) {
            setReady(true);
            return;
          }
          if (attempts < 20) {
            window.setTimeout(tick, 100);
            return;
          }
          console.error(
            '[GoogleSignIn] renderButton did not produce a button after retries.',
            { containerId, attempts },
          );
          setReady(false);
        };
        tick();

        const onResize = () => {
          if (render()) setReady(true);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      })
      .catch((err: unknown) => {
        console.error('[GoogleSignIn] Failed to load or initialize Google Sign-In:', err);
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
      setReady(false);
    };
  }, [containerId, disabled, onCredential, render, setReady]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <View style={styles.wrap} pointerEvents={disabled ? 'none' : 'auto'}>
      {createElement('div', {
        id: containerId,
        style: {
          width: 56,
          height: 56,
          margin: '0 auto',
          opacity: disabled ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: '50%',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
