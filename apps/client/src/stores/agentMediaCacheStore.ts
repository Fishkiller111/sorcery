import { create } from 'zustand';
import type { ExploreRoleDetailResp, PostItem, RoleMediaItem } from '../types/api';

const STALE_MS = 60_000;

type RoleMediaCacheEntry = {
  detail: ExploreRoleDetailResp | null;
  media: RoleMediaItem[];
  posts: PostItem[];
  imageCount: number;
  videoCount: number;
  mediaPage: number;
  mediaTotalPages: number;
  mediaTotalCount: number;
  fetchedAt: number;
};

type AgentMediaCacheState = {
  byRole: Record<string, RoleMediaCacheEntry>;
  get: (roleId: string) => RoleMediaCacheEntry | null;
  isFresh: (roleId: string) => boolean;
  set: (
    roleId: string,
    data: {
      detail: ExploreRoleDetailResp | null;
      media: RoleMediaItem[];
      posts: PostItem[];
      imageCount?: number;
      videoCount?: number;
      mediaPage?: number;
      mediaTotalPages?: number;
      mediaTotalCount?: number;
    },
  ) => void;
  clearRole: (roleId: string) => void;
  clear: () => void;
};

export const useAgentMediaCacheStore = create<AgentMediaCacheState>((set, get) => ({
  byRole: {},

  get: (roleId) => get().byRole[roleId] ?? null,

  isFresh: (roleId) => {
    const entry = get().byRole[roleId];
    if (!entry) return false;
    return Date.now() - entry.fetchedAt < STALE_MS;
  },

  set: (roleId, data) =>
    set((state) => ({
      byRole: {
        ...state.byRole,
        [roleId]: {
          detail: data.detail,
          media: data.media,
          posts: data.posts,
          imageCount: data.imageCount ?? state.byRole[roleId]?.imageCount ?? 0,
          videoCount: data.videoCount ?? state.byRole[roleId]?.videoCount ?? 0,
          mediaPage: data.mediaPage ?? state.byRole[roleId]?.mediaPage ?? 1,
          mediaTotalPages: data.mediaTotalPages ?? state.byRole[roleId]?.mediaTotalPages ?? 1,
          mediaTotalCount: data.mediaTotalCount ?? state.byRole[roleId]?.mediaTotalCount ?? 0,
          fetchedAt: Date.now(),
        },
      },
    })),

  clearRole: (roleId) =>
    set((state) => {
      const next = { ...state.byRole };
      delete next[roleId];
      return { byRole: next };
    }),

  clear: () => set({ byRole: {} }),
}));
