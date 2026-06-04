export const HB_TRANSFUSION_THRESHOLD = 7.0; // g/dL
export const HB_THRESHOLD_PEDIATRIC = 7.5; // g/dL
export const FERRITIN_OVERLOAD_THRESHOLD = 2500; // ng/mL
export const GUARDIAN_CIRCLE_SIZE = 8;
export const GUARDIAN_PRIMARY_COUNT = 3;
export const GUARDIAN_SECONDARY_COUNT = 3;
export const GUARDIAN_RARE_COUNT = 2;
export const MOBILIZATION_DAYS = [10, 7, 3, 0] as const;
export const FORECAST_HORIZON_DAYS = 60;
export const INVENTORY_STALE_HOURS = 24;

export const BLOOD_TYPES = ["A", "B", "AB", "O"] as const;
export const RH_FACTORS = ["+", "-"] as const;

export const ALERT_SEVERITY_COLORS = {
  info: "blue",
  warning: "amber",
  critical: "red",
} as const;

export const HEALTH_STATUS_COLORS = {
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
} as const;

export const GUARDIAN_STATUS_COLORS = {
  active: "green",
  cooldown: "amber",
  pending: "blue",
  unavailable: "red",
  empty: "gray",
} as const;

export const SUPPORTED_LANGUAGES = [
  { code: "te", label: "Telugu" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "gu", label: "Gujarati" },
  { code: "bn", label: "Bengali" },
  { code: "or", label: "Odia" },
  { code: "en", label: "English" },
] as const;
