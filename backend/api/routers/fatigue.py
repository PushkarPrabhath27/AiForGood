"""
Donor Fatigue API Router — Innovation 4.

Exposes endpoints for:
- GET  /fatigue/{guardian_id}            — get fatigue status for a guardian
- POST /fatigue/record-donation          — record a completed donation
- GET  /fatigue/eligible/{patient_id}    — list eligible guardians for a patient
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from models.guardian import Guardian
from services.fatigue_service import get_fatigue_status, is_fatigue_eligible, record_donation

router = APIRouter(prefix="/fatigue", tags=["Donor Fatigue"])


class RecordDonationRequest(BaseModel):
    """Request body for recording a completed donation."""

    guardian_id: str = Field(..., description="UUID of the donating guardian")
    patient_id: str = Field(..., description="UUID of the patient for the donation")


@router.get(
    "/{guardian_id}",
    response_model=Dict[str, Any],
    summary="Get fatigue status for a guardian",
)
async def fatigue_status(
    guardian_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Return the current donation fatigue eligibility state for a guardian."""
    try:
        return await get_fatigue_status(guardian_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/record-donation",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Record a completed donation and check fatigue ceiling",
)
async def record_completed_donation(
    body: RecordDonationRequest,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Record a donation, increment annual_donation_count, and enforce fatigue ceiling.

    If the ceiling is hit, sets fatigue_rest_until and updates the DynamoDB
    compatibility edge to ineligible.
    """
    try:
        return await record_donation(body.guardian_id, body.patient_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/eligible/{patient_id}",
    response_model=List[Dict[str, Any]],
    summary="List fatigue-eligible guardians for a patient",
)
async def eligible_guardians(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> List[Dict[str, Any]]:
    """Return all guardians for a patient who pass the fatigue eligibility check."""
    stmt = select(Guardian).where(
        Guardian.patient_id == patient_id,
        Guardian.status != "empty",
    )
    res = await db.execute(stmt)
    guardians = list(res.scalars().all())

    return [
        {
            "guardian_id": g.id,
            "name": g.name,
            "eligible": is_fatigue_eligible(g),
            "annual_donation_count": g.annual_donation_count,
            "fatigue_ceiling": g.fatigue_ceiling,
            "fatigue_rest_until": str(g.fatigue_rest_until) if g.fatigue_rest_until else None,
            "last_donation_date": g.last_donation_date.isoformat() if g.last_donation_date else None,
        }
        for g in guardians
    ]
