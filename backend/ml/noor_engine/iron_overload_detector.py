from datetime import datetime
from typing import List, Tuple, Dict, Any

from core.constants import FERRITIN_OVERLOAD_THRESHOLD, FERRITIN_TREND_THRESHOLD
from core.logging import logger

def detect_iron_overload(ferritin_readings: List[Tuple[str, float]]) -> List[Dict[str, Any]]:
    """
    Monitors serum ferritin trends to identify early iron overload and chelation requirements.
    
    Args:
        ferritin_readings: Chronological or unsorted list of tuples (date_string, ferritin_value).
        
    Returns:
        List of clinical alert flags represented as dictionaries.
    """
    alerts = []
    if len(ferritin_readings) < 2:
        return alerts
        
    # Sort readings by date to ensure proper trend calculation
    sorted_readings = sorted(ferritin_readings, key=lambda x: x[0])
    
    # 1. Absolute Overload Threshold Check
    latest_date_str, latest_val = sorted_readings[-1]
    
    # If the ferritin value is highly elevated but below 3000, keep it as warning (amber alert)
    if latest_val >= FERRITIN_OVERLOAD_THRESHOLD:
        severity = "warning" if latest_val < 3000.0 else "critical"
        alerts.append({
            "type": "iron_overload",
            "severity": severity,
            "message": f"Critical iron overload: Serum ferritin is {latest_val} ng/mL (crosses {FERRITIN_OVERLOAD_THRESHOLD} ng/mL absolute threshold).",
            "recommended_action": "Initiate clinical review and adjust chelation dosage if required.",
            "detected_at": datetime.now()
        })
        return alerts
        
    # 2. Trend Threshold Check (Last 3 readings increasing by >300 ng/mL total)
    if len(sorted_readings) >= 3:
        last_three = sorted_readings[-3:]
        v1 = last_three[0][1]
        v3 = last_three[2][1]
        diff = v3 - v1
        
        if diff >= FERRITIN_TREND_THRESHOLD:
            alerts.append({
                "type": "iron_overload",
                "severity": "warning",
                "message": f"Amber Alert: Rapid iron accumulation detected (+{diff} ng/mL over last 3 readings, crossing the {FERRITIN_TREND_THRESHOLD} ng/mL threshold). Current ferritin is {v3} ng/mL.",
                "recommended_action": "Schedule serum ferritin monitoring and adjust chelation dosage.",
                "detected_at": datetime.now()
            })
            
    return alerts
