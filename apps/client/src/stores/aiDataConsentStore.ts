import { create } from 'zustand';
import {
  loadAiDataConsent,
  saveAiDataConsentAccepted,
} from '../utils/aiDataConsentStorage';

type Resolver = (accepted: boolean) => void;

type AiDataConsentState = {
  loaded: boolean;
  accepted: boolean;
  modalVisible: boolean;
  hydrate: () => Promise<void>;
  /** Returns true if user already consented or taps Agree on the modal. */
  ensureConsent: () => Promise<boolean>;
  accept: () => Promise<void>;
  decline: () => void;
};

let pendingResolvers: Resolver[] = [];

function resolveAll(accepted: boolean) {
  const list = pendingResolvers;
  pendingResolvers = [];
  for (const resolve of list) resolve(accepted);
}

export const useAiDataConsentStore = create<AiDataConsentState>((set, get) => ({
  loaded: false,
  accepted: false,
  modalVisible: false,

  hydrate: async () => {
    const record = await loadAiDataConsent();
    set({ loaded: true, accepted: record?.accepted === true });
  },

  ensureConsent: () => {
    const { loaded, accepted, modalVisible } = get();
    if (accepted) return Promise.resolve(true);
    if (!loaded) {
      return get()
        .hydrate()
        .then(() => get().ensureConsent());
    }
    return new Promise<boolean>((resolve) => {
      pendingResolvers.push(resolve);
      if (!modalVisible) set({ modalVisible: true });
    });
  },

  accept: async () => {
    await saveAiDataConsentAccepted();
    set({ accepted: true, modalVisible: false });
    resolveAll(true);
  },

  decline: () => {
    set({ modalVisible: false });
    resolveAll(false);
  },
}));
