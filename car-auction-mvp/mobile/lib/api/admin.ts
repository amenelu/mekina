import { apiClient } from "./client";
import type {
  AdminDashboardStats,
  AdminDealer,
  AdminListing,
  AdminPendingListing,
  AdminRental,
  AdminTradeInRequest,
} from "./types";

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  pending_approvals: AdminPendingListing[];
  pending_trade_ins: AdminTradeInRequest[];
}

export function getAdminDashboard() {
  return apiClient.get<AdminDashboardResponse>("/admin/api/dashboard");
}

export function approveAdminListing(carId: string | number) {
  return apiClient.post(`/admin/api/listings/${carId}`, { action: "approve" });
}

export function getAdminListings(search?: string) {
  return apiClient.get<{ cars: AdminListing[] }>("/auctions/api/admin/listings", {
    params: search ? { q: search } : undefined,
  });
}

export function deleteAdminListing(carId: string | number) {
  return apiClient.delete(`/admin/api/listings/${carId}`);
}

export function getAdminDealers(search?: string) {
  return apiClient.get<{ dealers: AdminDealer[] }>("/admin/api/dealers", {
    params: search ? { q: search } : undefined,
  });
}

export function getAdminRentals(search?: string) {
  return apiClient.get<{ cars: AdminRental[] }>("/admin/api/rentals", {
    params: search ? { q: search } : undefined,
  });
}

export function getAdminUsers(search?: string) {
  return apiClient.get("/admin/api/users", {
    params: search ? { q: search } : undefined,
  });
}

export function getAdminUser(userId: string | number) {
  return apiClient.get(`/admin/api/users/${userId}`);
}

export function updateAdminUser(userId: string | number, data: unknown) {
  return apiClient.put(`/admin/api/users/${userId}`, data);
}

export function deleteAdminUser(userId: string | number) {
  return apiClient.delete(`/admin/api/users/${userId}`);
}

export function resetAdminUserPassword(userId: string | number) {
  return apiClient.post(`/admin/api/users/${userId}/password-reset`);
}

export function getAdminListing(carId: string | number) {
  return apiClient.get(`/admin/api/listings/${carId}`);
}

export function updateAdminListing(carId: string | number, data: unknown) {
  return apiClient.put(`/admin/api/listings/${carId}`, data);
}

export function saveAdminListingForm(carId: string | number, data: FormData) {
  return apiClient.post(`/admin/api/listings/${carId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function deleteAdminListingImage(
  carId: string | number,
  imageId: string | number
) {
  return apiClient.delete(`/admin/api/listings/${carId}/images/${imageId}`);
}

export function reorderAdminListingImages(
  carId: string | number,
  imageIds: Array<string | number>
) {
  return apiClient.post(`/admin/api/listings/${carId}/images/reorder`, {
    image_ids: imageIds,
  });
}

export function resolveDealerPointRequests(
  dealerId: string | number,
  action: "accept" | "deny"
) {
  return apiClient.post(`/admin/api/dealers/${dealerId}/point-requests`, {
    action,
  });
}

export function getAdminPointRequests() {
  return apiClient.get("/admin/api/point-requests");
}
