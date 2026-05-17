import { apiClient } from "./client";

export function createTradeIn(payload: unknown) {
  return apiClient.post("/trade-in/api", payload);
}

export function getTradeInRequest(requestId: string | number) {
  return apiClient.get(`/trade-in/api/requests/${requestId}`);
}

export function deleteTradeInRequest(requestId: string | number) {
  return apiClient.delete(`/trade-in/api/requests/${requestId}`);
}

export function placeTradeInOffer(
  requestId: string | number,
  payload: { amount: number; notes?: string }
) {
  return apiClient.post(`/trade-in/api/requests/${requestId}/offer`, payload);
}

export function acceptTradeInOffer(
  requestId: string | number,
  offerId: string | number
) {
  return apiClient.post(
    `/trade-in/api/requests/${requestId}/offers/${offerId}/accept`
  );
}

export function getAdminTradeInRequest(requestId: string | number) {
  return apiClient.get(`/trade-in/api/admin/requests/${requestId}`);
}

export function updateAdminTradeInStatus(
  requestId: string | number,
  status: string
) {
  return apiClient.post(`/trade-in/api/admin/requests/${requestId}/status`, {
    status,
  });
}
