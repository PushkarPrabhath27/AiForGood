export const QUERY_KEYS = {
  patients: ["patients"] as const,
  patient: (id: string) => ["patient", id] as const,
  forecast: (id: string) => ["forecast", id] as const,
  guardianCircle: (id: string) => ["guardian-circle", id] as const,
  cityInventory: (code: string) => ["city-inventory", code] as const,
};

export const DEMO = {
  PRIYA_ID: "550e8400-e29b-41d4-a716-446655440001",
  VIKRAM_ID: "550e8400-e29b-41d4-a716-446655440002",
  CITY_CODE: "HYD",
  BANK_APOLLO_ID: "550e8400-e29b-41d4-a716-446655440010",
  BANK_YASHODA_ID: "550e8400-e29b-41d4-a716-446655440011",
  GUARDIAN_RAJU_ID: "550e8400-e29b-41d4-a716-446655440020",
  GUARDIAN_SURESH_ID: "550e8400-e29b-41d4-a716-446655440021",
};
