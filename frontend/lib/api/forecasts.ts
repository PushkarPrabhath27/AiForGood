import { apiClient } from "./client";
import type { ApiResponse, ForecastResponse, HbReadingResponse, HbReadingInput } from "@/../shared/contracts/api.types";

export async function getForecast(patientId: string): Promise<ApiResponse<ForecastResponse>> {
  const response = await apiClient.get<ApiResponse<ForecastResponse>>(`/api/v1/patients/${patientId}/forecast`);
  return response.data;
}

export async function logHbReading(
  patientId: string,
  data: HbReadingInput
): Promise<ApiResponse<HbReadingResponse>> {
  const response = await apiClient.post<ApiResponse<HbReadingResponse>>(
    `/api/v1/patients/${patientId}/hb-reading`,
    data
  );
  return response.data;
}
