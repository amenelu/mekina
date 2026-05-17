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

export function getHome() {
  return apiClient.get("/api/home");
}

export function getTrendingSearches() {
  return apiClient.get("/api/trending-searches");
}

export function logSearch(query: string) {
  return apiClient.post("/api/log-search", { q: query });
}

export function getCompareListings(ids: string) {
  return apiClient.get("/api/compare", { params: { ids } });
}

export function getUserFavorites() {
  return apiClient.get("/api/users/favorites");
}
