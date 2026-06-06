"""
Caregiver Sentinel API Router — Innovation 3.

Exposes endpoints for:
- POST /sentinel/checkin/{patient_id}  — process a caregiver text check-in
- GET  /sentinel/alerts/{patient_id}   — retrieve sentinel alerts for a patient
- GET  /sentinel/checkins/{patient_id} — list check-in history
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from models.sentinel import CaregiverCheckin, SentinelAlert
from services.sentinel_service import process_checkin

router = APIRouter(prefix="/sentinel", tags=["Caregiver Sentinel"])


class CheckinRequest(BaseModel):
    """Request body for a caregiver text check-in."""

    raw_response: str = Field(..., min_length=1, max_length=1000, description="Free-text caregiver response")
    language_detected: str = Field(default="en", max_length=10)
    channel: str = Field(default="telegram", max_length=20)


@router.post(
    "/checkin/{patient_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Process a caregiver check-in response",
)
async def caregiver_checkin(
    patient_id: str,
    body: CheckinRequest,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Parse a free-text caregiver response, compute symptom + Hb deviation scores,
    and create a SentinelAlert if concern level >= mild.

    - **patient_id**: UUID of the patient being monitored.
    - **raw_response**: The caregiver's free-text message (Telegram/WhatsApp text).
    """
    try:
        result = await process_checkin(
            patient_id=patient_id,
            raw_response=body.raw_response,
            language_detected=body.language_detected,
            channel=body.channel,
            db=db,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/alerts/{patient_id}",
    response_model=List[Dict[str, Any]],
    summary="List sentinel alerts for a patient",
)
async def list_sentinel_alerts(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> List[Dict[str, Any]]:
    """Return all SentinelAlerts for a patient, most recent first."""
    stmt = (
        select(SentinelAlert)
        .where(SentinelAlert.patient_id == patient_id)
        .order_by(SentinelAlert.created_at.desc())
    )
    res = await db.execute(stmt)
    alerts = list(res.scalars().all())
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "triggering_checkin_id": a.triggering_checkin_id,
            "hb_at_trigger": a.hb_at_trigger,
            "predicted_hb_at_trigger": a.predicted_hb_at_trigger,
            "symptom_score_at_trigger": a.symptom_score_at_trigger,
            "recommended_action": a.recommended_action,
            "coordinator_notified": a.coordinator_notified,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]


@router.get(
    "/checkins/{patient_id}",
    response_model=List[Dict[str, Any]],
    summary="List caregiver check-in history for a patient",
)
async def list_checkins(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> List[Dict[str, Any]]:
    """Return all CaregiverCheckins for a patient, most recent first."""
    stmt = (
        select(CaregiverCheckin)
        .where(CaregiverCheckin.patient_id == patient_id)
        .order_by(CaregiverCheckin.checkin_date.desc())
    )
    res = await db.execute(stmt)
    checkins = list(res.scalars().all())
    return [
        {
            "id": c.id,
            "checkin_date": c.checkin_date.isoformat(),
            "channel": c.channel,
            "raw_response": c.raw_response,
            "symptom_score": c.symptom_score,
            "fatigue_reported": c.fatigue_reported,
            "appetite_normal": c.appetite_normal,
            "activity_level": c.activity_level.value,
            "caregiver_concern_level": c.caregiver_concern_level.value,
            "language_detected": c.language_detected,
        }
        for c in checkins
    ]
