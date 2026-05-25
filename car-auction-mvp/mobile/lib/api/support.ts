import { apiClient } from "./client";

export function submitSupportQuestion(payload: {
  name?: string;
  email?: string;
  question: string;
}) {
  return apiClient.post("/api/support-question", payload);
}
