import axios from "axios";
import type { AxiosError } from "axios";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const data = error.response?.data;
    const message =
      data?.message ||
      data?.error ||
      error.message ||
      "Something went wrong. Please try again.";

    return Promise.reject(
      Object.assign(error, {
        userMessage: message,
      })
    );
  }
);

export function apiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function mediaUrl(path?: string | null) {
  if (!path) return null;
  return path.startsWith("http") ? path : apiUrl(path);
}
