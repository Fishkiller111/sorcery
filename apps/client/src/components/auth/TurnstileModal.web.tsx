import { createElement, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { useI18n } from '../../i18n/I18nContext';
import { TURNSTILE_SITE_KEY } from '../../constants/config';
import { notifyWarning } from '../../utils/notify';
import { Typo } from '../../theme/typography';

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileModalProps = {
  visible: boolean;
  onSuccess: (token: string) => void;
  onCancel: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          theme?: 'auto' | 'light' | 'dark';
          size?: 'normal' | 'flexible' | 'compact';
          retry?: 'auto' | 'never';
          'refresh-expired'?: 'auto' | 'manual' | 'never';
          'refresh-timeout'?: 'auto' | 'manual' | 'never';
          callback: (token: string) => void;
          'error-callback'?: (errorCode?: string) => boolean | void;
          'expired-callback'?: () => void;
          'timeout-callback'?: () => void;
          'before-interactive-callback'?: () => void;
          'after-interactive-callback'?: () => void;
          'unsupported-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

let turnstileLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileLoadPromise) return turnstileLoadPromise;
  turnstileLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(script);
  });
  return turnstileLoadPromise;
}

type TurnstileStatus = 'loading' | 'ready' | 'interactive' | 'error';

export function TurnstileModal({ visible, onSuccess, onCancel }: TurnstileModalProps) {
  const { t } = useI18n();
  const containerId = useId().replace(/:/g, '');
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<TurnstileStatus>('loading');
  const [reloadNonce, setReloadNonce] = useState(0);

  const cleanupWidget = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '';
  }, [containerId]);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !TURNSTILE_SITE_KEY) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    cleanupWidget();
    setStatus('loading');
    widgetIdRef.current = window.turnstile.render(el, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'auto',
      size: 'flexible',
      retry: 'auto',
      'refresh-expired': 'auto',
      'refresh-timeout': 'auto',
      callback: (token) => onSuccess(token),
      'error-callback': () => {
        setStatus('error');
        notifyWarning(t('login.turnstileFailed'));
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
        return true;
      },
      'expired-callback': () => {
        setStatus('ready');
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
      },
      'timeout-callback': () => {
        setStatus('error');
        notifyWarning(t('login.turnstileFailed'));
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
      },
      'before-interactive-callback': () => setStatus('interactive'),
      'after-interactive-callback': () => setStatus('ready'),
      'unsupported-callback': () => {
        setStatus('error');
        notifyWarning(t('login.turnstileFailed'));
      },
    });
    setStatus('ready');
  }, [cleanupWidget, containerId, onSuccess, t]);

  useEffect(() => {
    if (!visible || !TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    setStatus('loading');

    void loadTurnstileScript()
      .then(() => {
        if (cancelled) return;
        let attempts = 0;
        const tick = () => {
          if (cancelled) return;
          attempts += 1;
          renderWidget();
          if (widgetIdRef.current || attempts >= 20) return;
          window.setTimeout(tick, 100);
        };
        tick();
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
          notifyWarning(t('login.turnstileFailed'));
        }
      });

    return () => {
      cancelled = true;
      cleanupWidget();
    };
  }, [visible, cleanupWidget, reloadNonce, renderWidget, t]);

  const handleRetry = useCallback(() => {
    setReloadNonce((value) => value + 1);
  }, []);

  const helperText = useMemo(() => {
    if (status === 'loading') return t('login.turnstileLoading');
    if (status === 'interactive') return t('login.turnstileInteractive');
    return t('login.turnstileReady');
  }, [status, t]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="globe"
      title={t('login.turnstileTitle')}
      bodyMinHeight={120}
      confirmLabel={t('login.turnstileRetry')}
      cancelLabel={t('confirmModal.cancel')}
      onCancel={onCancel}
      onConfirm={handleRetry}
      dismissOnBackdrop={false}
      footerExtra={
        <Text style={[styles.helperText, status === 'error' ? styles.helperTextError : null]}>
          {status === 'error' ? t('login.turnstileFailed') : helperText}
        </Text>
      }
      bodyContent={
        <View style={styles.widgetWrap}>
          {createElement('div', {
            id: containerId,
            style: {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 92,
              width: '100%',
            },
          })}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  widgetWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
  },
  helperText: Typo(
    {
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      color: '#8C8C95',
    },
    'sans',
  ),
  helperTextError: {
    color: '#BA3C47',
  },
});
