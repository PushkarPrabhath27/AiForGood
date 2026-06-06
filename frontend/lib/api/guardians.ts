import { apiClient } from "./client";
import type { ApiResponse, GuardianCircleResponse, MobilizationStatusResponse, Guardian } from "@/../shared/contracts/api.types";

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

export async function updateGuardian(
  patientId: string,
  guardianId: string,
  data: { telegram_chat_id?: string; preferred_language?: string }
): Promise<ApiResponse<Guardian>> {
  const response = await apiClient.patch<ApiResponse<Guardian>>(
    `/api/v1/patients/${patientId}/guardians/${guardianId}`,
    data
  );
  return response.data;
}

export async function sendGuardianMessage(
  patientId: string,
  guardianId: string,
  message?: string
): Promise<ApiResponse<any>> {
  const response = await apiClient.post<ApiResponse<any>>(
    `/api/v1/patients/${patientId}/guardians/${guardianId}/message`,
    { message }
  );
  return response.data;
}

