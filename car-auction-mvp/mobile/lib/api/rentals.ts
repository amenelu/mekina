import { apiClient } from "./client";

export function getRentalDashboard() {
  return apiClient.get("/seller/api/rental-dashboard");
}

export function getRentalCar(carId: string | number) {
  return apiClient.get(`/seller/api/rental-cars/${carId}`);
}

export function createSellerCar(data: FormData) {
  return apiClient.post("/seller/api/cars", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function updateRentalCar(carId: string | number, data: unknown) {
  return apiClient.put(`/seller/api/rental-cars/${carId}`, data);
}

export function deleteRentalCar(carId: string | number) {
  return apiClient.delete(`/seller/api/rental-cars/${carId}`);
}

export function toggleRentalCarActive(carId: string | number) {
  return apiClient.post(`/seller/api/rental-cars/${carId}/toggle-active`);
}
