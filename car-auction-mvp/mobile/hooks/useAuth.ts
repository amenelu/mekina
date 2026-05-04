import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

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
  login: (user: User, token: string) => void;
  logout: () => void;
  setRememberMe: (rememberMe: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      rememberMe: false,
      isLoading: true,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, rememberMe: false }),
      setRememberMe: (rememberMe) => set({ rememberMe }),
      setIsLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "auth-storage", // unique name
      storage: createJSONStorage(() => secureStorage),
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
      },
    }
  )
);
