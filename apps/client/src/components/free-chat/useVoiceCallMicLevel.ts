import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type Options = {
  enabled: boolean;
  muted?: boolean;
  /** When set (LiveKit), analyse this track. Never opens a second mic capture. */
  mediaStreamTrack?: MediaStreamTrack | null;
  /** Soft pulse when no analysable track (e.g. ElevenAgents path). */
  fallbackActive?: boolean;
};

/**
 * Web mic level (0..1) via AnalyserNode on an existing track.
 * Falls back to a soft pulse when no track is provided.
 */
export function useVoiceCallMicLevel({
  enabled,
  muted = false,
  mediaStreamTrack = null,
  fallbackActive = false,
}: Options): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || muted) {
      setLevel(0);
      return;
    }

    let cancelled = false;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    const tick = () => {
      if (cancelled || !analyser) return;
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const next = Math.min(1, Math.pow(rms * 3.2, 0.85));
      setLevel((prev) => prev * 0.55 + next * 0.45);
      rafRef.current = requestAnimationFrame(tick);
    };

    const startFallback = () => {
      const t0 = performance.now();
      const loop = (now: number) => {
        if (cancelled) return;
        if (!fallbackActive) {
          setLevel((p) => p * 0.85);
        } else {
          const t = (now - t0) / 1000;
          const wave = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 3.1));
          setLevel(wave);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    };

    (async () => {
      try {
        const track =
          mediaStreamTrack && mediaStreamTrack.readyState === 'live' ? mediaStreamTrack : null;
        if (!track) {
          startFallback();
          return;
        }
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) {
          startFallback();
          return;
        }
        const ctx = new AudioCtx();
        ctxRef.current = ctx;
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => undefined);
        }
        source = ctx.createMediaStreamSource(new MediaStream([track]));
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) startFallback();
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source?.disconnect();
      } catch {
        /* ignore */
      }
      try {
        void ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
    };
  }, [enabled, muted, mediaStreamTrack, fallbackActive]);

  return level;
}
