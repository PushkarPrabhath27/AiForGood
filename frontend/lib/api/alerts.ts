import { apiClient } from "./client";
import type { ApiResponse } from "@/../shared/contracts/api.types";

export interface NotifyAlertResponse {
  patient_id: string;
  alert_id: string;
  sent: boolean;
  channel: "twilio" | "whatsapp";
  message?: string;
}

export async function notifyAlert(
  patientId: string,
  alertId: string
): Promise<ApiResponse<NotifyAlertResponse>> {
  const response = await apiClient.post<ApiResponse<NotifyAlertResponse>>(
    `/patients/${patientId}/alerts/${alertId}/notify`
  );
  return response.data;
}
