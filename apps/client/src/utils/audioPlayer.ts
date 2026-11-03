import { Platform } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';

const isWeb = Platform.OS === 'web';

type StateChange = (playing: boolean) => void;
type AudioFormat = 'mp3' | 'wav';

function decodeBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function mimeForFormat(format: AudioFormat): string {
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

class AudioPlayerImpl {
  private currentId: string | null = null;
  private webAudio: HTMLAudioElement | null = null;
  private webObjectUrl: string | null = null;
  private nativePlayer: AudioPlayer | null = null;
  private statusSub: { remove: () => void } | null = null;
  private onChange: StateChange | null = null;

  currentMessageId(): string | null {
    return this.currentId;
  }

  isPlaying(): boolean {
    if (isWeb && this.webAudio) {
      return !this.webAudio.paused && !this.webAudio.ended;
    }
    return this.currentId != null && !!this.nativePlayer?.playing;
  }

  async play(messageId: string, audioData: string, format: AudioFormat, onChange?: StateChange) {
    if (this.currentId === messageId && this.webAudio) {
      if (this.webAudio.paused) {
        this.webAudio.play().catch(() => {});
        this.onChange?.(true);
        onChange?.(true);
      } else {
        this.webAudio.pause();
        this.onChange?.(false);
        onChange?.(false);
      }
      return;
    }

    if (this.currentId === messageId && this.nativePlayer) {
      if (this.nativePlayer.playing) {
        this.nativePlayer.pause();
        this.onChange?.(false);
        onChange?.(false);
      } else {
        this.nativePlayer.play();
        this.onChange?.(true);
        onChange?.(true);
      }
      return;
    }

    await this.stop();
    this.currentId = messageId;
    this.onChange = onChange || null;

    if (isWeb) {
      const mime = mimeForFormat(format);
      const bytes = decodeBase64(audioData);
      const blob = new Blob([new Uint8Array(bytes)], { type: mime });
      const objectUrl = URL.createObjectURL(blob);
      const audio = new window.Audio(objectUrl);
      this.webObjectUrl = objectUrl;

      audio.onended = () => {
        if (this.currentId === messageId) {
          this.cleanup();
        }
      };
      audio.onplay = () => {
        this.onChange?.(true);
        onChange?.(true);
      };
      this.webAudio = audio;
      audio.play().catch(() => {
        if (this.currentId === messageId) {
          this.cleanup();
        }
      });
    } else {
      const isFile = audioData.startsWith('file://') || audioData.startsWith('/');
      const uri = isFile
        ? audioData
        : `data:${mimeForFormat(format)};base64,${audioData}`;
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        const player = createAudioPlayer({ uri });
        this.nativePlayer = player;
        this.statusSub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
          if (status.didJustFinish) {
            this.cleanup();
          } else {
            this.onChange?.(status.playing);
            onChange?.(status.playing);
          }
        });
        player.play();
      } catch (e) {
        console.warn('[audioPlayer] play failed', e);
        this.cleanup();
      }
    }
  }

  async playFromUrl(messageId: string, url: string, onChange?: StateChange) {
    if (!url) return;
    if (this.currentId === messageId && this.webAudio) {
      if (this.webAudio.paused) {
        this.webAudio.play().catch(() => {});
        this.onChange?.(true);
        onChange?.(true);
      } else {
        this.webAudio.pause();
        this.onChange?.(false);
        onChange?.(false);
      }
      return;
    }
    if (this.currentId === messageId && this.nativePlayer) {
      if (this.nativePlayer.playing) {
        this.nativePlayer.pause();
        this.onChange?.(false);
        onChange?.(false);
      } else {
        this.nativePlayer.play();
        this.onChange?.(true);
        onChange?.(true);
      }
      return;
    }

    await this.stop();
    this.currentId = messageId;
    this.onChange = onChange || null;

    if (isWeb) {
      const audio = new window.Audio(url);
      audio.onended = () => {
        if (this.currentId === messageId) {
          this.cleanup();
        }
      };
      audio.onplay = () => {
        this.onChange?.(true);
        onChange?.(true);
      };
      this.webAudio = audio;
      audio.play().catch(() => {
        if (this.currentId === messageId) {
          this.cleanup();
        }
      });
      return;
    }

    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const player = createAudioPlayer({ uri: url });
      this.nativePlayer = player;
      this.statusSub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (status.didJustFinish) {
          this.cleanup();
        } else {
          this.onChange?.(status.playing);
          onChange?.(status.playing);
        }
      });
      player.play();
    } catch (e) {
      console.warn('[audioPlayer] playFromUrl failed', e);
      this.cleanup();
    }
  }

  async stop() {
    if (isWeb && this.webAudio) {
      this.webAudio.pause();
      this.webAudio = null;
    }
    if (isWeb && this.webObjectUrl) {
      URL.revokeObjectURL(this.webObjectUrl);
      this.webObjectUrl = null;
    }
    this.statusSub?.remove();
    this.statusSub = null;
    releasePlayer(this.nativePlayer);
    this.nativePlayer = null;
    this.cleanup();
  }

  private cleanup() {
    if (isWeb && this.webObjectUrl) {
      URL.revokeObjectURL(this.webObjectUrl);
      this.webObjectUrl = null;
    }
    this.webAudio = null;
    this.statusSub?.remove();
    this.statusSub = null;
    releasePlayer(this.nativePlayer);
    this.nativePlayer = null;
    this.currentId = null;
    this.onChange?.(false);
    this.onChange = null;
  }
}

export const audioPlayer = new AudioPlayerImpl();

export async function playFullAudio(audioData: string, format: AudioFormat): Promise<void> {
  await audioPlayer.play(`full-${Date.now()}`, audioData, format);
}

export async function stopFullAudio(): Promise<void> {
  await audioPlayer.stop();
}
