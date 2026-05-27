import { apiClient } from "./client";
import type { User } from "@/hooks/useAuth";

export interface LoginResponse {
  token: string;
  user: User;
}

export function login(login: string, password: string, fcmToken?: string) {
  return apiClient.post<LoginResponse>("/auth/api/login", {
    login,
    password,
    ...(fcmToken ? { fcm_token: fcmToken } : {}),
  });
}

export function register(payload: {
  username: string;
  email: string;
  password: string;
  password2: string;
  phone_number?: string;
}) {
  return apiClient.post("/auth/api/register", payload);
}

export function changePassword(payload: {
  current_password: string;
  new_password: string;
  new_password2: string;
}) {
  return apiClient.post("/auth/api/change-password", payload);
}
