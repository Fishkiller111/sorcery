import { create } from 'zustand';
import { fetchUserNotificationUnreadCount } from '../api/mediaSubmissions';

type State = {
  inboxUnread: number;
  setInboxUnread: (n: number) => void;
  refreshInboxUnread: () => Promise<void>;
};

export const useInboxUnreadStore = create<State>((set) => ({
  inboxUnread: 0,
  setInboxUnread: (n) => set({ inboxUnread: Math.max(0, n) }),
  refreshInboxUnread: async () => {
    try {
      const resp = await fetchUserNotificationUnreadCount();
      set({ inboxUnread: Math.max(0, resp.count || 0) });
    } catch {
      // ignore when logged out
    }
  },
}));
