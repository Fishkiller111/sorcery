import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import type { BeatId } from '../engine/types';
import { isStoryAudioMuted } from '../stores/storyAudioStore';
import { STORY_AUDIO, StoryAudioKey } from '../data/storyAudioRegistry';

let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    });
    audioModeReady = true;
  } catch {
    // ignore — web or restricted env
  }
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

function waitUntilFinished(player: AudioPlayer): Promise<void> {
  return new Promise((resolve) => {
    const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.didJustFinish) {
        sub.remove();
        resolve();
      }
    });
  });
}

class StoryAudioPlayer {
  private ambience: AudioPlayer | null = null;
  private ambienceKey: string | null = null;
  private ambienceVolume = 0.35;
  private duckUntil = 0;
  private music: AudioPlayer | null = null;
  private activeSfx = new Set<AudioPlayer>();
  private playbackGeneration = 0;
  private sfxQueue: Promise<void> = Promise.resolve();

  private bumpGeneration() {
    this.playbackGeneration += 1;
    return this.playbackGeneration;
  }

  private isStale(generation: number) {
    return generation !== this.playbackGeneration;
  }

  private async stopPlayer(player: AudioPlayer | null) {
    releasePlayer(player);
  }

  private async stopTrackedSfx() {
    const players = [...this.activeSfx];
    this.activeSfx.clear();
    await Promise.all(players.map((player) => this.stopPlayer(player)));
  }

  async setAmbience(key: StoryAudioKey | null, crossfadeMs = 0) {
    const generation = this.playbackGeneration;
    await ensureAudioMode();
    if (this.isStale(generation)) return;
    if (isStoryAudioMuted()) {
      if (this.ambience) {
        releasePlayer(this.ambience);
        this.ambience = null;
        this.ambienceKey = null;
      }
      return;
    }
    if (key === this.ambienceKey && this.ambience) return;

    const prev = this.ambience;
    this.ambience = null;
    this.ambienceKey = key;

    if (!key) {
      releasePlayer(prev);
      return;
    }

    const source = STORY_AUDIO[key];
    if (!source) return;

    const player = createAudioPlayer(source);
    player.loop = true;
    player.volume = crossfadeMs > 0 ? 0 : this.ambienceVolume;
    player.play();
    if (this.isStale(generation)) {
      await this.stopPlayer(player);
      return;
    }
    this.ambience = player;

    if (prev) {
      if (crossfadeMs > 0) {
        const steps = 8;
        const stepMs = crossfadeMs / steps;
        for (let i = 1; i <= steps; i++) {
          await new Promise((r) => setTimeout(r, stepMs));
          player.volume = (this.ambienceVolume * i) / steps;
        }
      }
      releasePlayer(prev);
    } else {
      player.volume = this.ambienceVolume;
    }
  }

  async duckAmbience(db: number, durationMs: number) {
    const factor = Math.pow(10, db / 20);
    const target = Math.max(0.05, this.ambienceVolume * factor);
    this.duckUntil = Date.now() + durationMs;
    if (this.ambience) {
      this.ambience.volume = target;
    }
    setTimeout(() => {
      if (Date.now() >= this.duckUntil && this.ambience) {
        this.ambience.volume = this.ambienceVolume;
      }
    }, durationMs + 50);
  }

  playSfx(key: StoryAudioKey, duckDb = -6): void {
    if (isStoryAudioMuted()) return;
    this.sfxQueue = this.sfxQueue.then(() => this.playOneShotInternal(key, duckDb));
  }

  playMusic(key: StoryAudioKey, duckDb = -6): Promise<void> {
    if (isStoryAudioMuted()) return Promise.resolve();
    return (this.sfxQueue = this.sfxQueue.then(() => this.playMusicInternal(key, duckDb)));
  }

  private async playOneShotInternal(key: StoryAudioKey, duckDb: number) {
    if (isStoryAudioMuted()) return;
    const generation = this.playbackGeneration;
    await ensureAudioMode();
    if (this.isStale(generation)) return;
    const source = STORY_AUDIO[key];
    if (!source) return;

    if (duckDb) void this.duckAmbience(duckDb, 2500);

    let player: AudioPlayer | null = null;
    try {
      player = createAudioPlayer(source);
      player.volume = 0.85;
      player.play();
      if (this.isStale(generation)) {
        await this.stopPlayer(player);
        return;
      }
      this.activeSfx.add(player);
      await waitUntilFinished(player);
    } catch {
      // ignore playback errors
    } finally {
      if (player) {
        this.activeSfx.delete(player);
        await this.stopPlayer(player);
      }
    }
  }

  private async playMusicInternal(key: StoryAudioKey, duckDb: number) {
    if (isStoryAudioMuted()) return;
    const generation = this.playbackGeneration;
    await ensureAudioMode();
    if (this.isStale(generation)) return;
    const source = STORY_AUDIO[key];
    if (!source) return;

    if (this.music) {
      await this.stopPlayer(this.music);
      this.music = null;
    }
    if (this.isStale(generation)) return;

    if (duckDb) void this.duckAmbience(duckDb, 15000);

    let player: AudioPlayer | null = null;
    try {
      player = createAudioPlayer(source);
      player.volume = 0.9;
      player.loop = false;
      player.play();
      if (this.isStale(generation)) {
        await this.stopPlayer(player);
        return;
      }
      this.music = player;
      await waitUntilFinished(player);
      if (this.music === player) this.music = null;
    } catch {
      // ignore playback errors
    } finally {
      if (this.music) {
        await this.stopPlayer(this.music);
        this.music = null;
      }
    }
  }

  async stopAll() {
    this.bumpGeneration();
    this.sfxQueue = Promise.resolve();
    this.duckUntil = 0;
    await this.stopTrackedSfx();
    if (this.music) {
      await this.stopPlayer(this.music);
      this.music = null;
    }
    if (this.ambience) {
      await this.stopPlayer(this.ambience);
      this.ambience = null;
      this.ambienceKey = null;
    }
  }
}

export const storyAudioPlayer = new StoryAudioPlayer();

export function ambienceForBeat(sceneId: string, beatId: BeatId): StoryAudioKey | null {
  if (sceneId === 's0_01') {
    if (beatId === 'beat_1' || beatId === 'beat_2') return 's0_01_amb_dorm';
    if (beatId === 'beat_3' || beatId === 'beat_4' || beatId === 'beat_5') return 's0_01_amb_factory';
    return null;
  }
  if (sceneId === 's0_03') {
    if (beatId === 'beat_1') return 's0_03_amb_tunnel';
    if (beatId === 'beat_2' || beatId === 'beat_3' || beatId === 'beat_4' || beatId === 'beat_5') {
      return 's0_03_amb_cellar';
    }
  }
  if (sceneId === 's0_04') {
    if (beatId === 'beat_1' || beatId === 'beat_2' || beatId === 'beat_3' || beatId === 'beat_4') {
      return 's0_04_amb_dorm_night';
    }
  }
  return null;
}

export function ambienceCrossfadeMs(
  sceneId: string,
  prevBeat: BeatId | null,
  nextBeat: BeatId,
): number {
  if (sceneId === 's0_01' && prevBeat === 'beat_2' && nextBeat === 'beat_3') return 1500;
  if (sceneId === 's0_03' && prevBeat === 'beat_1' && nextBeat === 'beat_2') return 1500;
  return 0;
}
