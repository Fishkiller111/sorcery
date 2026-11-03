import { Platform } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';

const isWeb = Platform.OS === 'web';
const MIN_CHUNKS_BEFORE_PLAY = 1;

type PlaybackListener = (messageId: string, playing: boolean) => void;

type StreamSession = {
  format: string;
  chunks: Map<number, Uint8Array>;
  chunkCount: number;
  web?: {
    mediaSource: MediaSource;
    audio: HTMLAudioElement;
    sourceBuffer: SourceBuffer | null;
    appendQueue: Uint8Array[];
    appending: boolean;
    started: boolean;
    objectUrl: string;
  };
  native?: {
    queue: string[];
    playing: boolean;
    /** Ready to play but waiting for previous message to finish. */
    pendingStart: boolean;
    player: AudioPlayer | null;
    statusSub: { remove: () => void } | null;
  };
};

function decodeBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function encodeBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function mimeForFormat(format: string): string {
  return format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
}

function releasePlayer(player: AudioPlayer | null) {
  if (!player) return;
  try {
    player.pause();
  } catch {
    /* */
  }
  try {
    player.remove();
  } catch {
    /* */
  }
}

/**
 * Streamed TTS player. Multiple message sessions may buffer in parallel, but
 * autoplay is strictly sequential so overlapping agent lines do not fight.
 */
export class StreamAudioPlayer {
  private sessions = new Map<string, StreamSession>();
  private webLiveAudio: HTMLAudioElement | null = null;
  private webLiveMessageId: string | null = null;
  private playbackListener: PlaybackListener | null = null;
  /** Message IDs waiting to autoplay after the current one ends (FIFO). */
  private startQueue: string[] = [];

  setPlaybackListener(listener: PlaybackListener | null): void {
    this.playbackListener = listener;
  }

  isPlaying(messageId: string): boolean {
    const session = this.sessions.get(messageId);
    if (!session) return false;
    if (session.web?.audio) {
      const audio = session.web.audio;
      return !audio.paused && !audio.ended;
    }
    return session.native?.playing === true;
  }

  isAnyPlaying(): boolean {
    for (const messageId of this.sessions.keys()) {
      if (this.isPlaying(messageId)) return true;
    }
    if (isWeb && this.webLiveAudio) {
      const audio = this.webLiveAudio;
      return !audio.paused && !audio.ended;
    }
    return false;
  }

  /** Merge buffered chunks for fallback playback when MSE stream ends early or is unavailable. */
  getConcatenatedBase64(messageId: string): { data: string; format: 'mp3' | 'wav' } | null {
    const session = this.sessions.get(messageId);
    if (!session || session.chunks.size === 0) return null;

    const seqs = [...session.chunks.keys()].sort((a, b) => a - b);
    let total = 0;
    for (const seq of seqs) {
      total += session.chunks.get(seq)?.length ?? 0;
    }
    if (total === 0) return null;

    const merged = new Uint8Array(total);
    let offset = 0;
    for (const seq of seqs) {
      const chunk = session.chunks.get(seq);
      if (!chunk || chunk.length === 0) continue;
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    if (offset === 0) return null;

    return {
      data: encodeBase64(merged),
      format: session.format === 'wav' ? 'wav' : 'mp3',
    };
  }

  hasStartedPlayback(messageId: string): boolean {
    const session = this.sessions.get(messageId);
    if (!session) return false;
    if (session.web?.started) return true;
    if (session.native?.playing) return true;
    return false;
  }

  stopMessage(messageId: string): void {
    this.startQueue = this.startQueue.filter((id) => id !== messageId);
    const session = this.sessions.get(messageId);
    if (session) {
      this.destroySession(messageId, session);
    }
    if (isWeb && this.webLiveMessageId === messageId && this.webLiveAudio) {
      this.webLiveAudio.pause();
      this.webLiveAudio = null;
      this.webLiveMessageId = null;
    }
    this.notifyPlayback(messageId, false);
    this.pumpStartQueue();
  }

  feedChunk(messageId: string, base64: string, seq: number, format = 'mp3'): void {
    let session = this.sessions.get(messageId);
    if (!session) {
      session = {
        format,
        chunks: new Map(),
        chunkCount: 0,
      };
      this.sessions.set(messageId, session);
    }

    if (isWeb) {
      const bytes = decodeBase64(base64);
      session.chunks.set(seq, bytes);
      session.chunkCount = session.chunks.size;
      this.feedWebChunk(messageId, session, bytes);
    } else {
      session.chunks.set(seq, new Uint8Array(0));
      session.chunkCount = session.chunks.size;
      void this.feedNativeChunk(messageId, session, base64, format);
    }
  }

  finalize(messageId: string): void {
    const session = this.sessions.get(messageId);
    if (!session) return;

    if (isWeb && session.web?.mediaSource.readyState === 'open') {
      const tryEnd = () => {
        if (!this.sessions.has(messageId)) return;
        const web = session.web;
        if (!web || web.mediaSource.readyState !== 'open') return;

        const sb = web.sourceBuffer;
        if (!sb || sb.updating || web.appending) {
          setTimeout(tryEnd, 50);
          return;
        }
        if (web.appendQueue.length > 0) {
          this.flushWebAppend(session);
          setTimeout(tryEnd, 50);
          return;
        }
        try {
          web.mediaSource.endOfStream();
        } catch {
          /* already ended */
        }
      };
      tryEnd();
    }
  }

  stopAll(): void {
    const ids = [...this.sessions.keys()];
    this.startQueue = [];
    this.sessions.forEach((session, id) => this.destroySession(id, session));
    this.sessions.clear();
    if (isWeb && this.webLiveAudio) {
      this.webLiveAudio.pause();
      this.webLiveAudio = null;
      this.webLiveMessageId = null;
    }
    ids.forEach((id) => this.notifyPlayback(id, false));
  }

  private notifyPlayback(messageId: string, playing: boolean): void {
    this.playbackListener?.(messageId, playing);
  }

  private enqueueStart(messageId: string): void {
    if (!this.startQueue.includes(messageId)) {
      this.startQueue.push(messageId);
    }
  }

  /** True when another message currently owns the speaker. */
  private isBlockedByOther(messageId: string): boolean {
    for (const id of this.sessions.keys()) {
      if (id !== messageId && this.isPlaying(id)) return true;
    }
    if (isWeb && this.webLiveMessageId && this.webLiveMessageId !== messageId && this.webLiveAudio) {
      const audio = this.webLiveAudio;
      if (!audio.paused && !audio.ended) return true;
    }
    return false;
  }

  private pumpStartQueue(): void {
    if (this.isAnyPlaying()) return;
    while (this.startQueue.length > 0) {
      const nextId = this.startQueue[0]!;
      const session = this.sessions.get(nextId);
      if (!session) {
        this.startQueue.shift();
        continue;
      }
      if (isWeb) {
        if (!session.web || session.web.started) {
          this.startQueue.shift();
          continue;
        }
        if (session.chunkCount < MIN_CHUNKS_BEFORE_PLAY) {
          // Wait for more chunks; feedChunk will re-try.
          break;
        }
        this.startQueue.shift();
        this.startWebPlayback(nextId, session);
        return;
      }
      if (!session.native || session.native.playing) {
        this.startQueue.shift();
        continue;
      }
      if (session.native.queue.length === 0 && !session.native.pendingStart) {
        this.startQueue.shift();
        continue;
      }
      this.startQueue.shift();
      void this.startNativePlayback(nextId, session);
      return;
    }
  }

  private startWebPlayback(messageId: string, session: StreamSession): void {
    const web = session.web;
    if (!web || web.started) return;
    web.started = true;
    this.webLiveAudio = web.audio;
    this.webLiveMessageId = messageId;
    audioPlay(web.audio, () => this.notifyPlayback(messageId, true));
  }

  private feedWebChunk(messageId: string, session: StreamSession, bytes: Uint8Array) {
    if (!session.web) {
      if (typeof MediaSource === 'undefined' || !MediaSource.isTypeSupported('audio/mpeg')) {
        return;
      }
      const mediaSource = new MediaSource();
      const objectUrl = URL.createObjectURL(mediaSource);
      const audio = new window.Audio(objectUrl);
      audio.autoplay = false;

      session.web = {
        mediaSource,
        audio,
        sourceBuffer: null,
        appendQueue: [],
        appending: false,
        started: false,
        objectUrl,
      };

      mediaSource.addEventListener('sourceopen', () => {
        try {
          session.web!.sourceBuffer = mediaSource.addSourceBuffer(mimeForFormat(session.format));
          session.web!.sourceBuffer.addEventListener('updateend', () => {
            session.web!.appending = false;
            this.flushWebAppend(session);
          });
          this.flushWebAppend(session);
        } catch (e) {
          console.warn('[streamAudioPlayer] MSE setup failed', e);
        }
      });

      audio.addEventListener('ended', () => {
        if (this.webLiveAudio === audio) {
          this.webLiveAudio = null;
          this.webLiveMessageId = null;
        }
        this.notifyPlayback(messageId, false);
        this.pumpStartQueue();
      });
      audio.addEventListener('play', () => this.notifyPlayback(messageId, true));
    }

    session.web.appendQueue.push(bytes);
    this.flushWebAppend(session);

    if (!session.web.started && session.chunkCount >= MIN_CHUNKS_BEFORE_PLAY) {
      if (this.isBlockedByOther(messageId)) {
        this.enqueueStart(messageId);
        return;
      }
      this.startWebPlayback(messageId, session);
    }
  }

  private flushWebAppend(session: StreamSession) {
    const web = session.web;
    if (!web?.sourceBuffer || web.appending || web.appendQueue.length === 0) return;
    if (web.sourceBuffer.updating) return;

    const next = web.appendQueue.shift()!;
    web.appending = true;
    try {
      web.sourceBuffer.appendBuffer(new Uint8Array(next).buffer);
    } catch {
      web.appending = false;
    }
  }

  private async feedNativeChunk(
    messageId: string,
    session: StreamSession,
    base64: string,
    format: string,
  ) {
    if (!session.native) {
      session.native = {
        queue: [],
        playing: false,
        pendingStart: false,
        player: null,
        statusSub: null,
      };
    }
    const uri = `data:${mimeForFormat(format)};base64,${base64}`;
    session.native.queue.push(uri);

    if (session.native.playing) return;

    if (this.isBlockedByOther(messageId)) {
      session.native.pendingStart = true;
      this.enqueueStart(messageId);
      return;
    }

    await this.startNativePlayback(messageId, session);
  }

  private async startNativePlayback(messageId: string, session: StreamSession) {
    const native = session.native;
    if (!native || native.playing) return;
    native.pendingStart = false;
    native.playing = true;
    this.notifyPlayback(messageId, true);
    await this.playNativeQueue(messageId, session);
    this.notifyPlayback(messageId, false);
    this.pumpStartQueue();
  }

  private async playNativeQueue(messageId: string, session: StreamSession) {
    const native = session.native;
    if (!native) return;

    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

    while (native.queue.length > 0) {
      if (!this.sessions.has(messageId)) break;
      const uri = native.queue.shift()!;
      try {
        native.statusSub?.remove();
        releasePlayer(native.player);
        native.player = null;

        const player = createAudioPlayer({ uri });
        native.player = player;
        await new Promise<void>((resolve) => {
          native.statusSub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
            if (status.didJustFinish) resolve();
          });
          player.play();
        });
      } catch {
        /* skip bad chunk */
      }
    }
    native.playing = false;
    native.statusSub?.remove();
    native.statusSub = null;
    releasePlayer(native.player);
    native.player = null;
  }

  private destroySession(messageId: string, session: StreamSession) {
    if (session.web) {
      session.web.audio.pause();
      URL.revokeObjectURL(session.web.objectUrl);
    }
    if (session.native) {
      session.native.statusSub?.remove();
      releasePlayer(session.native.player);
      session.native.player = null;
    }
    this.sessions.delete(messageId);
  }
}

function audioPlay(audio: HTMLAudioElement, onStarted?: () => void) {
  audio.play().then(() => onStarted?.()).catch(() => {});
}

/** Call on user gesture so later proactive TTS can autoplay on web. */
export function unlockWebAudioAutoplay(): void {
  if (!isWeb || typeof window === 'undefined' || typeof window.Audio === 'undefined') return;
  const audio = new window.Audio();
  audio.volume = 0.01;
  void audio.play().catch(() => {});
}

export const streamAudioPlayer = new StreamAudioPlayer();
