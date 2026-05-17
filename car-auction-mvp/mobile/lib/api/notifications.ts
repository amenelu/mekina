import { apiClient } from "./client";

export function getNotifications() {
  return apiClient.get("/api/notifications");
}

export function getUnreadCounts() {
  return apiClient.get("/api/unread-counts");
}
