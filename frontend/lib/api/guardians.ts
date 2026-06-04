import { apiClient } from "./client";
import type { ApiResponse, GuardianCircleResponse, MobilizationStatusResponse } from "@/../shared/contracts/api.types";

export async function getGuardianCircle(patientId: string): Promise<ApiResponse<GuardianCircleResponse>> {
  const response = await apiClient.get<ApiResponse<GuardianCircleResponse>>(
    `/api/v1/patients/${patientId}/guardian-circle`
  );
  return response.data;
}

export async function mobilizeCircle(patientId: string): Promise<ApiResponse<MobilizationStatusResponse>> {
  const response = await apiClient.post<ApiResponse<MobilizationStatusResponse>>(
    `/api/v1/patients/${patientId}/guardian-circle/mobilize`
  );
  return response.data;
}
