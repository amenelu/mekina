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
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  return apiClient.put(`/seller/api/rental-cars/${carId}`, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
}

export function deleteRentalCar(carId: string | number) {
  return apiClient.delete(`/seller/api/rental-cars/${carId}`);
}

export function deleteRentalCarImage(
  carId: string | number,
  imageId: string | number
) {
  return apiClient.delete(`/seller/api/rental-cars/${carId}/images/${imageId}`);
}

export function toggleRentalCarActive(carId: string | number) {
  return apiClient.post(`/seller/api/rental-cars/${carId}/toggle-active`);
}
