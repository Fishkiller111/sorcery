import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storyAudioPlayer } from '../utils/storyAudioPlayer';

interface StoryAudioState {
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
}

export const useStoryAudioStore = create<StoryAudioState>()(
  persist<StoryAudioState, [], [], Pick<StoryAudioState, 'muted'>>(
    (set, get) => ({
      muted: false,
      setMuted: (muted) => {
        set({ muted });
        if (muted) {
          void storyAudioPlayer.stopAll();
        }
      },
      toggleMuted: () => {
        const next = !get().muted;
        get().setMuted(next);
      },
    }),
    {
      name: 'story-audio-prefs',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
      partialize: (state) => ({ muted: state.muted }),
    },
  ),
);

export function isStoryAudioMuted(): boolean {
  return useStoryAudioStore.getState().muted;
}
