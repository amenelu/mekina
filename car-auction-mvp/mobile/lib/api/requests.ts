import { apiClient } from "./client";

export function getMyRequests() {
  return apiClient.get("/requests/api/requests");
}

export function getRequestLimit() {
  return apiClient.get<{
    limit: number;
    used: number;
    remaining: number;
    can_create_request: boolean;
    message?: string | null;
  }>("/requests/api/request-limit");
}

export function createRequest(payload: unknown) {
  return apiClient.post("/requests/api/requests", payload);
}

export function createRequestForm(data: FormData) {
  return apiClient.post("/requests/api/requests", data);
}

export function deleteRequest(requestId: string | number) {
  return apiClient.delete(`/requests/api/requests/${requestId}`);
}

export function getRequestDetail(requestId: string | number) {
  return apiClient.get(`/requests/api/requests/${requestId}`);
}

export function compareBids(requestId?: string | number) {
  return apiClient.get("/requests/api/bids/compare", {
    params: requestId ? { request_id: requestId } : undefined,
  });
}

export function compareSelectedBids(ids: string) {
  return apiClient.get("/requests/api/bids/compare", {
    params: { ids },
  });
}

export function askDealerQuestion(
  bidId: string | number,
  questionText: string
) {
  return apiClient.post(`/requests/api/bid/${bidId}/ask`, {
    question_text: questionText,
  });
}

export function acceptOffer(
  bidId: string | number,
  paymentMethod?: string | null
) {
  return apiClient.post(`/requests/api/offer/${bidId}/accept`, {
    payment_method: paymentMethod,
  });
}

export function getDeal(dealId: string | number) {
  return apiClient.get(`/requests/api/deals/${dealId}`);
}

export function completeDeal(dealId: string | number) {
  return apiClient.post(`/requests/api/deals/${dealId}/complete`);
}

export function requestDealCompletion(dealId: string | number) {
  return apiClient.post(`/requests/api/deals/${dealId}/request-completion`);
}

export function rateDeal(
  dealId: string | number,
  payload: { rating: number; comment?: string }
) {
  return apiClient.post(`/requests/api/deals/${dealId}/rate`, payload);
}
