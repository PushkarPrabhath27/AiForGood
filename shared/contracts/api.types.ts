/* eslint-disable */
/**
 * This file contains high-fidelity TypeScript types representing the RaktaSetu NOOR
 * clinical API contracts. Mapped exactly to /shared/contracts/api.schema.json.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  detail?: string;
}

export interface ResponseMeta {
  page?: number;
  per_page?: number;
  total?: number;
  request_id?: string;
  generated_at?: string;
}

export type BloodType = "A" | "B" | "AB" | "O";
export type RhFactor = "+" | "-";
export type BloodGroup = `${BloodType}${RhFactor}`;

export interface Patient {
  id: string; // UUID
  name: string;
  age: number;
  blood_type: BloodType;
  rh_factor: RhFactor;
  kell_negative: boolean;
  duffy_negative: boolean;
  kidd_negative: boolean;
  alloimmunization_flag: boolean;
  hospital_id: string;
  enrolled_at: string; // ISO datetime
  next_transfusion_predicted: string | null; // ISO date
  hb_current: number | null; // g/dL
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
}

export interface PatientDetail extends Patient {
  demographics_verified: boolean;
  phenotype_flags_verified: boolean;
}

export interface HbReading {
  id: string;
  patient_id: string;
  hb_value: number; // g/dL
  reading_date: string; // ISO date
  post_transfusion: boolean;
  units_transfused: number | null;
  hb_rise_per_unit: number | null; // computed
}

export interface HbReadingResponse extends HbReading {
  message?: string;
}

export interface HbReadingInput {
  hb_value: number; // 0.0-20.0 g/dL
  reading_date: string; // ISO date
  post_transfusion: boolean;
  units_transfused?: number; // 1-10
}

export type AlertType =
  | "iron_overload"
  | "alloimmunization"
  | "rapid_decline"
  | "circle_degraded"
  | "inventory_shortage";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertFlag {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  recommended_action: string;
  detected_at: string; // ISO datetime;
}

export interface ForecastPoint {
  date: string; // ISO date
  hb_predicted: number; // g/dL
  ci_lower: number;
  ci_upper: number;
}

export type ForecastStatus = "success" | "insufficient_data" | "model_error" | "cached";

export interface ForecastResponse {
  patient_id: string;
  historical_readings: HbReading[];
  forecast_points: ForecastPoint[];
  predicted_transfusion_date: string; // ISO date
  confidence_lower: string; // ISO date
  confidence_upper: string; // ISO date
  confidence_pct: number; // 0-100
  alert_flags: AlertFlag[];
  model_version: string;
  generated_at: string; // ISO datetime
  status: ForecastStatus;
}

export type GuardianRole = "primary" | "secondary" | "rare_specialist";
export type GuardianStatus = "active" | "cooldown" | "pending" | "unavailable" | "empty";
export type MobilizationStatus = "idle" | "active" | "confirmed" | "failed" | "not_needed";

export interface Guardian {
  id: string;
  name: string;
  phone_last4: string; // Masked: "****1234"
  telegram_chat_id?: string | null;
  role: GuardianRole;
  status: GuardianStatus;
  last_donation_date: string | null; // ISO date
  next_eligible_date: string | null; // ISO date
  donation_count: number;
  response_latency_avg_hours: number;
  preferred_language: string; // ISO 639-1, e.g. "te"
}

export interface GuardianCircleResponse {
  patient_id: string;
  coverage_score: number; // 0-100
  engagement_score: number; // 0-100
  resilience_score: number; // 0-100
  mobilization_status: MobilizationStatus;
  days_to_transfusion: number | null;
  guardians: Guardian[];
}

export interface MobilizationStatusResponse {
  patient_id: string;
  mobilization_status: MobilizationStatus;
  active_channels: string[];
  contacted_count: number;
  message?: string;
}

export type HealthStatus = "green" | "yellow" | "red";

export interface BloodBankNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: HealthStatus;
  inventory_summary: Partial<Record<BloodGroup, number>>;
  last_sync_at: string; // ISO datetime
  is_stale: boolean;
}

export type MatchUrgency = "routine" | "urgent" | "critical";
export type MatchStatus = "pending" | "approved" | "rejected" | "completed";

export interface InventoryMatch {
  id: string;
  patient_id: string;
  patient_name: string;
  bank_id: string;
  bank_name: string;
  blood_group: BloodGroup;
  extended_phenotype_match: boolean;
  units_available: number;
  expiry_date: string; // ISO date
  days_until_expiry: number;
  urgency: MatchUrgency;
  distance_km: number;
  recommended_action: string;
  status: MatchStatus;
}

export interface TypeCoverage {
  units_available: number;
  days_covered: number;
  status: HealthStatus;
}

export interface CityInventoryResponse {
  city_code: string;
  city_health_score: number; // 0-100
  health_status: HealthStatus;
  last_optimized_at: string; // ISO datetime
  blood_banks: BloodBankNode[];
  active_matches: InventoryMatch[];
  coverage_by_type: Record<BloodGroup, TypeCoverage>;
}

export interface ChatbotMessageRequest {
  message: string;
  patient_id?: string;
  guardian_id?: string;
  language?: string;
}

export interface ChatbotMessageResponse {
  reply: string;
  intent?: string;
  context_detected?: Record<string, any>;
  suggestions?: string[];
}
