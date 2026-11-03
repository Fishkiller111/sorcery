import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { useI18n } from '../../i18n/I18nContext';
import { TURNSTILE_SITE_KEY } from '../../constants/config';
import { APP_SITE_URL } from '../../constants/seo';
import { notifyWarning } from '../../utils/notify';
import { Typo } from '../../theme/typography';

type TurnstileModalProps = {
  visible: boolean;
  onSuccess: (token: string) => void;
  onCancel: () => void;
};

type TurnstileStatus = 'loading' | 'ready' | 'interactive' | 'error';

export function TurnstileModal({ visible, onSuccess, onCancel }: TurnstileModalProps) {
  const { t } = useI18n();
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<TurnstileStatus>('loading');

  const turnstilePageUrl = useMemo(() => {
    const base = APP_SITE_URL.trim().replace(/\/$/, '');
    if (!base) return '';
    return `${base}/turnstile/?embed=1&r=${reloadKey}`;
  }, [reloadKey]);

  useEffect(() => {
    if (visible) setStatus('loading');
  }, [visible, reloadKey]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type:
            | 'success'
            | 'ready'
            | 'interactive'
            | 'error'
            | 'expired'
            | 'timeout'
            | 'unsupported'
            | 'render-error'
            | 'script-error'
            | 'script-timeout';
          token?: string;
          code?: string;
        };
        if (data.type === 'success' && data.token) {
          onSuccess(data.token);
          return;
        }
        if (data.type === 'ready' || data.type === 'expired') {
          setStatus('ready');
          return;
        }
        if (data.type === 'interactive') {
          setStatus('interactive');
          return;
        }
        if (
          data.type === 'error' ||
          data.type === 'timeout' ||
          data.type === 'unsupported' ||
          data.type === 'render-error' ||
          data.type === 'script-error' ||
          data.type === 'script-timeout'
        ) {
          setStatus('error');
          notifyWarning(t('login.turnstileFailed'));
          return;
        }
      } catch {
        setStatus('error');
        notifyWarning(t('login.turnstileFailed'));
      }
    },
    [onSuccess, t],
  );

  const handleRetry = useCallback(() => {
    setStatus('loading');
    setReloadKey((value) => value + 1);
  }, []);

  const handleLoadError = useCallback(() => {
    setStatus('error');
    notifyWarning(t('login.turnstileFailed'));
  }, [t]);

  const helperText = useMemo(() => {
    if (status === 'loading') return t('login.turnstileLoading');
    if (status === 'interactive') return t('login.turnstileInteractive');
    return t('login.turnstileReady');
  }, [status, t]);

  useEffect(() => {
    if (!visible) return;
    if (APP_SITE_URL.trim()) return;
    setStatus('error');
  }, [visible]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="globe"
      title={t('login.turnstileTitle')}
      bodyMinHeight={128}
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
        <View style={styles.webviewWrap}>
          {status === 'loading' ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color="#BA3C47" />
            </View>
          ) : null}
          {turnstilePageUrl ? (
            <WebView
              key={`${visible ? 'open' : 'closed'}-${reloadKey}`}
              source={{ uri: turnstilePageUrl }}
              onMessage={handleMessage}
              onError={handleLoadError}
              onHttpError={handleLoadError}
              originWhitelist={['*']}
              scrollEnabled={false}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              automaticallyAdjustContentInsets={false}
              cacheEnabled={false}
              incognito
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              mixedContentMode="compatibility"
              setSupportMultipleWindows={false}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
          ) : (
            <View style={styles.webviewFallback} />
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  webviewWrap: {
    width: '100%',
    minHeight: 112,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  webview: {
    width: '100%',
    minHeight: 112,
    backgroundColor: 'transparent',
  },
  webviewFallback: {
    width: '100%',
    minHeight: 112,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
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
