"""
Caregiver Sentinel API Router — Innovation 3.

Exposes endpoints for:
- POST /sentinel/checkin/{patient_id}  — process a caregiver text check-in
- GET  /sentinel/alerts/{patient_id}   — retrieve sentinel alerts for a patient
- GET  /sentinel/checkins/{patient_id} — list check-in history
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from models.sentinel import CaregiverCheckin, SentinelAlert
from services.sentinel_service import process_checkin
from schemas.common import ApiResponse

router = APIRouter(prefix="/sentinel", tags=["Caregiver Sentinel"])


class CheckinRequest(BaseModel):
    """Request body for a caregiver text check-in."""

    raw_response: str = Field(..., min_length=1, max_length=1000, description="Free-text caregiver response")
    language_detected: str = Field(default="en", max_length=10)
    channel: str = Field(default="telegram", max_length=20)


class CaregiverCheckinSchema(BaseModel):
    id: str
    patient_id: str
    checkin_date: datetime
    channel: str
    raw_response: Optional[str] = None
    symptom_score: float
    fatigue_reported: bool
    appetite_normal: bool
    activity_level: str
    caregiver_concern_level: str
    language_detected: str


class SentinelStatusSchema(BaseModel):
    patient_id: str
    sentinel_score: int
    last_checkin: Optional[CaregiverCheckinSchema] = None
    alert_active: bool
    recommended_action: Optional[str] = None


@router.post(
    "/checkin/{patient_id}",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_201_CREATED,
    summary="Process a caregiver check-in response",
)
async def caregiver_checkin(
    patient_id: str,
    body: CheckinRequest,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[Dict[str, Any]]:
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
        return ApiResponse(
            success=True,
            data=result,
            error=None
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/alerts/{patient_id}",
    response_model=ApiResponse[List[Dict[str, Any]]],
    summary="List sentinel alerts for a patient",
)
async def list_sentinel_alerts(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[List[Dict[str, Any]]]:
    """Return all SentinelAlerts for a patient, most recent first."""
    stmt = (
        select(SentinelAlert)
        .where(SentinelAlert.patient_id == patient_id)
        .order_by(SentinelAlert.created_at.desc())
    )
    res = await db.execute(stmt)
    alerts = list(res.scalars().all())
    data = [
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
    return ApiResponse(
        success=True,
        data=data,
        error=None
    )


@router.get(
    "/checkins/{patient_id}",
    response_model=ApiResponse[List[Dict[str, Any]]],
    summary="List caregiver check-in history for a patient",
)
async def list_checkins(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[List[Dict[str, Any]]]:
    """Return all CaregiverCheckins for a patient, most recent first."""
    stmt = (
        select(CaregiverCheckin)
        .where(CaregiverCheckin.patient_id == patient_id)
        .order_by(CaregiverCheckin.checkin_date.desc())
    )
    res = await db.execute(stmt)
    checkins = list(res.scalars().all())
    data = [
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
    return ApiResponse(
        success=True,
        data=data,
        error=None
    )


@router.get(
    "/{patient_id}",
    response_model=ApiResponse[SentinelStatusSchema],
    summary="Get combined Caregiver Sentinel status for a patient",
)
async def get_sentinel_status(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[SentinelStatusSchema]:
    """Get the latest caregiver checkin details, sentinel score and active alert status."""
    # 1. Fetch latest caregiver checkin
    checkin_stmt = (
        select(CaregiverCheckin)
        .where(CaregiverCheckin.patient_id == patient_id)
        .order_by(CaregiverCheckin.checkin_date.desc())
        .limit(1)
    )
    c_res = await db.execute(checkin_stmt)
    latest_checkin = c_res.scalar_one_or_none()

    if not latest_checkin:
        return ApiResponse(
            success=True,
            data=SentinelStatusSchema(
                patient_id=patient_id,
                sentinel_score=0,
                last_checkin=None,
                alert_active=False,
                recommended_action=None,
            ),
            error=None
        )

    # 2. Check concern level for alert state
    from models.sentinel import ConcernLevel
    alert_active = latest_checkin.caregiver_concern_level in (ConcernLevel.mild, ConcernLevel.high)

    # 3. Retrieve recommended action if active
    recommended_action = None
    if alert_active:
        alert_stmt = (
            select(SentinelAlert)
            .where(
                SentinelAlert.patient_id == patient_id,
                SentinelAlert.triggering_checkin_id == latest_checkin.id
            )
            .limit(1)
        )
        a_res = await db.execute(alert_stmt)
        latest_alert = a_res.scalar_one_or_none()
        if latest_alert:
            recommended_action = latest_alert.recommended_action

    # Map to schema
    checkin_schema = CaregiverCheckinSchema(
        id=latest_checkin.id,
        patient_id=latest_checkin.patient_id,
        checkin_date=latest_checkin.checkin_date,
        channel=latest_checkin.channel,
        raw_response=latest_checkin.raw_response,
        symptom_score=latest_checkin.symptom_score,
        fatigue_reported=latest_checkin.fatigue_reported,
        appetite_normal=latest_checkin.appetite_normal,
        activity_level=latest_checkin.activity_level.value,
        caregiver_concern_level=latest_checkin.caregiver_concern_level.value,
        language_detected=latest_checkin.language_detected,
    )

    status_data = SentinelStatusSchema(
        patient_id=patient_id,
        sentinel_score=round(latest_checkin.symptom_score * 100),
        last_checkin=checkin_schema,
        alert_active=alert_active,
        recommended_action=recommended_action,
    )

    return ApiResponse(
        success=True,
        data=status_data,
        error=None
    )
