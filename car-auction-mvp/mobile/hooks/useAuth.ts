import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "auth-storage", // unique name
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
