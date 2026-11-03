import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from '../../pages/default/theme/tokens';
import { resolveStaticUrl } from '../../constants/config';
import {
  endVoiceCallBestEffort,
  getVoiceCallStatus,
  isDigitalHumanCall,
  reportVoiceCallEvent,
  startVoiceCall,
  type StartVoiceCallResp,
} from '../../api/voiceCall';
import { ApiError } from '../../api/client';
import { notifyError, notifyWarning } from '../../utils/notify';
import { VoiceCallLiveKitSession } from './voiceCallLiveKitSession';
import { VoiceCallInputWave } from './VoiceCallInputWave';
import { useVoiceCallMicLevel } from './useVoiceCallMicLevel';
import {
  VoiceCallElevenWebViewBridge,
  type ElevenWebBridgeEvent,
  type VoiceCallElevenWebViewBridgeRef,
} from './VoiceCallElevenWebViewBridge';

type ElevenConversation = {
  endSession: () => Promise<void>;
  setMicMuted: (muted: boolean) => void;
  setVolume: (opts: { volume: number }) => void;
};

type CallPhase = 'connecting' | 'in_call' | 'ending';
/** Resolved media path / UI shell. Never null while overlay is open. */
type CallPath = 'eleven' | 'livekit';

type VoiceCallOverlayProps = {
  visible: boolean;
  sessionId: string;
  roleId: string;
  agentName?: string;
  agentAvatar?: string;
  /**
   * Entry intent: locks connecting UI so we don't flash classic ↔ digital-human
   * before /call/start returns. Video entry → livekit; voice entry → eleven.
   */
  preferredPath?: CallPath;
  onClose: () => void;
  onBeforeConnect?: () => void;
};

function formatElapsed(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function VoiceCallOverlay({
  visible,
  sessionId,
  roleId,
  agentName,
  agentAvatar,
  preferredPath = 'eleven',
  onClose,
  onBeforeConnect,
}: VoiceCallOverlayProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width >= height && width >= 720;
  // Mounted only while open → preferredPath seeds the shell (no classic↔DH flash).
  const [phase, setPhase] = useState<CallPhase>('connecting');
  const [callPath, setCallPath] = useState<CallPath>(() => preferredPath);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [subtitle, setSubtitle] = useState('');
  const [agentMode, setAgentMode] = useState<'listening' | 'thinking' | 'speaking' | ''>('');
  const [micTrack, setMicTrack] = useState<MediaStreamTrack | null>(null);
  /** LemonSlice bot_ready — keep sharp still until live video is actually streamable. */
  const [avatarLive, setAvatarLive] = useState(false);
  const callIdRef = useRef<string | null>(null);
  const conversationRef = useRef<ElevenConversation | null>(null);
  const elevenBridgeRef = useRef<VoiceCallElevenWebViewBridgeRef | null>(null);
  const useNativeElevenBridge = Platform.OS !== 'web';
  const livekitRef = useRef<VoiceCallLiveKitSession | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const endingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onBeforeConnectRef = useRef(onBeforeConnect);
  const tRef = useRef(t);
  onCloseRef.current = onClose;
  onBeforeConnectRef.current = onBeforeConnect;
  tRef.current = t;

  const avatarUri = agentAvatar ? resolveStaticUrl(agentAvatar) : undefined;
  const displayName = agentName?.trim() || t('voiceCall.title');
  const inCall = phase === 'in_call';
  const isDigitalHumanUi = callPath === 'livekit';

  const micLevel = useVoiceCallMicLevel({
    enabled: visible && phase !== 'ending',
    muted,
    mediaStreamTrack: callPath === 'livekit' ? micTrack : null,
    fallbackActive:
      callPath !== 'livekit' && inCall && (agentMode === 'listening' || agentMode === 'speaking'),
  });

  const cleanupMedia = useCallback(async () => {
    const conv = conversationRef.current;
    conversationRef.current = null;
    if (conv) {
      try {
        await conv.endSession();
      } catch {
        /* ignore */
      }
    } else if (useNativeElevenBridge && elevenBridgeRef.current) {
      try {
        await elevenBridgeRef.current.endSession();
      } catch {
        /* ignore */
      }
    }
    const lk = livekitRef.current;
    livekitRef.current = null;
    if (lk) {
      try {
        await lk.disconnect();
      } catch {
        /* ignore */
      }
    }
    setMicTrack(null);
  }, []);

  const hangup = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setPhase('ending');
    const callId = callIdRef.current;
    callIdRef.current = null;
    // Settle with API before tearing down WebRTC — reverse order often aborts fetch.
    if (callId) {
      await endVoiceCallBestEffort(callId);
    }
    await cleanupMedia();
    onCloseRef.current();
  }, [cleanupMedia]);

  const hangupRef = useRef(hangup);
  hangupRef.current = hangup;

  const startElevenPath = useCallback(
    async (start: StartVoiceCallResp, cancelled: () => boolean) => {
      if (!start.signed_url) {
        throw new Error('missing signed_url');
      }
      setCallPath('eleven');
      const overrides = start.conversation_override;

      if (useNativeElevenBridge) {
        const bridge = elevenBridgeRef.current;
        if (!bridge) {
          throw new Error('eleven_bridge_unavailable');
        }
        conversationRef.current = {
          endSession: () => bridge.endSession(),
          setMicMuted: (muted: boolean) => bridge.setMicMuted(muted),
          setVolume: ({ volume }) => bridge.setVolume(volume),
        };
        await bridge.startSession(start);
        if (cancelled()) {
          await bridge.endSession();
          conversationRef.current = null;
          return;
        }
        setPhase('in_call');
        return;
      }

      const { Conversation } = await import('@elevenlabs/client');
      const conversation = await Conversation.startSession({
        signedUrl: start.signed_url,
        customLlmExtraBody: overrides?.custom_llm_extra_body,
        overrides: {
          agent: {
            firstMessage: overrides?.first_message ?? '',
            language: (overrides?.language || undefined) as never,
          },
          tts: {
            voiceId: overrides?.voice_id || start.voice_id || undefined,
          },
        },
        onConnect: () => {
          if (!cancelled()) setPhase('in_call');
        },
        onDisconnect: () => {
          if (!cancelled() && !endingRef.current) {
            void hangupRef.current();
          }
        },
        onError: (message) => {
          notifyError(typeof message === 'string' ? message : tRef.current('voiceCall.invalid'));
        },
        onModeChange: (mode) => {
          const m = typeof mode === 'string' ? mode : (mode as { mode?: string })?.mode;
          if (m === 'listening' || m === 'thinking' || m === 'speaking') {
            setAgentMode(m);
          }
        },
        onMessage: (message) => {
          const msg = message as { message?: string; source?: string; role?: string };
          const text = typeof msg?.message === 'string' ? msg.message : '';
          if (text) setSubtitle(text);
        },
      });
      if (cancelled()) {
        await conversation.endSession();
        return;
      }
      conversationRef.current = conversation;
      conversation.setVolume({ volume: 1 });
      setPhase('in_call');
    },
    [useNativeElevenBridge],
  );

  const onElevenBridgeEvent = useCallback((event: ElevenWebBridgeEvent) => {
    if (endingRef.current) return;
    if (event.type === 'connect' || event.type === 'started') {
      setPhase('in_call');
      return;
    }
    if (event.type === 'disconnect') {
      void hangupRef.current();
      return;
    }
    if (event.type === 'error') {
      notifyError(event.message || tRef.current('voiceCall.invalid'));
      void hangupRef.current();
      return;
    }
    if (event.type === 'mode') {
      const m = event.mode;
      if (m === 'listening' || m === 'thinking' || m === 'speaking') {
        setAgentMode(m);
      }
      return;
    }
    if (event.type === 'message' && event.text) {
      setSubtitle(event.text);
    }
  }, []);

  const startLiveKitPath = useCallback(async (start: StartVoiceCallResp, cancelled: () => boolean) => {
    const lkInfo = start.livekit;
    if (!lkInfo?.server_url || !lkInfo.token) {
      throw new Error('missing livekit credentials');
    }
    setCallPath('livekit');
    setAvatarLive(false);
    // Wait one frame so the portrait <video> is mounted under the DH shell.
    await new Promise<void>((r) => setTimeout(r, 0));
    if (cancelled()) return;

    const session = new VoiceCallLiveKitSession();
    livekitRef.current = session;
    let mediaUp = false;
    let botReady = false;
    const readyTimer = setTimeout(() => {
      if (!botReady && !cancelled() && !endingRef.current) {
        notifyError(tRef.current('voiceCall.avatarTimeout'));
        void hangupRef.current();
      }
    }, 60_000);
    const reportReady = (event: 'first_frame' | 'bot_ready') => {
      const latencyMs = Math.max(0, Date.now() - startedAtRef.current);
      void reportVoiceCallEvent({
        call_id: start.call_id,
        event,
        latency_ms: latencyMs,
      }).catch(() => {
        /* best-effort metrics */
      });
    };
    await session.connect({
      serverUrl: lkInfo.server_url,
      token: lkInfo.token,
      videoEl: videoRef.current,
      audioEl: audioRef.current,
      // Cap subscribed layer to on-screen stage (avoids HIGH 9:16 freezes on long RTT).
      videoSize: {
        width: Math.min(720, Math.max(320, typeof window !== 'undefined' ? window.innerWidth * 0.45 : 480)),
        height: Math.min(960, Math.max(420, typeof window !== 'undefined' ? window.innerHeight * 0.85 : 640)),
      },
      handlers: {
        // Track attached — may still be a soft/low layer. Keep still cover;
        // unlock mic/timer so user can speak while avatar warms up.
        onReady: () => {
          if (mediaUp) return;
          mediaUp = true;
          reportReady('first_frame');
          setMicTrack(session.getLocalMicTrack());
          if (!cancelled() && !endingRef.current) {
            setPhase('in_call');
            setAgentMode('listening');
          }
          // If bot_ready is delayed/missed, don't leave the still forever.
          setTimeout(() => {
            if (!botReady && !cancelled() && !endingRef.current) {
              setAvatarLive(true);
            }
          }, 8000);
        },
        onBotReady: () => {
          botReady = true;
          clearTimeout(readyTimer);
          reportReady('bot_ready');
          setMicTrack(session.getLocalMicTrack());
          if (!cancelled() && !endingRef.current) {
            setPhase('in_call');
            setAvatarLive(true);
          }
        },
        onDisconnected: () => {
          clearTimeout(readyTimer);
          if (!cancelled() && !endingRef.current) {
            void hangupRef.current();
          }
        },
        onError: (message) => {
          // DATA_TRACK_LOSSY / transient publisher closes often fire during hangup
          // or brief reconnect — do not toast those as hard failures.
          const msg = (message || '').toLowerCase();
          if (msg.includes('data_track') || msg.includes('data channel') || msg.includes('lossy')) {
            return;
          }
          notifyError(message || tRef.current('voiceCall.invalid'));
        },
        onConnectionIssue: () => {
          if (!cancelled() && !endingRef.current) {
            setAgentMode('listening');
          }
        },
        onAgentState: (state) => {
          if (cancelled() || endingRef.current) return;
          const s = state.toLowerCase();
          if (s === 'speaking') setAgentMode('speaking');
          else if (s === 'thinking') setAgentMode('thinking');
          else if (s === 'listening' || s === 'idle' || s === 'away') setAgentMode('listening');
        },
        onTranscription: (text) => {
          if (cancelled() || endingRef.current) return;
          // Captions only — mode comes from agent_state (final=true used to sticky-lock Speaking).
          setSubtitle(text);
        },
      },
    });
    setMicTrack(session.getLocalMicTrack());
    if (cancelled()) {
      clearTimeout(readyTimer);
      await session.disconnect();
      livekitRef.current = null;
      setMicTrack(null);
    }
  }, []);

  // Only restart when overlay opens / session target changes — not when parent
  // re-renders with new callback identities (that was causing UI shell thrash).
  useEffect(() => {
    if (!visible) return;
    endingRef.current = false;
    setPhase('connecting');
    setCallPath(preferredPath);
    setMuted(false);
    setSpeakerOn(true);
    setElapsed(0);
    setSubtitle('');
    setAgentMode('');
    setMicTrack(null);
    setAvatarLive(false);
    startedAtRef.current = Date.now();
    onBeforeConnectRef.current?.();

    let cancelled = false;
    let statusTimer: ReturnType<typeof setInterval> | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let micPoll: ReturnType<typeof setInterval> | null = null;
    const isCancelled = () => cancelled;

    (async () => {
      try {
        if (Platform.OS !== 'web' && preferredPath === 'livekit') {
          notifyWarning(tRef.current('voiceCall.webOnly'));
          onCloseRef.current();
          return;
        }
        if (Platform.OS === 'web') {
          if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach((tr) => tr.stop());
            } catch {
              notifyWarning(tRef.current('voiceCall.micDenied'));
              onCloseRef.current();
              return;
            }
          }
        }

        const start: StartVoiceCallResp = await startVoiceCall({
          session_id: sessionId,
          role_id: roleId,
          // Ordinary voice entry must stay eleven; only video entry asks for digital_human.
          mode: preferredPath === 'livekit' ? 'digital_human' : 'eleven_agents',
        });
        if (cancelled) {
          await endVoiceCallBestEffort(start.call_id);
          return;
        }
        callIdRef.current = start.call_id;
        startedAtRef.current = Date.now();

        const wantLiveKit = isDigitalHumanCall(start);
        // Server is source of truth; preferredPath only selects the requested mode.
        setCallPath(wantLiveKit ? 'livekit' : 'eleven');

        if (wantLiveKit) {
          await startLiveKitPath(start, isCancelled);
        } else {
          await startElevenPath(start, isCancelled);
        }
        if (cancelled) return;

        tickTimer = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 500);

        micPoll = setInterval(() => {
          const track = livekitRef.current?.getLocalMicTrack() ?? null;
          if (track) setMicTrack(track);
        }, 1500);

        statusTimer = setInterval(() => {
          const id = callIdRef.current;
          if (!id) return;
          void getVoiceCallStatus({ callId: id })
            .then((st) => {
              if (st.force_end || !st.active) {
                void hangupRef.current();
              }
            })
            .catch(() => undefined);
        }, 5000);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          notifyError(e.message || tRef.current('voiceCall.invalid'));
        } else {
          notifyError(tRef.current('voiceCall.invalid'));
        }
        onCloseRef.current();
      }
    })();

    return () => {
      cancelled = true;
      if (statusTimer) clearInterval(statusTimer);
      if (tickTimer) clearInterval(tickTimer);
      if (micPoll) clearInterval(micPoll);
      void cleanupMedia();
    };
  }, [visible, sessionId, roleId, preferredPath, cleanupMedia, startElevenPath, startLiveKitPath]);

  // If agent_state never arrives (or turn wedge), don't leave Speaking forever.
  useEffect(() => {
    if (!visible || callPath !== 'livekit' || agentMode !== 'speaking') return;
    const timer = setTimeout(() => {
      setAgentMode((m) => (m === 'speaking' ? 'listening' : m));
    }, 28_000);
    return () => clearTimeout(timer);
  }, [visible, callPath, agentMode, subtitle]);

  // Keep subscribed simulcast layer matched to on-screen pixels.
  useEffect(() => {
    if (!visible || callPath !== 'livekit') return;
    const useWebHalfBody = Platform.OS === 'web' && landscape;
    if (useWebHalfBody) {
      // Stage fills entire right pane (no letterbox).
      const leftW = Math.min(420, Math.max(280, Math.round(width * 0.34)));
      const rightW = Math.max(320, width - leftW);
      const rightH = Math.max(
        240,
        height - insets.top - Math.max(insets.bottom, 0),
      );
      livekitRef.current?.setVideoSinkSize(rightW, rightH);
      return;
    }
    const ratio = 9 / 16;
    const maxH = landscape
      ? Math.max(240, height - insets.top - Math.max(insets.bottom, 12) - 24)
      : Math.max(280, Math.round(height * 0.62));
    const maxW = landscape
      ? Math.max(280, Math.round(width * 0.52))
      : Math.max(200, width - 24);
    let h = maxH;
    let w = Math.round(h * ratio);
    if (w > maxW) {
      w = maxW;
      h = Math.round(w / ratio);
    }
    livekitRef.current?.setVideoSinkSize(w, h);
  }, [visible, callPath, landscape, width, height, insets.top, insets.bottom]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try {
      if (callPath === 'livekit') {
        livekitRef.current?.setMicMuted(next);
      } else {
        conversationRef.current?.setMicMuted(next);
      }
    } catch {
      /* ignore */
    }
  };

  const toggleSpeaker = () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      if (callPath === 'livekit') {
        livekitRef.current?.setSpeakerOn(next);
      } else {
        conversationRef.current?.setVolume({ volume: next ? 1 : 0 });
      }
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  const statusLabel =
    phase === 'connecting'
      ? isDigitalHumanUi
        ? t('voiceCall.ringing')
        : t('voiceCall.connecting')
      : phase === 'ending'
        ? t('voiceCall.ending')
        : agentMode === 'thinking'
          ? t('voiceCall.thinking')
          : agentMode === 'speaking'
            ? t('voiceCall.speaking')
            : agentMode === 'listening'
              ? t('voiceCall.listening')
              : t('voiceCall.inCall');

  const controlsLocked = phase === 'connecting' || phase === 'ending';
  const waveSize = landscape ? Math.min(220, Math.round(height * 0.32)) : Math.min(168, Math.round(width * 0.36));

  // LemonSlice publishes 9:16 standee.
  // - Mobile / portrait: fixed 9:16 plate.
  // - Web landscape: fill entire right pane; cover+top ≈ 4:3 upper-body crop of 9:16.
  const useWebHalfBody = Platform.OS === 'web' && landscape;
  const stageRatio = 9 / 16;
  const stageMaxH = landscape
    ? Math.max(240, height - insets.top - Math.max(insets.bottom, 12) - 24)
    : Math.max(280, Math.round(height * 0.62));
  const stageMaxW = landscape
    ? Math.max(280, Math.round(width * 0.52))
    : Math.max(200, width - 24);
  let stageW: number;
  let stageH: number;
  if (useWebHalfBody) {
    // Sizing ignored for fill layout — stage stretches with rightPane.
    const leftW = Math.min(420, Math.max(280, Math.round(width * 0.34)));
    stageW = Math.max(320, width - leftW);
    stageH = Math.max(240, height - insets.top - Math.max(insets.bottom, 0));
  } else {
    stageH = stageMaxH;
    stageW = Math.round(stageH * stageRatio);
    if (stageW > stageMaxW) {
      stageW = stageMaxW;
      stageH = Math.round(stageW / stageRatio);
    }
  }

  const mediaHosts =
    Platform.OS === 'web' ? (
      <>
        {React.createElement('video', {
          ref: (el: HTMLVideoElement | null) => {
            videoRef.current = el;
          },
          autoPlay: true,
          playsInline: true,
          muted: false,
          style: isDigitalHumanUi
            ? {
                width: '100%',
                height: '100%',
                // cover+top: 9:16 → 4:3 shows upper body; 9:16→9:16 shows full standee.
                objectFit: 'cover',
                objectPosition: 'center top',
                backgroundColor: 'transparent',
                opacity: avatarLive ? 1 : 0,
                transition: 'opacity 280ms ease-out',
                transform: 'translateZ(0)',
                willChange: 'opacity',
              }
            : {
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              },
        })}
        {React.createElement('audio', {
          ref: (el: HTMLAudioElement | null) => {
            audioRef.current = el;
          },
          autoPlay: true,
          style: { display: 'none' },
        })}
      </>
    ) : null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      {/* 原生视频入口不支持 ElevenLabs，避免无需语音时加载外部 SDK。 */}
      {useNativeElevenBridge && preferredPath === 'eleven' ? (
        <VoiceCallElevenWebViewBridge ref={elevenBridgeRef} onEvent={onElevenBridgeEvent} />
      ) : null}
      {isDigitalHumanUi ? (
        <View style={styles.root}>
          <LinearGradient
            colors={[
              TOKENS.colors.mainGradientStart,
              TOKENS.colors.mainGradientMid,
              TOKENS.colors.mainGradientEnd,
            ]}
            locations={[0, 0.42, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View
            style={[
              styles.shell,
              landscape ? styles.shellRow : styles.shellCol,
              useWebHalfBody
                ? {
                    // Bleed to edges — stage abuts left pane (no outer pad / letterbox).
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingHorizontal: 0,
                  }
                : {
                    paddingTop: insets.top + (landscape ? 12 : 8),
                    paddingBottom: Math.max(insets.bottom, 12),
                  },
            ]}
          >
            <View
              style={[
                styles.leftPane,
                landscape ? styles.leftPaneLandscape : styles.leftPanePortrait,
                useWebHalfBody && {
                  paddingTop: insets.top + 12,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <View style={[styles.metaBlock, landscape ? styles.metaLandscape : null]}>
                <Text style={styles.agentName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.statusLine}>{statusLabel}</Text>
                {inCall ? <Text style={styles.timerLine}>{formatElapsed(elapsed)}</Text> : null}
              </View>

              <View style={styles.captionArea} accessibilityLabel={t('voiceCall.captions')}>
                <ScrollView
                  style={styles.captionScroll}
                  contentContainerStyle={styles.captionScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.captionText, !subtitle && styles.captionPlaceholder]}>
                    {subtitle?.trim() || t('voiceCall.captionPlaceholder')}
                  </Text>
                </ScrollView>
              </View>

              <View style={styles.waveStage}>
                {phase === 'connecting' ? (
                  <ActivityIndicator color="rgba(126,176,255,0.9)" style={{ marginBottom: 12 }} />
                ) : null}
                <View style={styles.controlCluster}>
                  <Pressable
                    onPress={toggleMute}
                    disabled={controlsLocked}
                    style={({ pressed }) => [
                      styles.sideBtn,
                      muted && styles.sideBtnMuted,
                      (pressed || controlsLocked) && styles.btnPressed,
                    ]}
                    accessibilityLabel={muted ? t('voiceCall.unmute') : t('voiceCall.mute')}
                    accessibilityRole="button"
                  >
                    <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color="#F4F7FF" />
                    {!muted && inCall ? (
                      <View style={[styles.micArc, { opacity: 0.35 + micLevel * 0.65 }]} />
                    ) : null}
                  </Pressable>

                  <VoiceCallInputWave
                    level={micLevel}
                    size={waveSize}
                    muted={muted}
                    active={phase !== 'ending'}
                  />

                  <Pressable
                    onPress={() => void hangup()}
                    disabled={phase === 'ending'}
                    style={({ pressed }) => [styles.sideBtn, styles.stopBtn, pressed && styles.btnPressed]}
                    accessibilityLabel={t('voiceCall.hangup')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="stop" size={20} color="#F4F7FF" />
                  </Pressable>
                </View>
              </View>
              <Pressable
                onPress={toggleSpeaker}
                disabled={controlsLocked}
                style={({ pressed }) => [
                  styles.speakerChip,
                  !speakerOn && styles.speakerChipOff,
                  (pressed || controlsLocked) && styles.btnPressed,
                ]}
                accessibilityLabel={speakerOn ? t('voiceCall.speakerOn') : t('voiceCall.speakerOff')}
                accessibilityRole="button"
              >
                <Ionicons
                  name={speakerOn ? 'volume-high' : 'volume-mute'}
                  size={16}
                  color="rgba(244,247,255,0.85)"
                />
                <Text style={styles.speakerChipText}>
                  {speakerOn ? t('voiceCall.speakerOn') : t('voiceCall.speakerOff')}
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.rightPane,
                landscape ? styles.rightPaneLandscape : styles.rightPanePortrait,
                useWebHalfBody && styles.rightPaneFill,
              ]}
            >
              {/* Soft bloom so the plate dissolves into the scene (not a floating card). */}
              {avatarUri ? (
                <ExpoImage
                  source={{ uri: avatarUri }}
                  style={[
                    styles.portraitBloom,
                    useWebHalfBody
                      ? styles.portraitBloomFill
                      : landscape
                        ? styles.portraitBloomLandscape
                        : styles.portraitBloomPortrait,
                  ]}
                  contentFit="cover"
                  contentPosition="top"
                  blurRadius={48}
                />
              ) : null}

              <View
                style={[
                  styles.portraitStage,
                  useWebHalfBody ? styles.portraitStageFill : { width: stageW, height: stageH },
                ]}
              >
                {mediaHosts}
                {!avatarLive && avatarUri ? (
                  <ExpoImage
                    source={{ uri: avatarUri }}
                    style={styles.portraitStill}
                    contentFit="cover"
                    contentPosition="top"
                  />
                ) : null}
                {!avatarLive ? (
                  <View style={styles.portraitWarming}>
                    <ActivityIndicator color="rgba(244,247,255,0.7)" />
                  </View>
                ) : null}

                {/* Edge feather — light only on filled plate to avoid empty gutters. */}
                {!useWebHalfBody ? (
                  <>
                    <LinearGradient
                      colors={['rgba(8,10,15,0.95)', 'rgba(8,10,15,0.35)', 'transparent']}
                      locations={[0, 0.45, 1]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.featherTop}
                      pointerEvents="none"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(8,10,15,0.55)', 'rgba(8,10,15,0.98)']}
                      locations={[0, 0.55, 1]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.featherBottom}
                      pointerEvents="none"
                    />
                    <LinearGradient
                      colors={['rgba(18,23,34,0.92)', 'rgba(18,23,34,0.4)', 'transparent']}
                      locations={[0, 0.5, 1]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.featherLeft}
                      pointerEvents="none"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(8,10,15,0.45)', 'rgba(8,10,15,0.95)']}
                      locations={[0, 0.55, 1]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.featherRight}
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <>
                    <LinearGradient
                      colors={['transparent', 'rgba(8,10,15,0.35)', 'rgba(8,10,15,0.85)']}
                      locations={[0, 0.65, 1]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.featherBottomSoft}
                      pointerEvents="none"
                    />
                  </>
                )}
              </View>

              {useWebHalfBody || landscape ? (
                <LinearGradient
                  colors={[
                    TOKENS.colors.mainGradientMid,
                    'rgba(18, 23, 34, 0.55)',
                    'transparent',
                  ]}
                  locations={[0, 0.4, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={useWebHalfBody ? styles.seamFill : styles.seamLandscape}
                  pointerEvents="none"
                />
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.voiceRoot}>
          <LinearGradient
            colors={['#12152A', '#1A1430', '#3A1A3A', '#4A1840']}
            locations={[0, 0.35, 0.72, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {mediaHosts}
          <View
            style={[
              styles.voiceContent,
              {
                paddingTop: insets.top + 20,
                paddingBottom: Math.max(insets.bottom, 16) + 28,
              },
            ]}
          >
            <View style={styles.voiceTop}>
              <Text style={styles.voiceName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.voiceStatus}>{statusLabel}</Text>
              {inCall ? <Text style={styles.voiceTimer}>{formatElapsed(elapsed)}</Text> : null}
            </View>

            <View style={styles.voiceStage}>
              <View style={styles.voiceAvatarGlow}>
                {avatarUri ? (
                  <ExpoImage source={{ uri: avatarUri }} style={styles.voiceAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.voiceAvatar, styles.voiceAvatarFallback]}>
                    <Text style={styles.voiceAvatarInitial}>{displayName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              {phase === 'connecting' ? (
                <ActivityIndicator color="rgba(245,241,232,0.85)" style={{ marginTop: 28 }} />
              ) : null}
              {subtitle && inCall ? (
                <Text style={styles.voiceSubtitle} numberOfLines={3}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.voiceControls}>
              <Pressable
                onPress={toggleMute}
                disabled={controlsLocked}
                style={({ pressed }) => [
                  styles.voiceRoundBtn,
                  styles.voiceMicBtn,
                  (pressed || controlsLocked) && styles.btnPressed,
                ]}
                accessibilityLabel={muted ? t('voiceCall.unmute') : t('voiceCall.mute')}
                accessibilityRole="button"
              >
                <Ionicons name={muted ? 'mic-off' : 'mic'} size={28} color="#111318" />
              </Pressable>

              <Pressable
                onPress={() => void hangup()}
                disabled={phase === 'ending'}
                style={({ pressed }) => [
                  styles.voiceRoundBtn,
                  styles.voiceHangupBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityLabel={t('voiceCall.hangup')}
                accessibilityRole="button"
              >
                <Ionicons
                  name="call"
                  size={30}
                  color="#FFFFFF"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </Pressable>

              <Pressable
                onPress={toggleSpeaker}
                disabled={controlsLocked}
                style={({ pressed }) => [
                  styles.voiceRoundBtn,
                  styles.voiceSpeakerBtn,
                  (pressed || controlsLocked) && styles.btnPressed,
                ]}
                accessibilityLabel={speakerOn ? t('voiceCall.speakerOn') : t('voiceCall.speakerOff')}
                accessibilityRole="button"
              >
                <Ionicons
                  name={speakerOn ? 'volume-high' : 'volume-mute'}
                  size={28}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

const BTN = 72;
const HANGUP = 78;

const styles = StyleSheet.create({
  // Digital-human layout
  root: {
    flex: 1,
    backgroundColor: TOKENS.colors.bg,
  },
  shell: {
    flex: 1,
    overflow: 'hidden',
  },
  shellRow: {
    flexDirection: 'row',
  },
  shellCol: {
    flexDirection: 'column-reverse',
  },
  leftPane: {
    zIndex: 3,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    gap: 12,
  },
  leftPaneLandscape: {
    width: '34%',
    maxWidth: 420,
    minWidth: 280,
    flexShrink: 0,
  },
  leftPanePortrait: {
    height: '42%',
    width: '100%',
    paddingBottom: 8,
  },
  rightPane: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Match LemonSlice plate black so the portrait doesn't sit on a contrasting card.
    backgroundColor: TOKENS.colors.mainGradientEnd,
    overflow: 'hidden',
  },
  /** Web landscape: portrait stage edge-to-edge against the control pane. */
  rightPaneFill: {
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
  },
  rightPaneLandscape: {},
  rightPanePortrait: {
    minHeight: '58%',
  },
  portraitBloom: {
    position: 'absolute',
    opacity: 0.38,
    zIndex: 0,
  },
  portraitBloomLandscape: {
    top: '-8%',
    bottom: '-8%',
    left: '8%',
    right: '-12%',
  },
  portraitBloomPortrait: {
    top: '-6%',
    bottom: '10%',
    left: '-10%',
    right: '-10%',
  },
  portraitBloomFill: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.28,
  },
  /** 9:16 standee (mobile) or filled right pane (web landscape). */
  portraitStage: {
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
  portraitStageFill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  portraitStill: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  portraitWarming: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 10, 15, 0.18)',
  },
  featherTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '14%',
    zIndex: 4,
  },
  featherBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
    zIndex: 4,
  },
  featherBottomSoft: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '18%',
    zIndex: 4,
  },
  featherLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '18%',
    zIndex: 4,
  },
  featherRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '16%',
    zIndex: 4,
  },
  seamLandscape: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 160,
    zIndex: 5,
  },
  /** Thin blend so left controls sit on media with zero gutter. */
  seamFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 48,
    zIndex: 5,
  },
  metaBlock: {
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 4,
  },
  metaLandscape: {
    paddingLeft: 2,
  },
  agentName: Typo(
    {
      fontSize: 20,
      fontWeight: '700',
      color: TOKENS.colors.text,
      letterSpacing: 0.4,
      maxWidth: '100%',
    },
    'display',
  ),
  statusLine: Typo(
    {
      fontSize: 13,
      color: 'rgba(126,176,255,0.85)',
      letterSpacing: 0.5,
    },
    'sans',
  ),
  timerLine: Typo(
    {
      fontSize: 12,
      color: TOKENS.colors.textMuted,
      letterSpacing: 0.4,
      fontVariant: ['tabular-nums'],
    },
    'mono',
  ),
  /** Soft caption band — no card/border; reads as spoken text on the panel. */
  captionArea: {
    flex: 1,
    minHeight: 88,
    maxHeight: '44%',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  captionScroll: {
    flex: 1,
  },
  captionScrollContent: {
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'center',
  },
  captionText: Typo(
    {
      fontSize: 16,
      lineHeight: 26,
      fontWeight: '400',
      color: 'rgba(244,247,255,0.88)',
      letterSpacing: 0.15,
    },
    'sans',
  ),
  captionPlaceholder: {
    color: 'rgba(244,247,255,0.28)',
    fontStyle: 'italic',
  },
  subtitle: Typo(
    {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 18,
      color: TOKENS.colors.textSecondary,
      maxWidth: 360,
    },
    'sans',
  ),
  waveStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  controlCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 28, 48, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(126, 176, 255, 0.35)',
  },
  sideBtnMuted: {
    borderColor: 'rgba(186, 60, 71, 0.55)',
    backgroundColor: 'rgba(60, 20, 28, 0.75)',
  },
  stopBtn: {
    borderColor: 'rgba(244, 247, 255, 0.28)',
    backgroundColor: 'rgba(18, 20, 28, 0.9)',
  },
  micArc: {
    position: 'absolute',
    bottom: 6,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#7EB0FF',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  speakerChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 28, 48, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(126, 176, 255, 0.22)',
    marginBottom: 4,
  },
  speakerChipOff: {
    opacity: 0.7,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  speakerChipText: Typo(
    {
      fontSize: 12,
      color: 'rgba(244,247,255,0.8)',
      fontWeight: '600',
    },
    'sans',
  ),

  // Classic voice call
  voiceRoot: {
    flex: 1,
    backgroundColor: '#12152A',
  },
  voiceContent: {
    flex: 1,
    paddingHorizontal: 28,
    zIndex: 1,
  },
  voiceTop: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  voiceName: Typo(
    {
      fontSize: 17,
      fontWeight: '500',
      color: 'rgba(245,241,232,0.92)',
      letterSpacing: 0.2,
      textAlign: 'center',
      maxWidth: '100%',
    },
    'sans',
  ),
  voiceStatus: Typo(
    {
      marginTop: 8,
      fontSize: 13,
      color: 'rgba(245,241,232,0.55)',
      letterSpacing: 0.4,
    },
    'sans',
  ),
  voiceTimer: Typo(
    {
      marginTop: 4,
      fontSize: 12,
      color: 'rgba(245,241,232,0.35)',
      letterSpacing: 0.4,
      fontVariant: ['tabular-nums'],
    },
    'sans',
  ),
  voiceStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  voiceAvatarGlow: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#C070A0',
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
  },
  voiceAvatar: {
    width: 148,
    height: 148,
    borderRadius: 74,
  },
  voiceAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAvatarInitial: Typo(
    {
      fontSize: 48,
      color: 'rgba(245,241,232,0.8)',
    },
    'display',
  ),
  voiceSubtitle: {
    marginTop: 28,
    maxWidth: 300,
    textAlign: 'center',
    color: 'rgba(245,241,232,0.62)',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    paddingBottom: 8,
  },
  voiceRoundBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceMicBtn: {
    backgroundColor: '#F4F4F6',
  },
  voiceHangupBtn: {
    width: HANGUP,
    height: HANGUP,
    borderRadius: HANGUP / 2,
    backgroundColor: '#E53935',
  },
  voiceSpeakerBtn: {
    backgroundColor: '#1A1B1F',
  },
});
