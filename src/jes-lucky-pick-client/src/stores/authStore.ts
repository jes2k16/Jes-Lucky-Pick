import { create } from "zustand";
import type { UserDto } from "@/types/api";

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  setUser: (user: UserDto | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
