import { apiClient } from "./client";
import type { ApiResponse, MoodLog, MoodLogListResponse, MoodCheckTriggerResponse } from "@/../shared/contracts/api.types";

export async function triggerMoodCheck(patientId: string): Promise<ApiResponse<MoodCheckTriggerResponse>> {
  const response = await apiClient.post<ApiResponse<MoodCheckTriggerResponse>>(`/api/v1/mood/trigger/${patientId}`);
  return response.data;
}

export async function getMoodLogs(patientId: string, limit: number = 20): Promise<ApiResponse<MoodLogListResponse>> {
  const response = await apiClient.get<ApiResponse<MoodLogListResponse>>(`/api/v1/mood/logs/${patientId}`, {
    params: { limit },
  });
  return response.data;
}

export async function getLatestMood(patientId: string): Promise<ApiResponse<MoodLog>> {
  const response = await apiClient.get<ApiResponse<MoodLog>>(`/api/v1/mood/logs/${patientId}/latest`);
  return response.data;
}
