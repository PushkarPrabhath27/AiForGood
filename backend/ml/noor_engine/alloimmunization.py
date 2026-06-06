from __future__ import annotations
from typing import List, Dict, Tuple, Union
from core.constants import (
    CUSUM_ALLOIMMUNIZATION_K,
    CUSUM_ALLOIMMUNIZATION_H,
    MIN_READINGS_FOR_CUSUM
)
from core.logging import logger

def detect_alloimmunization(readings: List[Dict[str, Union[float, bool, str, None]]]) -> Tuple[bool, float, List[str]]:
    """
    Evaluates sequential post-transfusion rise recovery rates using a Cumulative Sum 
    (CUSUM) control chart to identify potential early-stage minor antigen alloimmunization.
    
    Tuned for hackathon-level early warning tracking (H = 0.4, K = 0.5).
    
    Complexity: O(n) time · O(1) space
    
    Args:
        readings (List[Dict]): Historical readings sorted chronologically by date.
                               Each reading must contain 'hb_value', 'post_transfusion',
                               'units_transfused', and optionally 'hb_rise_per_unit'.
                               
    Returns:
        Tuple[bool, float, List[str]]:
            - bool: True if CUSUM crosses the positive threshold, else False.
            - float: Final cumulative sum value.
            - List[str]: Chronological evidence log mapping CUSUM steps.
    """
    # 1. Filter out only post-transfusion readings (ordered chronologically)
    post_readings = [r for r in readings if r.get("post_transfusion") is True]
    
    # 2. Safety Guard: Reject inputs failing minimum length requirements
    if len(post_readings) < MIN_READINGS_FOR_CUSUM:
        logger.info(
            "cusum_skipped_insufficient_readings",
            count=len(post_readings),
            required=MIN_READINGS_FOR_CUSUM
        )
        return False, 0.0, [f"Insufficient post-transfusion cycles ({len(post_readings)}/{MIN_READINGS_FOR_CUSUM}) to run CUSUM."]

    # 3. Establish baseline rise from first 3 cycles
    baseline_rises: List[float] = []
    for r in post_readings[:3]:
        rise = r.get("hb_rise_per_unit")
        if rise is not None:
            baseline_rises.append(float(rise))
            
    if len(baseline_rises) < 3:
        logger.warning("cusum_baseline_incomplete", count=len(baseline_rises))
        return False, 0.0, ["Missing rise parameters in the initial baseline readings."]

    baseline: float = round(sum(baseline_rises) / 3.0, 2)
    evidence: List[str] = [
        f"Baseline established from first 3 cycles: average rise = {baseline} g/dL per unit."
    ]

    # 4. Sequential CUSUM calculation for drops
    # Formula: cusum_t = max(0, cusum_prev + (baseline - rise_t) - K)
    cusum: float = 0.0
    flagged: bool = False
    
    # Dynamic positive threshold for early-stage warning
    H: float = 0.4
    K: float = CUSUM_ALLOIMMUNIZATION_K  # 0.5

    for idx, reading in enumerate(post_readings[3:], start=4):
        actual_rise = reading.get("hb_rise_per_unit")
        if actual_rise is None:
            continue
            
        actual_rise = float(actual_rise)
        deviation = round(baseline - actual_rise, 2)
        cusum_term = round(deviation - K, 2)
        
        cusum = max(0.0, round(cusum + cusum_term, 2))
        evidence.append(
            f"Cycle {idx}: Rise = {actual_rise:.1f} | Dev = {deviation:+.2f} | CUSUM Term = {cusum_term:+.2f} | CUSUM = {cusum:.2f}"
        )

        if cusum > H:
            flagged = True
            evidence.append(
                f"[ALERT] CUSUM value {cusum:.2f} crossed positive alert threshold H = {H:.1f} at Cycle {idx}."
            )

    return flagged, cusum, evidence
