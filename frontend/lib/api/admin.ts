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

export async function reengageGuardian(guardianId: string): Promise<ApiResponse<any>> {
  const response = await apiClient.post<ApiResponse<any>>(`/guardians/${guardianId}/reengage`);
  return response.data;
}

export async function routeMatch(donorId: string, patientId: string): Promise<ApiResponse<any>> {
  const response = await apiClient.post<ApiResponse<any>>(`/graph/route`, {
    donor_id: donorId,
    patient_id: patientId,
  });
  return response.data;
}

