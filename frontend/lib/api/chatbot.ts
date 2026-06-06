import { apiClient } from "./client";
import type { ApiResponse, ChatbotMessageRequest, ChatbotMessageResponse } from "@/../shared/contracts/api.types";

export async function sendChatbotMessage(
  payload: ChatbotMessageRequest
): Promise<ApiResponse<ChatbotMessageResponse>> {
  const response = await apiClient.post<ApiResponse<ChatbotMessageResponse>>("/chatbot/message", payload);
  return response.data;
}
