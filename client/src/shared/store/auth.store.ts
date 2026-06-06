'use client';

import { create } from 'zustand';
import { AuthApi, UserProfile } from '@/shared/api/auth.api';
import { setAccessToken, clearAccessToken } from '@/shared/api/client';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password?: string, supertokensToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  can: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password?, supertokensToken?) => {
    const res = await AuthApi.login({ email, password, supertokens_token: supertokensToken });
    setAccessToken(res.access_token);
    set({ user: res.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await AuthApi.logout();
    } catch {
      // Ignore logout errors
    }
    clearAccessToken();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchUser: async () => {
    try {
      const user = await AuthApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearAccessToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  can: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    return user.permissions?.includes(permission) ?? false;
  },

  hasRole: (role: string) => {
    const { user } = get();
    if (!user) return false;
    return user.role === role;
  },
}));
