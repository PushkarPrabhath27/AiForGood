"""
Caregiver Sentinel Service — Innovation 3: The Caregiver Sentinel.

Text-based symptom analysis pipeline. Parses free-text caregiver responses
to structured symptom scores, fuses with the patient's Prophet Hb forecast
deviation, and fires SentinelAlerts when the combined signal crosses thresholds.

No speech recognition is used. Input is always plain text from Telegram/WhatsApp.

Score Fusion Model:
    fused_score = 0.6 * symptom_score + 0.4 * hb_deviation_score

Thresholds:
    fused_score >= 0.7  → HIGH concern → SentinelAlert (type: symptom_spike)
    fused_score >= 0.4  → MILD concern → SentinelAlert (type: early_warning)
    fused_score < 0.4   → No alert
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import logger
from models.hb_reading import HbReading
from models.patient import Patient
from models.sentinel import (
    ActivityLevel,
    CaregiverCheckin,
    ConcernLevel,
    SentinelAlert,
)

# ─── Sentinel Weight Constants ────────────────────────────────────────────────
_SYMPTOM_WEIGHT: float = 0.6
_HB_DEVIATION_WEIGHT: float = 0.4

# Normalised Hb deviation thresholds (g/dL below forecast)
_HB_DEVIATION_MILD: float = 0.5     # 0.5 g/dL below forecast → mild deviation
_HB_DEVIATION_SEVERE: float = 1.5   # 1.5 g/dL below forecast → severe deviation

# ─── Keyword Lexicon for Symptom Scoring ─────────────────────────────────────
# Each tuple: (regex_pattern, symptom_weight)  weight in [0.0, 1.0]
_SYMPTOM_PATTERNS: list[tuple[str, float]] = [
    # Fatigue / weakness
    (r"\b(tired|fatigue|exhausted|weak|thakan|kamzor|थका|कमज़ोर)\b", 0.3),
    # Breathlessness
    (r"\b(breathless|breathing|short of breath|sans|saas)\b", 0.5),
    # Pallor
    (r"\b(pale|pallor|white|yellowish|peela|peet|पीला)\b", 0.4),
    # Dizziness
    (r"\b(dizzy|dizziness|giddy|chakkar|चक्कर)\b", 0.35),
    # Chest pain
    (r"\b(chest pain|heart|dard|seena|दर्द)\b", 0.6),
    # Reduced appetite
    (r"\b(no appetite|not eating|skip|bhookh|भूख नहीं)\b", 0.2),
    # High activity (negative signal — good sign)
    (r"\b(active|playing|running|normal|theek|ठीक)\b", -0.2),
    # Very low activity
    (r"\b(bed rest|lying|bedridden|bichista|सो रहे|lete)\b", 0.4),
]

_LOW_ACTIVITY_KEYWORDS = {"bed rest", "lying", "bedridden", "lete", "सो रहे"}
_NO_APPETITE_KEYWORDS = {"no appetite", "not eating", "bhookh", "भूख नहीं"}


def parse_symptom_score(raw_response: str) -> Tuple[float, bool, bool, ActivityLevel]:
    """Parse a free-text caregiver response into structured symptom signals.

    Applies a keyword lexicon scan (case-insensitive) to accumulate a
    symptom score. Score is clamped to [0.0, 1.0].

    Args:
        raw_response: Raw text from caregiver (Telegram/WhatsApp message).

    Returns:
        Tuple containing:
            symptom_score (float):     Normalised symptom severity [0.0, 1.0].
            fatigue_reported (bool):   True if fatigue keywords detected.
            appetite_normal (bool):    True if no appetite-loss keywords found.
            activity_level (ActivityLevel): Inferred activity level.

    Notes:
        O(p) time where p = number of patterns (constant).
    """
    text = raw_response.lower()
    accumulated = 0.0
    fatigue_reported = False
    appetite_normal = True
    activity_inferred = ActivityLevel.normal

    for pattern, weight in _SYMPTOM_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            accumulated += weight

    # Specific flag extraction
    if re.search(r"\b(tired|fatigue|exhausted|weak|thakan|kamzor|थका|कमज़ोर)\b", text, re.IGNORECASE):
        fatigue_reported = True
    if re.search(r"\b(no appetite|not eating|skip|bhookh|भूख नहीं)\b", text, re.IGNORECASE):
        appetite_normal = False
    if re.search(r"\b(bed rest|lying|bedridden|lete|सो रहे)\b", text, re.IGNORECASE):
        activity_inferred = ActivityLevel.very_low
    elif re.search(r"\b(tired|fatigue|weak|kamzor)\b", text, re.IGNORECASE):
        activity_inferred = ActivityLevel.reduced

    symptom_score = max(0.0, min(1.0, accumulated))
    return round(symptom_score, 3), fatigue_reported, appetite_normal, activity_inferred


def _hb_deviation_score(actual_hb: Optional[float], predicted_hb: Optional[float]) -> float:
    """Convert Hb actual vs. forecast into a normalised deviation score.

    Args:
        actual_hb:    Current measured Hb (g/dL). None if not available.
        predicted_hb: Forecast Hb (g/dL). None if forecast missing.

    Returns:
        float: Deviation score in [0.0, 1.0]. 0 = no deviation.
    """
    if actual_hb is None or predicted_hb is None:
        return 0.0

    deviation = predicted_hb - actual_hb  # positive = worse than expected
    if deviation <= 0:
        return 0.0
    if deviation >= _HB_DEVIATION_SEVERE:
        return 1.0
    return round(deviation / _HB_DEVIATION_SEVERE, 3)


def _fuse_scores(symptom_score: float, hb_dev_score: float) -> float:
    """Combine symptom and Hb deviation scores with fixed weights.

    Args:
        symptom_score:  Normalised symptom score [0.0, 1.0].
        hb_dev_score:   Normalised Hb deviation score [0.0, 1.0].

    Returns:
        float: Fused concern score [0.0, 1.0].
    """
    return round(_SYMPTOM_WEIGHT * symptom_score + _HB_DEVIATION_WEIGHT * hb_dev_score, 3)


def _classify_concern(fused_score: float) -> ConcernLevel:
    """Map fused score to a ConcernLevel enum value.

    Args:
        fused_score: Combined score [0.0, 1.0].

    Returns:
        ConcernLevel: Classified concern level.
    """
    if fused_score >= 0.7:
        return ConcernLevel.high
    if fused_score >= 0.4:
        return ConcernLevel.mild
    return ConcernLevel.none


async def process_checkin(
    patient_id: str,
    raw_response: str,
    language_detected: str = "en",
    channel: str = "telegram",
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """Process a caregiver check-in text response end-to-end.

    Orchestrates:
    1. Parse symptom score from raw text
    2. Fetch latest Hb reading and Prophet forecast for Hb deviation
    3. Fuse scores → classify concern level
    4. Persist CaregiverCheckin row
    5. If concern ≥ mild → create SentinelAlert

    Args:
        patient_id:         UUID of the patient being monitored.
        raw_response:       Free-text caregiver response.
        language_detected:  ISO language code of the input (default 'en').
        channel:            Messaging channel (default 'telegram').
        db:                 Async DB session.

    Returns:
        Dict[str, Any]: Structured result including checkin_id, fused_score,
                        concern_level, and alert_created flag.

    Raises:
        ValueError: If patient_id does not correspond to a known patient.
    """
    if db is None:
        raise ValueError("db session is required")

    # 1. Validate patient exists
    p_stmt = select(Patient).where(Patient.id == patient_id)
    p_res = await db.execute(p_stmt)
    patient = p_res.scalar_one_or_none()
    if patient is None:
        raise ValueError(f"Patient {patient_id!r} not found")

    # 2. Parse symptom score
    symptom_score, fatigue_reported, appetite_normal, activity_level = parse_symptom_score(raw_response)

    # 3. Fetch latest Hb reading (actual measured value)
    hb_stmt = (
        select(HbReading)
        .where(HbReading.patient_id == patient_id)
        .order_by(HbReading.reading_date.desc())
        .limit(1)
    )
    hb_res = await db.execute(hb_stmt)
    latest_hb = hb_res.scalar_one_or_none()
    actual_hb = float(latest_hb.hb_value) if latest_hb else patient.hb_current

    # 4. Fetch the previous Hb reading to use as the "expected" value baseline
    # (If available, the prior reading serves as a clinical expectation proxy)
    prev_hb_stmt = (
        select(HbReading)
        .where(HbReading.patient_id == patient_id)
        .order_by(HbReading.reading_date.desc())
        .offset(1)
        .limit(1)
    )
    prev_hb_res = await db.execute(prev_hb_stmt)
    prev_hb = prev_hb_res.scalar_one_or_none()
    predicted_hb = float(prev_hb.hb_value) if prev_hb else None

    # 5. Compute fused score
    hb_dev = _hb_deviation_score(actual_hb, predicted_hb)
    fused_score = _fuse_scores(symptom_score, hb_dev)
    concern_level = _classify_concern(fused_score)

    # 6. Persist CaregiverCheckin
    checkin = CaregiverCheckin(
        patient_id=patient_id,
        checkin_date=datetime.now(timezone.utc),
        channel=channel,
        raw_response=raw_response[:1000],
        language_detected=language_detected,
        symptom_score=fused_score,
        fatigue_reported=fatigue_reported,
        appetite_normal=appetite_normal,
        activity_level=activity_level,
        caregiver_concern_level=concern_level,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(checkin)
    await db.flush()  # Populate checkin.id for FK reference

    # 7. Create SentinelAlert if concern >= mild
    alert_created = False
    if concern_level in (ConcernLevel.mild, ConcernLevel.high):
        alert_type = "symptom_spike" if concern_level == ConcernLevel.high else "early_warning"
        action = (
            "Immediate coordinator notification and schedule Hb check within 24h."
            if concern_level == ConcernLevel.high
            else "Log observation and schedule check-in follow-up in 48h."
        )
        alert = SentinelAlert(
            patient_id=patient_id,
            alert_type=alert_type,
            triggering_checkin_id=checkin.id,
            hb_at_trigger=actual_hb,
            predicted_hb_at_trigger=predicted_hb,
            symptom_score_at_trigger=fused_score,
            recommended_action=action,
            coordinator_notified=False,
        )
        db.add(alert)
        alert_created = True
        logger.warning(
            "sentinel_alert_created",
            patient_id=patient_id,
            alert_type=alert_type,
            fused_score=fused_score,
        )

    await db.flush()

    result = {
        "checkin_id": checkin.id,
        "symptom_score": symptom_score,
        "hb_deviation_score": hb_dev,
        "fused_score": fused_score,
        "concern_level": concern_level.value,
        "fatigue_reported": fatigue_reported,
        "appetite_normal": appetite_normal,
        "activity_level": activity_level.value,
        "alert_created": alert_created,
    }
    logger.info("caregiver_checkin_processed", patient_id=patient_id, **result)
    return result
