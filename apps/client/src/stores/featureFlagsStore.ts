import { create } from 'zustand';
import { fetchConfigFeatures } from '../api/configFeatures';

interface FeatureFlagsState {
  /** Mirrors Simulator.PublicEnabled; default false until API says otherwise. */
  simulatorPublicEnabled: boolean;
  loaded: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
  clear: () => void;
}

let inflight: Promise<void> | null = null;

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  simulatorPublicEnabled: false,
  loaded: false,
  loading: false,

  refresh: async () => {
    if (inflight) return inflight;
    inflight = (async () => {
      set({ loading: true });
      try {
        const resp = await fetchConfigFeatures();
        set({
          simulatorPublicEnabled: resp.simulator_public_enabled === true,
          loaded: true,
          loading: false,
        });
      } catch {
        // Keep previous value (or default false); mark loaded so we do not spin forever.
        set({ loaded: true, loading: false });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  ensureLoaded: async () => {
    if (get().loaded || get().loading) {
      if (inflight) await inflight;
      return;
    }
    await get().refresh();
  },

  clear: () =>
    set({
      simulatorPublicEnabled: false,
      loaded: false,
      loading: false,
    }),
}));
