import { useCallback, useRef, useState } from 'react';
import { asr } from '../api/chat';
import { useI18n } from '../i18n/I18nContext';
import type { Lang } from '../i18n/types';
import { resolveAsrLang } from '../utils/userLang';
import { MicrophonePermissionDeniedError, voiceRecorder } from '../utils/voiceRecorder';
import { unlockWebAudioAutoplay } from '../utils/streamAudioPlayer';
import { notifyError, notifyWarning } from '../utils/notify';

type UseVoiceAsrOptions = {
  onText: (text: string) => void;
  disabled?: boolean;
  lang?: Lang;
  userLangs?: {
    voice_lang?: string;
    subtitle_lang?: string;
    system_lang?: string;
  };
};

export function useVoiceAsr({ onText, disabled = false, lang, userLangs }: UseVoiceAsrOptions) {
  const { t, lang: uiLang } = useI18n();
  const activeLang = lang ?? uiLang;
  const whisperLang = resolveAsrLang(userLangs, activeLang);
  const [recording, setRecording] = useState(false);
  const [asrLoading, setAsrLoading] = useState(false);
  const recordingRef = useRef(false);

  const handleStartRecording = useCallback(async () => {
    if (disabled || asrLoading || recordingRef.current) return;
    recordingRef.current = true;
    setRecording(true);
    unlockWebAudioAutoplay();
    try {
      await voiceRecorder.startRecording(activeLang);
    } catch (err) {
      console.warn('Start recording failed:', err);
      recordingRef.current = false;
      setRecording(false);
      if (err instanceof MicrophonePermissionDeniedError) return;
      notifyWarning(t('chat.micUnavailable'));
    }
  }, [activeLang, asrLoading, disabled, t]);

  const handleStopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);

    try {
      const result = await voiceRecorder.stopRecording();
      if (!result) {
        notifyWarning(t('chat.voiceTooShort'));
        return;
      }

      setAsrLoading(true);
      try {
        const res = await asr({
          format: result.format,
          audio_base64: result.base64,
          ...(whisperLang ? { language: whisperLang } : {}),
        });
        const text = res.text?.trim() ?? '';
        if (!text) {
          notifyWarning(t('chat.asrEmpty'));
          return;
        }
        onText(text);
      } catch (err) {
        console.error('ASR failed:', err);
        notifyError(t('chat.asrFailed'));
      } finally {
        setAsrLoading(false);
      }
    } catch (err) {
      console.error('Stop recording failed:', err);
    }
  }, [onText, t, whisperLang]);

  return {
    recording,
    asrLoading,
    handleStartRecording,
    handleStopRecording,
  };
}
