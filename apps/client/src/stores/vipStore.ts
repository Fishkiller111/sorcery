import { create } from 'zustand';
import { getVipMe } from '../api/vip';
import type { VipMeResp } from '../types/api';

interface VipState {
  vip: VipMeResp | null;
  loading: boolean;
  fetchVip: () => Promise<VipMeResp | null>;
  clear: () => void;
}

export const useVipStore = create<VipState>((set) => ({
  vip: null,
  loading: false,

  fetchVip: async () => {
    set({ loading: true });
    try {
      const vip = await getVipMe();
      set({ vip, loading: false });
      return vip;
    } catch {
      set({ loading: false });
      return null;
    }
  },

  clear: () => set({ vip: null, loading: false }),
}));
