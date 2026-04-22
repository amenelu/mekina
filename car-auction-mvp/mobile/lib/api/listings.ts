import { apiClient } from "./client";

export function getListing(id: string | number) {
  return apiClient.get(`/api/cars/${id}`);
}

export function getListings(params?: Record<string, string | number | boolean>) {
  return apiClient.get("/api/listings", { params });
}

export function toggleFavorite(carId: string | number) {
  return apiClient.post(`/api/cars/${carId}/toggle-favorite`);
}
