import { apiClient } from "./client";
import type { ApiResponse, CityInventoryResponse } from "@/../shared/contracts/api.types";

export async function getCityInventory(cityCode: string): Promise<ApiResponse<CityInventoryResponse>> {
  const response = await apiClient.get<ApiResponse<CityInventoryResponse>>(`/api/v1/grid/city/${cityCode}`);
  return response.data;
}

export async function approveMatch(matchId: string): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>(`/api/v1/grid/matches/${matchId}/approve`);
  return response.data;
}
