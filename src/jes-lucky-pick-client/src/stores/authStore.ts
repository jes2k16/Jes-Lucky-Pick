import { create } from "zustand";
import axios from "axios";
import { setAccessToken } from "@/lib/api-client";
import type { UserDto, LoginResponse } from "@/types/api";

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: UserDto | null) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },
  initialize: async () => {
    if (get().isInitialized) return;
    try {
      const { data } = await axios.post<LoginResponse>("/api/auth/refresh", null, {
        withCredentials: true,
      });
      setAccessToken(data.accessToken);
      set({ user: data.user, isAuthenticated: true, isInitialized: true });
    } catch {
      set({ isInitialized: true });
    }
  },
}));
