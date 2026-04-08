import { create } from 'zustand';
import type { UserPublic, LoginInput, RegisterInput } from '@pileo/shared';
import * as authApi from '../api/auth.api';

interface AuthState {
  user: UserPublic | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: UserPublic) => void;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user: UserPublic): void => { set({ user }); },

  login: async (input: LoginInput): Promise<void> => {
    const user = await authApi.login(input);
    set({ user, isAuthenticated: true });
  },

  register: async (input: RegisterInput): Promise<void> => {
    const user = await authApi.register(input);
    set({ user, isAuthenticated: true });
  },

  logout: async (): Promise<void> => {
    await authApi.logout();
    set({ user: null, isAuthenticated: false });
  },

  fetchCurrentUser: async (): Promise<void> => {
    try {
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
