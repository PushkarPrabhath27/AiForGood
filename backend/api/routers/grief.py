"""
Grief Protocol API Router — Innovation 5.

Exposes endpoints for:
- POST /grief/activate/{patient_id}   — activate grief protocol for a deceased patient
- GET  /grief/memorials/{patient_id}  — retrieve generated memorial messages
- GET  /grief/repair-logs/{patient_id} — retrieve circle repair logs
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from models.memorial import CircleRepairLog
from services.grief_service import activate_grief_protocol, get_memorial_messages

router = APIRouter(prefix="/grief", tags=["Grief Protocol"])


class GriefActivationRequest(BaseModel):
    """Request body for grief protocol activation."""

    transition_patient_id: Optional[str] = Field(
        default=None,
        description="Optional UUID of a new patient to receive the guardian circle transition."
    )


@router.post(
    "/activate/{patient_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Activate grief protocol for a deceased patient",
)
async def activate_grief(
    patient_id: str,
    body: GriefActivationRequest,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Mark a patient as deceased, generate memorial messages for all guardians,
    and create a circle repair log entry.

    - **patient_id**: UUID of the deceased patient.
    - **transition_patient_id**: If provided, messages will suggest this patient
      as a transition target for the guardian circle.
    """
    try:
        result = await activate_grief_protocol(
            patient_id=patient_id,
            db=db,
            transition_patient_id=body.transition_patient_id,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get(
    "/memorials/{patient_id}",
    response_model=List[Dict[str, Any]],
    summary="Retrieve memorial messages for a patient's circle",
)
async def get_memorials(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> List[Dict[str, Any]]:
    """Return all generated memorial messages for the guardian circle of a patient."""
    return await get_memorial_messages(patient_id, db)


@router.get(
    "/repair-logs/{patient_id}",
    response_model=List[Dict[str, Any]],
    summary="Retrieve circle repair log entries for a patient",
)
async def get_repair_logs(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> List[Dict[str, Any]]:
    """Return all CircleRepairLog entries for a patient."""
    stmt = (
        select(CircleRepairLog)
        .where(CircleRepairLog.patient_id == patient_id)
        .order_by(CircleRepairLog.repair_initiated_at.desc())
    )
    res = await db.execute(stmt)
    logs = list(res.scalars().all())
    return [
        {
            "id": log.id,
            "patient_id": log.patient_id,
            "departing_guardian_id": log.departing_guardian_id,
            "replacement_guardian_id": log.replacement_guardian_id,
            "repair_initiated_at": log.repair_initiated_at.isoformat(),
            "repair_completed_at": log.repair_completed_at.isoformat() if log.repair_completed_at else None,
            "transition_message_sent": log.transition_message_sent,
            "status": log.status.value,
        }
        for log in logs
    ]
