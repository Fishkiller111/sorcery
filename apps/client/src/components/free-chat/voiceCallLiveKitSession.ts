import {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  VideoQuality,
  type LocalAudioTrack,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type TranscriptionSegment,
} from 'livekit-client';

const LEMONSLICE_TOPIC = 'lemonslice';
const SOULTHREAD_TOPIC = 'soulthread';
const BOT_READY = 'bot_ready';
const AVATAR_IDENTITY_HINT = 'lemonslice';

export type LiveKitSessionHandlers = {
  /** First remote video track attached (may still be low-res). */
  onReady?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
  /** Transient WebRTC glitches (data-channel close while reconnecting) — do not hang up. */
  onConnectionIssue?: (message: string) => void;
  /** LemonSlice streaming A/V for real — prefer revealing video here. */
  onBotReady?: (sessionId?: string) => void;
  /** Agent / avatar spoken text for left-panel captions. */
  onTranscription?: (text: string, final: boolean) => void;
  /** Worker AgentSession state: listening | thinking | speaking | idle | … */
  onAgentState?: (state: string) => void;
};

/**
 * Web-only LiveKit room session for digital-human voice calls.
 * Attaches remote video/audio to HTML media elements.
 */
export class VoiceCallLiveKitSession {
  private room: Room | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private readyFired = false;
  private handlers: LiveKitSessionHandlers = {};
  /** Prefer smoothness over max pixels on long RTT (e.g. CN → NA). */
  private preferredQuality: VideoQuality = VideoQuality.MEDIUM;
  private sinkWidth = 480;
  private sinkHeight = 640;

  async connect(opts: {
    serverUrl: string;
    token: string;
    videoEl: HTMLVideoElement | null;
    audioEl?: HTMLAudioElement | null;
    handlers?: LiveKitSessionHandlers;
    /** Display size of the portrait stage — caps subscribed simulcast layer. */
    videoSize?: { width: number; height: number };
  }) {
    this.videoEl = opts.videoEl;
    this.audioEl = opts.audioEl ?? null;
    this.handlers = opts.handlers ?? {};
    this.readyFired = false;
    if (opts.videoSize?.width && opts.videoSize?.height) {
      this.sinkWidth = Math.round(opts.videoSize.width);
      this.sinkHeight = Math.round(opts.videoSize.height);
    }

    // adaptiveStream often undershoots then fights manual quality; we size the
    // sink ourselves and pick a layer that CN↔NA links can sustain smoothly.
    const room = new Room({
      adaptiveStream: false,
      dynacast: true,
    });
    this.room = room;

    room.on(RoomEvent.TrackSubscribed, this.onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, this.onTrackUnsubscribed);
    room.on(RoomEvent.DataReceived, this.onDataReceived);
    room.on(RoomEvent.Disconnected, this.onDisconnected);
    room.on(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
    room.on(RoomEvent.MediaDevicesError, this.onMediaError);
    room.on(RoomEvent.TranscriptionReceived, this.onTranscriptionReceived);
    room.on(RoomEvent.ConnectionStateChanged, this.onConnectionStateChanged);
    room.on(RoomEvent.ConnectionQualityChanged, this.onConnectionQualityChanged);

    await room.connect(opts.serverUrl, opts.token, { autoSubscribe: true });
    await room.localParticipant.setMicrophoneEnabled(true);

    for (const p of room.remoteParticipants.values()) {
      this.attachExistingTracks(p);
    }
  }

  /** Update subscribed layer when the portrait stage resizes. */
  setVideoSinkSize(width: number, height: number) {
    if (width < 64 || height < 64) return;
    this.sinkWidth = Math.round(width);
    this.sinkHeight = Math.round(height);
    this.applyVideoPrefsToAll();
  }

  setMicMuted(muted: boolean) {
    void this.room?.localParticipant.setMicrophoneEnabled(!muted);
  }

  setSpeakerOn(on: boolean) {
    const vol = on ? 1 : 0;
    if (this.audioEl) this.audioEl.volume = vol;
    if (this.videoEl) this.videoEl.muted = !on;
    if (this.room) {
      for (const p of this.room.remoteParticipants.values()) {
        p.audioTrackPublications.forEach((pub) => {
          const track = pub.track;
          if (!track) return;
          track.attachedElements.forEach((el) => {
            if (el instanceof HTMLMediaElement) {
              el.volume = vol;
              el.muted = !on;
            }
          });
        });
      }
    }
  }

  async disconnect() {
    const room = this.room;
    this.room = null;
    if (!room) return;
    room.off(RoomEvent.TrackSubscribed, this.onTrackSubscribed);
    room.off(RoomEvent.TrackUnsubscribed, this.onTrackUnsubscribed);
    room.off(RoomEvent.DataReceived, this.onDataReceived);
    room.off(RoomEvent.Disconnected, this.onDisconnected);
    room.off(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
    room.off(RoomEvent.MediaDevicesError, this.onMediaError);
    room.off(RoomEvent.TranscriptionReceived, this.onTranscriptionReceived);
    room.off(RoomEvent.ConnectionStateChanged, this.onConnectionStateChanged);
    room.off(RoomEvent.ConnectionQualityChanged, this.onConnectionQualityChanged);
    try {
      await room.disconnect();
    } catch {
      /* ignore */
    }
  }

  get connectionState(): ConnectionState | null {
    return this.room?.state ?? null;
  }

  /** Local mic MediaStreamTrack for input-wave visualisation (web). */
  getLocalMicTrack(): MediaStreamTrack | null {
    const room = this.room;
    if (!room) return null;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    const track = pub?.track as LocalAudioTrack | undefined;
    if (!track || track.kind !== Track.Kind.Audio) return null;
    const mst = track.mediaStreamTrack;
    return mst && mst.readyState === 'live' ? mst : null;
  }

  private applyVideoPrefs(publication: RemoteTrackPublication) {
    try {
      // Cap layer to on-screen pixels — requesting full 9:16 HIGH over CN→NA
      // is the main cause of freeze / low perceived FPS.
      publication.setVideoDimensions?.({
        width: this.sinkWidth,
        height: this.sinkHeight,
      });
      publication.setVideoQuality?.(this.preferredQuality);
    } catch {
      /* older SDK */
    }
  }

  private applyVideoPrefsToAll() {
    const room = this.room;
    if (!room) return;
    for (const p of room.remoteParticipants.values()) {
      p.videoTrackPublications.forEach((pub) => {
        if (pub.kind === Track.Kind.Video) this.applyVideoPrefs(pub);
      });
    }
  }

  private attachExistingTracks(participant: RemoteParticipant) {
    participant.trackPublications.forEach((pub) => {
      if (pub.kind === Track.Kind.Video) {
        this.applyVideoPrefs(pub);
      }
      if (pub.track) {
        this.attachTrack(pub.track, pub, participant);
      }
    });
  }

  private attachTrack(
    track: RemoteTrack,
    publication: RemoteTrackPublication | null,
    participant: RemoteParticipant,
  ) {
    if (track.kind === Track.Kind.Video) {
      if (publication) this.applyVideoPrefs(publication);
      if (this.videoEl) {
        track.attach(this.videoEl);
        this.videoEl.playsInline = true;
        this.videoEl.setAttribute('playsinline', 'true');
        this.videoEl.setAttribute('webkit-playsinline', 'true');
        void this.videoEl.play().catch(() => undefined);
      }
      this.markReady();
    }
    if (track.kind === Track.Kind.Audio) {
      if (this.audioEl) {
        track.attach(this.audioEl);
        void this.audioEl.play().catch(() => undefined);
      } else {
        const el = track.attach();
        if (el instanceof HTMLAudioElement) {
          el.autoplay = true;
          void el.play().catch(() => undefined);
        }
      }
    }
    if (
      track.kind === Track.Kind.Video &&
      participant.identity.toLowerCase().includes(AVATAR_IDENTITY_HINT)
    ) {
      this.markReady();
    }
  }

  private markReady() {
    if (this.readyFired) return;
    this.readyFired = true;
    this.handlers.onReady?.();
  }

  private onTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    this.attachTrack(track, publication, participant);
  };

  private onTrackUnsubscribed = (track: RemoteTrack) => {
    track.detach();
  };

  private onDataReceived = (
    payload: Uint8Array,
    _participant?: RemoteParticipant,
    _kind?: unknown,
    topic?: string,
  ) => {
    if (topic !== LEMONSLICE_TOPIC && topic !== SOULTHREAD_TOPIC) return;
    try {
      const data = JSON.parse(new TextDecoder().decode(payload)) as {
        type?: string;
        session_id?: string;
        state?: string;
      };
      if (topic === LEMONSLICE_TOPIC && data?.type === BOT_READY) {
        this.handlers.onBotReady?.(data.session_id);
        this.markReady();
        return;
      }
      if (topic === SOULTHREAD_TOPIC && data?.type === 'agent_state' && data.state) {
        this.handlers.onAgentState?.(data.state);
      }
    } catch {
      /* ignore */
    }
  };

  private onConnectionStateChanged = (state: ConnectionState) => {
    if (state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting) {
      this.handlers.onConnectionIssue?.('reconnecting');
    }
  };

  private onConnectionQualityChanged = (quality: ConnectionQuality, participant: Participant) => {
    if (!participant.isLocal) return;
    // Excellent can try HIGH; otherwise stay MEDIUM/LOW for fewer freezes.
    let next = VideoQuality.MEDIUM;
    if (quality === ConnectionQuality.Excellent) next = VideoQuality.HIGH;
    else if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost) {
      next = VideoQuality.LOW;
    }
    if (next === this.preferredQuality) return;
    this.preferredQuality = next;
    this.applyVideoPrefsToAll();
  };

  private onDisconnected = () => {
    this.handlers.onDisconnected?.();
  };

  private onParticipantDisconnected = (participant: RemoteParticipant) => {
    if (participant.identity.toLowerCase().includes(AVATAR_IDENTITY_HINT)) {
      this.handlers.onDisconnected?.();
    }
  };

  private onMediaError = (error: Error) => {
    this.handlers.onError?.(error.message || 'media error');
  };

  private onTranscriptionReceived = (
    segments: TranscriptionSegment[],
    participant?: Participant,
  ) => {
    if (!segments?.length) return;
    if (participant?.isLocal) return;
    const text = segments
      .map((s) => (s.text || '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!text) return;
    const final = segments.every((s) => s.final);
    this.handlers.onTranscription?.(text, final);
  };
}
