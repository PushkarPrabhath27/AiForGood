import { apiClient } from "./client";
import type { ApiResponse } from "@/../shared/contracts/api.types";

export async function getChurnRisk(): Promise<ApiResponse<any[]>> {
  const response = await apiClient.get<ApiResponse<any[]>>("/admin/churn-risk");
  return response.data;
}

export async function getCrossCompatibility(): Promise<ApiResponse<any[]>> {
  const response = await apiClient.get<ApiResponse<any[]>>("/admin/cross-compatibility");
  return response.data;
}
