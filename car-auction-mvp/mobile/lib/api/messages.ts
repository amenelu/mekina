import { apiClient } from "./client";

export function getMyMessages() {
  return apiClient.get("/api/my-messages");
}

export function getConversation(conversationId: string | number) {
  return apiClient.get(`/api/my-messages/${conversationId}`);
}

export function getChatHistory(carId: string | number) {
  return apiClient.get(`/chat/history/${carId}`);
}

export function sendChatMessage(payload: {
  body?: string;
  message?: string;
  conversation_id?: string | number;
  car_id?: string | number;
  receiver_id?: string | number;
}) {
  return apiClient.post("/chat/send", {
    ...payload,
    message: payload.message ?? payload.body,
  });
}
