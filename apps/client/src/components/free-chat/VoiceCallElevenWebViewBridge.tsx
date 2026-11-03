import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { StartVoiceCallResp } from '../../api/voiceCall';

/** WebView 内跑 ElevenLabs Conversation（iOS/Android 无 DOM WebRTC 时的 App 内方案） */
const ELEVEN_CALL_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://unpkg.com/@elevenlabs/client@1.15.2/dist/lib.iife.js"></script>
</head>
<body>
<script>
(function () {
  var conversation = null;
  function send(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  window.__elevenStart = async function (cfg) {
    try {
      var overrides = cfg.conversation_override || {};
      conversation = await ElevenLabsClient.Conversation.startSession({
        signedUrl: cfg.signed_url,
        customLlmExtraBody: overrides.custom_llm_extra_body,
        overrides: {
          agent: {
            firstMessage: overrides.first_message || '',
            language: overrides.language || undefined,
          },
          tts: { voiceId: overrides.voice_id || cfg.voice_id || undefined },
        },
        onConnect: function () { send({ type: 'connect' }); },
        onDisconnect: function () { send({ type: 'disconnect' }); },
        onError: function (msg) { send({ type: 'error', message: String(msg) }); },
        onModeChange: function (mode) {
          var m = typeof mode === 'string' ? mode : (mode && mode.mode) || '';
          send({ type: 'mode', mode: m });
        },
        onMessage: function (message) {
          var text = message && message.message;
          if (text) send({ type: 'message', text: text });
        },
      });
      conversation.setVolume({ volume: 1 });
      send({ type: 'started' });
    } catch (e) {
      send({ type: 'error', message: e && e.message ? e.message : String(e) });
    }
  };
  window.__elevenEnd = async function () {
    if (conversation) {
      try { await conversation.endSession(); } catch (err) { /* ignore */ }
      conversation = null;
    }
    send({ type: 'ended' });
  };
  window.__elevenSetMicMuted = function (muted) {
    if (conversation) conversation.setMicMuted(!!muted);
  };
  window.__elevenSetVolume = function (volume) {
    if (conversation) conversation.setVolume({ volume: volume });
  };
  send({ type: 'ready' });
})();
</script>
</body>
</html>`;

export type ElevenWebBridgeEvent =
  | { type: 'ready' }
  | { type: 'connect' }
  | { type: 'started' }
  | { type: 'disconnect' }
  | { type: 'ended' }
  | { type: 'error'; message: string }
  | { type: 'mode'; mode: string }
  | { type: 'message'; text: string };

export type VoiceCallElevenWebViewBridgeRef = {
  startSession: (start: StartVoiceCallResp) => Promise<void>;
  endSession: () => Promise<void>;
  setMicMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
};

type Props = {
  onEvent: (event: ElevenWebBridgeEvent) => void;
};

export const VoiceCallElevenWebViewBridge = forwardRef<VoiceCallElevenWebViewBridgeRef, Props>(
  function VoiceCallElevenWebViewBridge({ onEvent }, ref) {
    const webRef = useRef<WebView>(null);
    const readyRef = useRef(false);
    const pendingStartRef = useRef<StartVoiceCallResp | null>(null);
    const startWaitersRef = useRef<Array<{ resolve: () => void; reject: (e: Error) => void }>>([]);
    const endWaiterRef = useRef<(() => void) | null>(null);

    const flushStartWaiters = useCallback((err?: Error) => {
      const waiters = startWaitersRef.current.splice(0);
      waiters.forEach((w) => {
        if (err) w.reject(err);
        else w.resolve();
      });
    }, []);

    const inject = useCallback((js: string) => {
      webRef.current?.injectJavaScript(`${js}\ntrue;`);
    }, []);

    const runPendingStart = useCallback(() => {
      const pending = pendingStartRef.current;
      if (!pending || !readyRef.current) return;
      pendingStartRef.current = null;
      inject(`window.__elevenStart(${JSON.stringify(pending)})`);
    }, [inject]);

    useImperativeHandle(
      ref,
      () => ({
        startSession(start) {
          return new Promise<void>((resolve, reject) => {
            startWaitersRef.current.push({ resolve, reject });
            if (readyRef.current) {
              inject(`window.__elevenStart(${JSON.stringify(start)})`);
              return;
            }
            pendingStartRef.current = start;
          });
        },
        endSession() {
          return new Promise<void>((resolve) => {
            if (!readyRef.current) {
              resolve();
              return;
            }
            endWaiterRef.current = resolve;
            inject('window.__elevenEnd()');
            setTimeout(() => {
              if (endWaiterRef.current) {
                endWaiterRef.current();
                endWaiterRef.current = null;
              }
            }, 3000);
          });
        },
        setMicMuted(muted: boolean) {
          inject(`window.__elevenSetMicMuted(${muted ? 'true' : 'false'})`);
        },
        setVolume(volume: number) {
          inject(`window.__elevenSetVolume(${Number.isFinite(volume) ? volume : 1})`);
        },
      }),
      [inject],
    );

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data) as ElevenWebBridgeEvent;
          if (data.type === 'ready') {
            readyRef.current = true;
            runPendingStart();
          }
          if (data.type === 'started') {
            flushStartWaiters();
          }
          if (data.type === 'error') {
            flushStartWaiters(new Error(data.message || 'eleven_start_failed'));
          }
          if (data.type === 'ended' && endWaiterRef.current) {
            endWaiterRef.current();
            endWaiterRef.current = null;
          }
          onEvent(data);
        } catch {
          /* ignore malformed */
        }
      },
      [flushStartWaiters, onEvent, runPendingStart],
    );

    return (
      <View pointerEvents="none" style={styles.host}>
        <WebView
          ref={webRef}
          source={{ html: ELEVEN_CALL_HTML, baseUrl: 'https://localhost/' }}
          style={styles.webview}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          originWhitelist={['*']}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  webview: {
    width: 1,
    height: 1,
  },
});
