import { DEMO } from "../constants";
import type {
  Patient,
  PatientListResponse,
  HbReading,
  ForecastResponse,
  ForecastPoint,
  GuardianCircleResponse,
  Guardian,
  CityInventoryResponse,
  BloodBankNode,
  InventoryMatch,
  AlertFlag
} from "@/../shared/contracts/api.types";

// ==========================================
// 1. Core Patient Fixtures
// ==========================================
export const mockPatients: Patient[] = [
  {
    id: DEMO.PRIYA_ID,
    name: "Priya Sharma",
    age: 9,
    blood_type: "B",
    rh_factor: "+",
    kell_negative: true,
    duffy_negative: false,
    kidd_negative: false,
    alloimmunization_flag: false,
    hospital_id: "hospital_niloufer_hyd",
    enrolled_at: "2023-08-01T00:00:00Z",
    next_transfusion_predicted: "2024-11-03",
    hb_current: 7.2,
    status: "active",
  },
  {
    id: DEMO.VIKRAM_ID,
    name: "Vikram Reddy",
    age: 14,
    blood_type: "B",
    rh_factor: "+",
    kell_negative: true,
    duffy_negative: true,
    kidd_negative: false,
    alloimmunization_flag: true,
    hospital_id: "hospital_niloufer_hyd",
    enrolled_at: "2023-10-15T00:00:00Z",
    next_transfusion_predicted: "2024-11-07",
    hb_current: 6.8,
    status: "active",
  },
];

export const mockPatientList: PatientListResponse = {
  patients: mockPatients,
  total: 2,
  page: 1,
};

// ==========================================
// 2. Priya's Hb Sawtooth Reading Generation (14 Months)
// ==========================================
function generatePriyaHbHistory(): HbReading[] {
  const readings: HbReading[] = [];
  const cycleDays = 21;
  const numCycles = 20; // ~14 months
  
  // Starting 14 months ago (August 2023)
  let startDate = new Date(2023, 7, 1); // Aug 1, 2023
  let readingIdCounter = 1;

  for (let c = 0; c < numCycles; c++) {
    // Each cycle has pre-transfusion (Hb ~6.8) and post-transfusion (Hb ~10.5)
    // Monsoon dips (Aug - Oct)
    const seasonalModifier = (c >= 1 && c <= 3) || (c >= 17 && c <= 19) ? -0.4 : 0.0;
    
    const preDateStr = startDate.toISOString().split("T")[0]!;
    readings.push({
      id: `reading_${readingIdCounter++}`,
      patient_id: DEMO.PRIYA_ID,
      hb_value: Number((6.8 + seasonalModifier + Math.random() * 0.3).toFixed(1)),
      reading_date: preDateStr,
      post_transfusion: false,
      units_transfused: null,
      hb_rise_per_unit: null,
    });

    // Post transfusion happens next day
    const postDate = new Date(startDate);
    postDate.setDate(postDate.getDate() + 1);
    const postDateStr = postDate.toISOString().split("T")[0]!;
    
    readings.push({
      id: `reading_${readingIdCounter++}`,
      patient_id: DEMO.PRIYA_ID,
      hb_value: Number((10.5 + Math.random() * 0.4).toFixed(1)),
      reading_date: postDateStr,
      post_transfusion: true,
      units_transfused: 2,
      hb_rise_per_unit: Number((1.8 + Math.random() * 0.2).toFixed(2)),
    });

    // Advance to next cycle start
    startDate.setDate(startDate.getDate() + cycleDays);
  }

  // Add final current readings leading to today (Oct 20, 2024)
  // Last transfusion was Oct 13, 2024
  readings.push({
    id: `reading_last_pre`,
    patient_id: DEMO.PRIYA_ID,
    hb_value: 6.9,
    reading_date: "2024-10-12",
    post_transfusion: false,
    units_transfused: null,
    hb_rise_per_unit: null,
  });

  readings.push({
    id: `reading_last_post`,
    patient_id: DEMO.PRIYA_ID,
    hb_value: 10.6,
    reading_date: "2024-10-13",
    post_transfusion: true,
    units_transfused: 2,
    hb_rise_per_unit: 1.85,
  });

  // Current reading today (Oct 20, 2024)
  readings.push({
    id: `reading_current`,
    patient_id: DEMO.PRIYA_ID,
    hb_value: 7.2,
    reading_date: "2024-10-20",
    post_transfusion: false,
    units_transfused: null,
    hb_rise_per_unit: null,
  });

  return readings;
}

export const priyaHistoricalReadings = generatePriyaHbHistory();

// ==========================================
// 3. Priya's Prophet Forecast Curve & Alerts
// ==========================================
function generatePriyaForecast(): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  const startVal = 7.2;
  const decayRate = 0.17; // decay per day

  // October 20th to November 20th (30 days forecast horizon)
  for (let i = 1; i <= 30; i++) {
    const forecastDate = new Date(2024, 9, 20); // Oct 20
    forecastDate.setDate(forecastDate.getDate() + i);
    const dateStr = forecastDate.toISOString().split("T")[0]!;

    const hbPredicted = Number((startVal - decayRate * i).toFixed(1));
    const ciDelta = 0.1 * i; // confidence interval spreads over time

    points.push({
      date: dateStr,
      hb_predicted: Math.max(5.0, hbPredicted),
      ci_lower: Math.max(4.5, Number((hbPredicted - ciDelta).toFixed(1))),
      ci_upper: Math.max(5.5, Number((hbPredicted + ciDelta).toFixed(1))),
    });
  }

  return points;
}

export const priyaForecastPoints = generatePriyaForecast();

export const priyaAlertFlags: AlertFlag[] = [
  {
    type: "circle_degraded",
    severity: "info",
    message: "Guardian circle active — 7 active guardians secured for transfusion cycle.",
    recommended_action: "None required. Raju is in cooldown, Suresh is under pulsing mobilization check.",
    detected_at: "2024-10-20T08:00:00Z",
  },
  {
    type: "iron_overload",
    severity: "warning",
    message: "Ferritin levels trending higher (2,530 ng/mL). Heavy accumulation anomaly detected.",
    recommended_action: "Generate Saathi Doctor Report draft for Niloufer Hospital coordination.",
    detected_at: "2024-10-20T08:15:00Z",
  },
  {
    type: "alloimmunization",
    severity: "info",
    message: "No alloimmunization anomalies detected in the current cycle.",
    recommended_action: "Standard phenotype matched inventory search remains active.",
    detected_at: "2024-10-20T08:00:00Z",
  },
];

export const priyaForecastPayload: ForecastResponse = {
  patient_id: DEMO.PRIYA_ID,
  historical_readings: priyaHistoricalReadings,
  forecast_points: priyaForecastPoints,
  predicted_transfusion_date: "2024-11-03",
  confidence_lower: "2024-11-01",
  confidence_upper: "2024-11-05",
  confidence_pct: 89,
  alert_flags: priyaAlertFlags,
  model_version: "noor-prophet-v1.4.2",
  generated_at: "2024-10-20T10:00:00Z",
  status: "success",
};

function generateVikramHbHistory(): HbReading[] {
  const readings: HbReading[] = [];
  const cycleDays = 21;
  const numCycles = 8; // ~6 months
  
  let startDate = new Date(2024, 4, 1); // May 1, 2024
  let readingIdCounter = 100;

  for (let c = 0; c < numCycles; c++) {
    const preDateStr = startDate.toISOString().split("T")[0]!;
    readings.push({
      id: `v_reading_${readingIdCounter++}`,
      patient_id: DEMO.VIKRAM_ID,
      hb_value: Number((6.6 + Math.random() * 0.3).toFixed(1)),
      reading_date: preDateStr,
      post_transfusion: false,
      units_transfused: null,
      hb_rise_per_unit: null,
    });

    const postDate = new Date(startDate);
    postDate.setDate(postDate.getDate() + 1);
    const postDateStr = postDate.toISOString().split("T")[0]!;
    
    // Vikram's later cycles show drops under 1.2 g/dL (alloimmunization delta drop)
    const isAnomaly = c >= 5;
    const risePerUnit = isAnomaly ? 0.9 : 1.85;

    readings.push({
      id: `v_reading_${readingIdCounter++}`,
      patient_id: DEMO.VIKRAM_ID,
      hb_value: Number((6.6 + risePerUnit * 2).toFixed(1)),
      reading_date: postDateStr,
      post_transfusion: true,
      units_transfused: 2,
      hb_rise_per_unit: risePerUnit,
    });

    startDate.setDate(startDate.getDate() + cycleDays);
  }

  // Current reading today (Oct 20, 2024)
  readings.push({
    id: `v_reading_current`,
    patient_id: DEMO.VIKRAM_ID,
    hb_value: 6.8,
    reading_date: "2024-10-20",
    post_transfusion: false,
    units_transfused: null,
    hb_rise_per_unit: null,
  });

  return readings;
}

export const vikramHistoricalReadings = generateVikramHbHistory();

// Vikram's simpler forecast showing alloimmunization
export const vikramForecastPayload: ForecastResponse = {
  patient_id: DEMO.VIKRAM_ID,
  historical_readings: vikramHistoricalReadings,

  forecast_points: [
    {
      date: "2024-10-21",
      hb_predicted: 6.7,
      ci_lower: 6.5,
      ci_upper: 6.9,
    },
    {
      date: "2024-11-07",
      hb_predicted: 5.2,
      ci_lower: 4.5,
      ci_upper: 5.9,
    },
  ],
  predicted_transfusion_date: "2024-11-07",
  confidence_lower: "2024-11-05",
  confidence_upper: "2024-11-09",
  confidence_pct: 92,
  alert_flags: [
    {
      type: "alloimmunization",
      severity: "critical",
      message: "Severe Alloimmunization suspected. Sequential CUSUM delta shift has breached safety threshold (Rise/unit: 0.9 g/dL).",
      recommended_action: "Switch transfer query filters to extended Kell-negative matching phenotype bank networks.",
      detected_at: "2024-10-20T09:12:00Z",
    },
    {
      type: "inventory_shortage",
      severity: "warning",
      message: "Local blood bank inventory contains 0 Kell-negative units in Niloufer partner banks.",
      recommended_action: "Trigger RaktaGrid city-wide inter-bank transfer query mapping.",
      detected_at: "2024-10-20T09:15:00Z",
    },
  ],
  model_version: "noor-cusum-v1.0.3",
  generated_at: "2024-10-20T10:00:00Z",
  status: "success",
};

// ==========================================
// 4. Guardian Circle Fixtures
// ==========================================
export const mockGuardians: Guardian[] = [
  {
    id: DEMO.GUARDIAN_RAJU_ID,
    name: "Raju Prasad",
    phone_last4: "8821",
    role: "primary",
    status: "cooldown",
    last_donation_date: "2024-09-10",
    next_eligible_date: "2024-12-10",
    donation_count: 5,
    response_latency_avg_hours: 1.5,
    preferred_language: "te",
    cusum_score: 0.12,
    engagement_trend: "stable",
    annual_donation_count: 6,
    fatigue_ceiling: 6,
    is_eligible: false,
    fatigue_rest_until: "2026-03-15",
  },
  {
    id: DEMO.GUARDIAN_SURESH_ID,
    name: "Suresh Kumar",
    phone_last4: "4920",
    role: "primary",
    status: "pending",
    last_donation_date: null,
    next_eligible_date: "2024-10-20",
    donation_count: 0,
    response_latency_avg_hours: 8.2,
    preferred_language: "hi",
    cusum_score: 0.38,
    engagement_trend: "declining",
    annual_donation_count: 2,
    fatigue_ceiling: 6,
    is_eligible: true,
    fatigue_rest_until: null,
  },
  {
    id: "guardian_anita",
    name: "Anita Deshmukh",
    phone_last4: "1192",
    role: "primary",
    status: "active",
    last_donation_date: "2024-05-12",
    next_eligible_date: "2024-08-12",
    donation_count: 8,
    response_latency_avg_hours: 0.8,
    preferred_language: "mr",
    cusum_score: 0.05,
    engagement_trend: "stable",
    annual_donation_count: 4,
    fatigue_ceiling: 6,
    is_eligible: true,
    fatigue_rest_until: null,
  },
  {
    id: "guardian_mani",
    name: "Mani Ratnam",
    phone_last4: "3022",
    role: "secondary",
    status: "active",
    last_donation_date: "2024-06-20",
    next_eligible_date: "2024-09-20",
    donation_count: 4,
    response_latency_avg_hours: 2.1,
    preferred_language: "ta",
    cusum_score: 0.02,
    engagement_trend: "stable",
    annual_donation_count: 3,
    fatigue_ceiling: 6,
    is_eligible: true,
    fatigue_rest_until: null,
  },
  {
    id: "guardian_preet",
    name: "Preet Singh",
    phone_last4: "9910",
    role: "secondary",
    status: "active",
    last_donation_date: "2024-04-18",
    next_eligible_date: "2024-07-18",
    donation_count: 3,
    response_latency_avg_hours: 3.5,
    preferred_language: "te",
    cusum_score: 0.08,
    engagement_trend: "stable",
    annual_donation_count: 1,
    fatigue_ceiling: 6,
    is_eligible: true,
    fatigue_rest_until: null,
  },
  {
    id: "guardian_kavya",
    name: "Kavya Hegde",
    phone_last4: "2201",
    role: "secondary",
    status: "active",
    last_donation_date: "2024-03-05",
    next_eligible_date: "2024-06-05",
    donation_count: 6,
    response_latency_avg_hours: 1.2,
    preferred_language: "kn",
    cusum_score: 0.04,
    engagement_trend: "stable",
    annual_donation_count: 2,
    fatigue_ceiling: 6,
    is_eligible: true,
    fatigue_rest_until: null,
  },
  {
    id: "guardian_ravi",
    name: "Ravi Teja",
    phone_last4: "5055",
    role: "rare_specialist",
    status: "active",
    last_donation_date: "2024-02-14",
    next_eligible_date: "2024-05-14",
    donation_count: 2,
    response_latency_avg_hours: 4.8,
    preferred_language: "te",
    cusum_score: 0.11,
    engagement_trend: "stable",
    annual_donation_count: 1,
    fatigue_ceiling: 6,
    is_eligible: true,
    fatigue_rest_until: null,
  },
  {
    id: "guardian_divya",
    name: "Divya Nair",
    phone_last4: "7103",
    role: "rare_specialist",
    status: "active",
    last_donation_date: "2024-01-20",
    next_eligible_date: "2024-04-20",
    donation_count: 4,
    response_latency_avg_hours: 2.6,
    preferred_language: "ml",
    cusum_score: 0.07,
    engagement_trend: "stable",
    annual_donation_count: 2,
    fatigue_ceiling: 6,
    is_eligible: true,
    fatigue_rest_until: null,
  },
];

export const mockGuardianCircle: GuardianCircleResponse = {
  patient_id: DEMO.PRIYA_ID,
  coverage_score: 88,
  engagement_score: 94,
  resilience_score: 87,
  mobilization_status: "active",
  days_to_transfusion: 14, // Nov 3 relative to Oct 20
  guardians: mockGuardians,
};

// ==========================================
// 5. RaktaGrid City Inventory Fixtures
// ==========================================
export const mockBloodBanks: BloodBankNode[] = [
  {
    id: DEMO.BANK_APOLLO_ID,
    name: "Apollo Blood Bank, Jubilee Hills",
    lat: 17.4265,
    lng: 78.4121,
    status: "yellow",
    inventory_summary: {
      "A+": 12,
      "B+": 2, // low B+ stock
      "O-": 4,
    },
    last_sync_at: "2024-10-20T09:30:00Z",
    is_stale: false,
  },
  {
    id: DEMO.BANK_YASHODA_ID,
    name: "Yashoda Blood Center, Secunderabad",
    lat: 17.4428,
    lng: 78.5012,
    status: "green",
    inventory_summary: {
      "A+": 25,
      "B+": 18,
      "O+": 10,
    },
    last_sync_at: "2024-10-20T09:15:00Z",
    is_stale: false,
  },
  {
    id: "bank_kims",
    name: "KIMS Blood Bank, Begumpet",
    lat: 17.4334,
    lng: 78.4735,
    status: "green",
    inventory_summary: {
      "B+": 14,
      "O-": 8,
      "AB+": 6,
    },
    last_sync_at: "2024-10-20T08:00:00Z",
    is_stale: false,
  },
  {
    id: "bank_care",
    name: "Care Hospital Blood Bank, Nampally",
    lat: 17.3912,
    lng: 78.4688,
    status: "red",
    inventory_summary: {
      "B+": 1,
      "A-": 2,
    },
    last_sync_at: "2024-10-19T07:30:00Z",
    is_stale: true, // stale over 24h
  },
  {
    id: "bank_rainbow",
    name: "Rainbow Children's Blood Depot",
    lat: 17.4128,
    lng: 78.4485,
    status: "green",
    inventory_summary: {
      "A+": 10,
      "B+": 8,
      "O-": 2,
    },
    last_sync_at: "2024-10-20T09:00:00Z",
    is_stale: false,
  },
];

export const mockMatches: InventoryMatch[] = [
  {
    id: "match_vikram_apollo",
    patient_id: DEMO.VIKRAM_ID,
    patient_name: "Vikram Reddy",
    bank_id: DEMO.BANK_APOLLO_ID,
    bank_name: "Apollo Blood Bank, Jubilee Hills",
    blood_group: "B+",
    extended_phenotype_match: true, // Kell-negative matched!
    units_available: 2,
    expiry_date: "2024-11-05",
    days_until_expiry: 5, // Nov 5 relative to Oct 20 setup
    urgency: "urgent",
    distance_km: 4.2,
    recommended_action: "Approve transfer of 2 B+ Kell-negative units from Apollo to Niloufer Care Team immediately.",
    status: "pending",
  },
];

export const mockCityInventory: CityInventoryResponse = {
  city_code: DEMO.CITY_CODE,
  city_health_score: 72,
  health_status: "green",
  last_optimized_at: "2024-10-20T10:00:00Z",
  blood_banks: mockBloodBanks,
  active_matches: mockMatches,
  coverage_by_type: {
    "A+": { units_available: 47, days_covered: 18, status: "green" },
    "B+": { units_available: 43, days_covered: 14, status: "green" },
    "O-": { units_available: 14, days_covered: 8, status: "yellow" },
    "O+": { units_available: 10, days_covered: 5, status: "yellow" },
    "AB+": { units_available: 6, days_covered: 12, status: "green" },
    "A-": { units_available: 2, days_covered: 3, status: "red" },
    "B-": { units_available: 0, days_covered: 0, status: "red" },
    "AB-": { units_available: 0, days_covered: 0, status: "red" },
  },
};
