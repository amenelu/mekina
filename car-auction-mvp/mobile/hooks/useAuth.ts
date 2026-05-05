import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware.js";
import { appStorage } from "@/lib/appStorage";

export interface User {
  id: number;
  username: string;
  email: string;
  phone_number: string | null;
  is_admin: boolean;
  is_dealer: boolean;
  is_rental_company: boolean;
  is_verified: boolean;
  points: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  rememberMe: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setRememberMe: (rememberMe: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      rememberMe: false,
      isLoading: true,
      hasHydrated: false,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, rememberMe: false }),
      setRememberMe: (rememberMe) => set({ rememberMe }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "auth-storage", // unique name
      storage: createJSONStorage(() => appStorage),
      partialize: (state) =>
        state.rememberMe
          ? {
              user: state.user,
              token: state.token,
              rememberMe: true,
            }
          : {
              rememberMe: false,
            },
      onRehydrateStorage: () => (state) => {
        state?.setIsLoading(false);
        state?.setHasHydrated(true);
      },
    }
  )
);
