import { apiClient } from "./client";
import type { ApiResponse, PatientListResponse, Patient } from "@/../shared/contracts/api.types";

export async function getPatients(): Promise<ApiResponse<PatientListResponse>> {
  const response = await apiClient.get<ApiResponse<PatientListResponse>>("/patients");
  return response.data;
}

export async function getPatient(patientId: string): Promise<ApiResponse<Patient>> {
  const response = await apiClient.get<ApiResponse<Patient>>(`/patients/${patientId}`);
  return response.data;
}

export async function resetDemo(): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>("/reset-demo");
  return response.data;
}
