import { apiClient } from "./client";

export function getDealerDashboard() {
  return apiClient.get("/dealer/api/dashboard");
}

export function getDealerPopularRequests() {
  return apiClient.get("/dealer/api/analytics/popular-requests");
}

export function getDealerPopularSearches() {
  return apiClient.get("/dealer/api/analytics/popular-searches");
}

export function getDealerMostLikedCars() {
  return apiClient.get("/dealer/api/analytics/most-liked-cars");
}

export function getDealerAdvancedAnalytics() {
  return apiClient.get("/dealer/api/analytics/advanced");
}

export function getDealerClosedDeals() {
  return apiClient.get("/dealer/api/closed-deals");
}

export function requestDealerPoints(requestedPoints: number) {
  return apiClient.post("/dealer/api/points/request", {
    requested_points: requestedPoints,
  });
}

export function unlockDealerConversation(conversationId: string | number) {
  return apiClient.post(`/dealer/api/messages/${conversationId}/unlock`);
}

export function getDealerProfile(dealerId: string | number) {
  return apiClient.get(`/dealer/api/dealers/${dealerId}/profile`);
}

export function getDealerRequestBids(requestId: string | number) {
  return apiClient.get(`/dealer/api/requests/${requestId}/bids`);
}

export function placeDealerBid(requestId: string | number, data: unknown) {
  return apiClient.post(`/dealer/api/requests/${requestId}/bids`, data);
}

export function updateDealerBid(bidId: string | number, data: unknown) {
  return apiClient.put(`/dealer/api/bids/${bidId}`, data);
}

export function getDealerUnansweredRequestQuestions() {
  return apiClient.get("/dealer/api/request-questions/unanswered");
}

export function answerDealerRequestQuestion(
  questionId: string | number,
  answerText: string
) {
  return apiClient.post(`/dealer/api/request-questions/${questionId}/answer`, {
    answer_text: answerText,
  });
}

export function updateDealerCar(carId: string | number, data: unknown) {
  return apiClient.put(`/dealer/api/cars/${carId}/update`, data);
}
