import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, ApiError } from '../api/client';
import {
  login,
  loginWithApple as apiLoginWithApple,
  loginWithGoogle as apiLoginWithGoogle,
  loginWithTelegram as apiLoginWithTelegram,
  loginWithTelegramWidget as apiLoginWithTelegramWidget,
  register,
  resetPassword,
  sendCode,
} from '../api/auth';
import { getMe, updateUser } from '../api/user';
import type { Lang } from '../i18n/types';
import type {
  AppleAuthReq,
  RegisterReq,
  ResetPasswordReq,
  TelegramWidgetAuthReq,
  UserInfo,
} from '../types/api';
import { buildUnifiedLangUpdate } from '../utils/userLang';
import { syncContentTierWithServer } from '../utils/contentTierSync';
import {
  clearPendingAffCode,
  getPendingAffCode,
} from '../utils/affiliateAttribution';
import {
  clearGaIdentity,
  syncGaIdentityFromUser,
  trackAuthLogin,
  trackRegisterComplete,
} from '../utils/analytics';
import { useVipStore } from './vipStore';
import { useAgentMediaCacheStore } from './agentMediaCacheStore';
import { useFeatureFlagsStore } from './featureFlagsStore';

async function resolveAffCode(explicit?: string): Promise<string | undefined> {
  const fromReq = explicit?.trim().toLowerCase();
  if (fromReq) return fromReq;
  return (await getPendingAffCode()) || undefined;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isLoggedIn: boolean;
  isRestored: boolean;
  setRestored: (value: boolean) => void;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginWithGoogle: (idToken: string, inviteCode?: string, aff?: string) => Promise<void>;
  loginWithApple: (req: AppleAuthReq) => Promise<void>;
  loginWithTelegram: (initData: string, aff?: string) => Promise<void>;
  loginWithTelegramWidget: (req: TelegramWidgetAuthReq) => Promise<void>;
  register: (req: RegisterReq) => Promise<void>;
  resetPassword: (req: ResetPasswordReq) => Promise<void>;
  sendCode: (email: string, type: 'register' | 'reset', turnstileToken?: string) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserLang: (lang: Lang) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoggedIn: false,
      isRestored: false,
      setRestored: (value) => set({ isRestored: value }),

      login: async (email, password, turnstileToken) => {
        const resp = await login(email, password, turnstileToken);
        setAuthToken(resp.token);
        const user = await syncContentTierWithServer(resp.user);
        const resolved = user ?? resp.user;
        set({
          token: resp.token,
          user: resolved,
          isLoggedIn: true,
        });
        syncGaIdentityFromUser(resolved);
        trackAuthLogin('email');
        void useFeatureFlagsStore.getState().refresh();
      },

      loginWithGoogle: async (idToken, inviteCode, aff) => {
        const resolvedAff = await resolveAffCode(aff);
        const resp = await apiLoginWithGoogle(idToken, inviteCode, resolvedAff);
        setAuthToken(resp.token);
        const user = await syncContentTierWithServer(resp.user);
        const resolved = user ?? resp.user;
        if (resp.is_new_user) {
          await clearPendingAffCode();
        }
        set({
          token: resp.token,
          user: resolved,
          isLoggedIn: true,
        });
        syncGaIdentityFromUser(resolved);
        if (resp.is_new_user) {
          trackRegisterComplete('google');
        } else {
          trackAuthLogin('google');
        }
      },

      loginWithApple: async (req) => {
        const resolvedAff = await resolveAffCode(req.aff);
        const resp = await apiLoginWithApple({ ...req, aff: resolvedAff });
        setAuthToken(resp.token);
        const user = await syncContentTierWithServer(resp.user);
        const resolved = user ?? resp.user;
        if (resp.is_new_user) {
          await clearPendingAffCode();
        }
        set({
          token: resp.token,
          user: resolved,
          isLoggedIn: true,
        });
        syncGaIdentityFromUser(resolved);
        if (resp.is_new_user) {
          trackRegisterComplete('apple');
        } else {
          trackAuthLogin('apple');
        }
      },

      loginWithTelegram: async (initData, aff) => {
        const resolvedAff = await resolveAffCode(aff);
        const resp = await apiLoginWithTelegram(initData, resolvedAff);
        setAuthToken(resp.token);
        const user = await syncContentTierWithServer(resp.user);
        const resolved = user ?? resp.user;
        if (resp.is_new_user) {
          await clearPendingAffCode();
        }
        set({
          token: resp.token,
          user: resolved,
          isLoggedIn: true,
        });
        syncGaIdentityFromUser(resolved);
        if (resp.is_new_user) {
          trackRegisterComplete('telegram');
        } else {
          trackAuthLogin('telegram');
        }
      },

      loginWithTelegramWidget: async (req) => {
        const resolvedAff = await resolveAffCode(req.aff);
        const resp = await apiLoginWithTelegramWidget({ ...req, aff: resolvedAff });
        setAuthToken(resp.token);
        const user = await syncContentTierWithServer(resp.user);
        const resolved = user ?? resp.user;
        if (resp.is_new_user) {
          await clearPendingAffCode();
        }
        set({
          token: resp.token,
          user: resolved,
          isLoggedIn: true,
        });
        syncGaIdentityFromUser(resolved);
        if (resp.is_new_user) {
          trackRegisterComplete('telegram');
        } else {
          trackAuthLogin('telegram');
        }
      },

      register: async (req) => {
        const resolvedAff = await resolveAffCode(req.aff);
        const resp = await register({ ...req, aff: resolvedAff });
        setAuthToken(resp.token);
        const user = await syncContentTierWithServer(resp.user);
        const resolved = user ?? resp.user;
        await clearPendingAffCode();
        set({
          token: resp.token,
          user: resolved,
          isLoggedIn: true,
        });
        syncGaIdentityFromUser(resolved);
        trackRegisterComplete('email');
      },

      resetPassword: async (req) => {
        await resetPassword(req);
      },

      sendCode: async (email, type, turnstileToken) => {
        await sendCode(email, type, turnstileToken);
      },

      logout: () => {
        setAuthToken(null);
        clearGaIdentity();
        set({ token: null, user: null, isLoggedIn: false });
        useVipStore.getState().clear();
        // Avoid leaking unlocked/mature list payloads across accounts.
        useAgentMediaCacheStore.getState().clear();
        useFeatureFlagsStore.getState().clear();
      },

      refreshUser: async () => {
        const { token, isLoggedIn } = get();
        if (!token || !isLoggedIn) return;
        try {
          const user = await getMe();
          const synced = await syncContentTierWithServer(user);
          const resolved = synced ?? user;
          set({ user: resolved });
          syncGaIdentityFromUser(resolved);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            setAuthToken(null);
            clearGaIdentity();
            set({ token: null, user: null, isLoggedIn: false });
          }
          throw err;
        }
      },

      updateUserLang: async (lang: Lang) => {
        const { token, isLoggedIn } = get();
        if (!token || !isLoggedIn) return;
        const user = await updateUser(buildUnifiedLangUpdate(lang));
        set({ user });
      },

      restore: async () => {
        const { token } = get();
        if (token) {
          setAuthToken(token);
          set({ isLoggedIn: true });
          try {
            const user = await getMe();
            const synced = await syncContentTierWithServer(user);
            const resolved = synced ?? user;
            set({ user: resolved });
            syncGaIdentityFromUser(resolved);
          } catch (err) {
            // Only clear session on auth failure. Network blips / CORS / extension
            // interference must not force logout (cached user stays until refresh).
            if (err instanceof ApiError && err.status === 401) {
              setAuthToken(null);
              clearGaIdentity();
              set({ token: null, user: null, isLoggedIn: false });
            } else if (__DEV__) {
              console.warn('[auth.restore] getMe failed; keeping session', err);
            }
          }
        }
        set({ isRestored: true });
        if (get().isLoggedIn) {
          void useFeatureFlagsStore.getState().refresh();
        }
      },
    }),
    {
      name: '@soulthread_scene_auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
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
    },
  ),
);
