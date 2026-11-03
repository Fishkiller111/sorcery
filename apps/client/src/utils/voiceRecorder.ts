import { Platform, PermissionsAndroid } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';
import { getCommon } from '../i18n/common';
import type { Lang } from '../i18n/types';
import { readAudioFile } from './audioStorage';
import { promptMicrophoneAccessSettings } from './promptPhotoLibraryAccessSettings';

const isWeb = Platform.OS === 'web';
const MIN_VOICE_DURATION_MS = 800;
const WEB_RECORD_TIMESLICE_MS = 250;

export type VoiceRecordingResult = {
  base64: string;
  format: string;
};

export class MicrophonePermissionDeniedError extends Error {
  constructor() {
    super('microphone permission denied');
    this.name = 'MicrophonePermissionDeniedError';
  }
}

const WEB_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function pickWebMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const mime of WEB_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

function formatFromMime(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('mp4') || lower.includes('aac')) return 'mp4';
  if (lower.includes('wav')) return 'wav';
  return 'webm';
}

class VoiceRecorderImpl {
  private recording: AudioRecorder | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private webStream: MediaStream | null = null;
  private webMimeType = '';
  private startTime = 0;
  private starting: Promise<void> | null = null;
  private cancelStart = false;

  async requestPermission(): Promise<boolean> {
    if (isWeb) {
      if (!navigator.mediaDevices?.getUserMedia) return false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch {
        return false;
      }
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO!);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }

    const { status } = await requestRecordingPermissionsAsync();
    return status === 'granted';
  }

  async startRecording(lang: Lang = 'en'): Promise<void> {
    if (this.starting) {
      await this.starting;
      return;
    }

    this.cancelStart = false;
    this.starting = this.startRecordingInternal(lang);
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  private async startRecordingInternal(lang: Lang): Promise<void> {
    const permitted = await this.requestPermission();
    if (!permitted || this.cancelStart) {
      if (!permitted) {
        promptMicrophoneAccessSettings((key) => getCommon(key, lang));
      }
      throw new MicrophonePermissionDeniedError();
    }

    if (this.cancelStart) {
      throw new Error('recording start cancelled');
    }

    if (isWeb) {
      await this.startWebRecording();
    } else {
      await this.startNativeRecording();
    }
  }

  async stopRecording(): Promise<VoiceRecordingResult | null> {
    if (this.starting) {
      this.cancelStart = true;
      try {
        await this.starting;
      } catch {
        /* cancelled before recorder started */
      }
      if (this.cancelStart && !this.mediaRecorder && !this.recording) {
        return null;
      }
    }

    if (isWeb) {
      return this.stopWebRecording();
    }
    return this.stopNativeRecording();
  }

  isRecording(): boolean {
    if (isWeb) return this.mediaRecorder?.state === 'recording';
    return this.recording?.isRecording === true;
  }

  getRecordingDurationMs(): number {
    return Date.now() - this.startTime;
  }

  private async startNativeRecording() {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    const recording = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recording.prepareToRecordAsync();
    recording.record();
    this.recording = recording;
    this.startTime = Date.now();
  }

  private async stopNativeRecording(): Promise<VoiceRecordingResult | null> {
    if (!this.recording) return null;
    const active = this.recording;
    this.recording = null;

    await active.stop();
    const status = active.getStatus();
    const uri = active.uri;

    const duration = status.durationMillis || this.getRecordingDurationMs();
    if (duration < MIN_VOICE_DURATION_MS || !uri) {
      return null;
    }

    const base64 = await readAudioFile(uri);
    return { base64, format: 'm4a' };
  }

  private async startWebRecording() {
    this.recordedChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.webStream = stream;

    const mimeType = pickWebMimeType();
    this.webMimeType = mimeType;
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    recorder.start(WEB_RECORD_TIMESLICE_MS);
    this.mediaRecorder = recorder;
    this.startTime = Date.now();
  }

  private async stopWebRecording(): Promise<VoiceRecordingResult | null> {
    if (!this.mediaRecorder) return null;

    return new Promise((resolve) => {
      const recorder = this.mediaRecorder!;
      const mime = recorder.mimeType || this.webMimeType || 'audio/webm';

      recorder.onstop = async () => {
        this.webStream?.getTracks().forEach((track) => track.stop());
        this.webStream = null;
        this.mediaRecorder = null;
        this.webMimeType = '';

        const duration = Date.now() - this.startTime;
        if (duration < MIN_VOICE_DURATION_MS || this.recordedChunks.length === 0) {
          resolve(null);
          return;
        }

        try {
          const blob = new Blob(this.recordedChunks, { type: mime });
          const base64 = await blobToBase64(blob);
          resolve({ base64, format: formatFromMime(mime) });
        } catch {
          resolve(null);
        } finally {
          this.recordedChunks = [];
        }
      };

      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
      } catch {
        /* some browsers reject requestData */
      }

      try {
        recorder.stop();
      } catch {
        this.webStream?.getTracks().forEach((track) => track.stop());
        this.webStream = null;
        this.mediaRecorder = null;
        resolve(null);
      }
    });
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const voiceRecorder = new VoiceRecorderImpl();
