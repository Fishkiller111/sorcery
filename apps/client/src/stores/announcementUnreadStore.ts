import { create } from 'zustand';
import {
  fetchActiveAnnouncements,
  ANNOUNCEMENT_PLACEMENT_PROFILE,
} from '../api/announcements';
import {
  countUnreadAnnouncements,
  pruneReadAnnouncementIds,
} from '../utils/announcementReadStorage';

type AnnouncementUnreadState = {
  unreadCount: number;
  refreshing: boolean;
  setUnreadCount: (count: number) => void;
  clear: () => void;
  refresh: (locale: string) => Promise<number>;
};

export const useAnnouncementUnreadStore = create<AnnouncementUnreadState>((set) => ({
  unreadCount: 0,
  refreshing: false,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  clear: () => set({ unreadCount: 0, refreshing: false }),
  refresh: async (locale: string) => {
    set({ refreshing: true });
    try {
      const resp = await fetchActiveAnnouncements(locale, ANNOUNCEMENT_PLACEMENT_PROFILE);
      const items = resp.items ?? [];
      const readIds = await pruneReadAnnouncementIds(items.map((item) => item.id));
      const count = countUnreadAnnouncements(items, readIds);
      set({ unreadCount: count, refreshing: false });
      return count;
    } catch {
      set({ unreadCount: 0, refreshing: false });
      return 0;
    }
  },
}));
