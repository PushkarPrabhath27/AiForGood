from typing import Dict, List

# Clinical Hemoglobin Thresholds (g/dL)
HB_TRANSFUSION_THRESHOLD: float = 7.0
HB_THRESHOLD_PEDIATRIC: float = 7.5

# Iron Overload / Serum Ferritin Thresholds (ng/mL)
FERRITIN_OVERLOAD_THRESHOLD: float = 2500.0
FERRITIN_TREND_THRESHOLD: float = 300.0

# Guardian Candidate Scoring weights (Sum = 100)
GUARDIAN_WEIGHT_COMPATIBILITY: int = 40
GUARDIAN_WEIGHT_RELIABILITY: int = 20
GUARDIAN_WEIGHT_GEOGRAPHY: int = 20
GUARDIAN_WEIGHT_PHENOTYPE: int = 20

# NOOR Forecast Engine parameters
MIN_READINGS_FOR_FORECAST: int = 3
FORECAST_HORIZON_DAYS: int = 60
FORECAST_CONFIDENCE_LEVEL: float = 0.80

# CUSUM Anomaly Detection parameters for Alloimmunization
CUSUM_ALLOIMMUNIZATION_K: float = 0.5
CUSUM_ALLOIMMUNIZATION_H: float = -3.0
MIN_READINGS_FOR_CUSUM: int = 4

# Guardian Mobilization Timeline Escalate Milestones (Days before predicted Transfusion)
MOBILIZATION_T10: int = 10
MOBILIZATION_T7: int = 7
MOBILIZATION_T3: int = 3
MOBILIZATION_T0: int = 0

# Inventory Optimization Parameters
INVENTORY_MATCH_EXPIRY_BUFFER_DAYS: int = 2
ORTOOLS_SOLVE_TIMEOUT_SECONDS: int = 30

# ── Proactive Mood Check (Telegram) ────────────────────────────────────────────
MOOD_RISK_MAP: dict[int, float] = {
    3: 1.0,    # Good / Energetic
    2: 1.15,   # Okay / Tired
    1: 1.25,   # Stressed / Depressed
}
MOOD_LABELS: dict[int, str] = {
    3: "Good / Energetic",
    2: "Okay / Tired",
    1: "Stressed / Depressed",
}
MOOD_EMOJIS: dict[int, str] = {
    3: "\U0001f60a",  # 😊
    2: "\U0001f610",  # 😐
    1: "\U0001f614",  # 😔
}
ADHERENCE_RISK_CONSECUTIVE_DAYS: int = 3
MOOD_RISK_LOOKBACK_DAYS: int = 5
BASE_HB_DECLIN_RATE: float = 0.1  # g/dL per day (physiological estimate for Prophet path)

# Standard ABO/Rh Blood Compatibility Matrix
# Key: Patient Blood Group, Value: List of compatible donor blood groups
COMPATIBILITY_MATRIX: Dict[str, List[str]] = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"]
}
