import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { storyAudioPlayer } from '../utils/storyAudioPlayer';

/** Stops all story ambience/SFX when the screen loses focus (e.g. back to chapter select). */
export function useStopStoryAudioOnBlur() {
  useFocusEffect(
    useCallback(() => {
      return () => {
        void storyAudioPlayer.stopAll();
      };
    }, []),
  );
}
