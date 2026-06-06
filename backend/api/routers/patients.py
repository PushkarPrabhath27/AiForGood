from __future__ import annotations
from datetime import datetime, date
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import redis.asyncio as aioredis

from core.config import settings
from core.exceptions import PatientNotFoundError, RaktaSetuException
from core.logging import logger
from db.session import get_db_session
from models.patient import Patient
from models.hb_reading import HbReading
from schemas.common import ApiResponse, ApiError
from schemas.patient import PatientListResponse, PatientDetail, HbReadingCreate, HbReadingResponse

router = APIRouter()

@router.get("", response_model=ApiResponse[PatientListResponse])
async def list_patients(
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[PatientListResponse]:
    """
    Retrieves a list of all enrolled patients.
    """
    logger.info("list_patients_request_received")
    
    stmt = select(Patient).order_by(Patient.name)
    res = await db.execute(stmt)
    patients = list(res.scalars().all())
    
    response_data = PatientListResponse(
        patients=patients,
        total=len(patients),
        page=1
    )
    
    logger.info("list_patients_completed", count=len(patients))
    return ApiResponse(
        success=True,
        data=response_data,
        error=None
    )


@router.get("/{patient_id}", response_model=ApiResponse[PatientDetail])
async def get_patient_detail(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[PatientDetail]:
    """
    Retrieves detailed demographic and clinical status for a specific patient.
    """
    logger.info("get_patient_detail_request_received", patient_id=patient_id)
    
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    
    if not patient:
        logger.warning("get_patient_detail_not_found", patient_id=patient_id)
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")
        
    logger.info("get_patient_detail_completed", patient_id=patient_id)
    return ApiResponse(
        success=True,
        data=patient,
        error=None
    )


@router.post("/{patient_id}/hb-reading", response_model=ApiResponse[HbReadingResponse])
async def log_hb_reading(
    patient_id: str,
    payload: HbReadingCreate,
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[HbReadingResponse]:
    """
    Logs a new clinical hemoglobin reading for a patient.
    
    If the reading is marked as post-transfusion and units are provided, this calculates
    the incremental Hb rise per unit based on the most recent pre-transfusion reading.
    Upon successful log, updates the patient's current Hb status and invalidates 
    cached clinical forecasts in Redis.
    """
    logger.info("log_hb_reading_request_received", patient_id=patient_id, hb_value=payload.hb_value)
    
    # 1. Fetch Patient details to verify existence
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    
    if not patient:
        logger.warning("log_hb_reading_patient_not_found", patient_id=patient_id)
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")
        
    hb_rise_per_unit = None
    
    # 2. Compute post-transfusion hemoglobin rise per unit if applicable
    if payload.post_transfusion:
        if not payload.units_transfused or payload.units_transfused <= 0:
            logger.warning("log_hb_reading_missing_units_for_post_transfusion", patient_id=patient_id)
            raise RaktaSetuException(
                status_code=400,
                detail="Post-transfusion readings require positive 'units_transfused'."
            )
            
        # Find the latest pre-transfusion check prior to the current reading date
        pre_stmt = (
            select(HbReading)
            .where(
                HbReading.patient_id == patient_id,
                HbReading.post_transfusion == False,
                HbReading.reading_date < datetime.combine(payload.reading_date, datetime.min.time())
            )
            .order_by(HbReading.reading_date.desc())
            .limit(1)
        )
        pre_res = await db.execute(pre_stmt)
        pre_reading = pre_res.scalar_one_or_none()
        
        if pre_reading:
            rise = payload.hb_value - pre_reading.hb_value
            hb_rise_per_unit = round(rise / payload.units_transfused, 2)
            logger.info(
                "computed_hb_rise_per_unit",
                patient_id=patient_id,
                rise=rise,
                units=payload.units_transfused,
                rise_per_unit=hb_rise_per_unit
            )
            
    # 3. Create the database record
    # Since reading_date is a date, combine it with a min time for DateTime database compatibility
    reading_dt = datetime.combine(payload.reading_date, datetime.min.time())
    
    db_reading = HbReading(
        patient_id=patient_id,
        hb_value=payload.hb_value,
        reading_date=reading_dt,
        post_transfusion=payload.post_transfusion,
        units_transfused=payload.units_transfused,
        hb_rise_per_unit=hb_rise_per_unit
    )
    
    db.add(db_reading)
    
    # 4. Synchronize patient clinical state
    patient.hb_current = payload.hb_value
    db.add(patient)
    
    # Save session updates to DB
    await db.flush()
    
    # 5. Invalidate the Redis cache for this patient's clinical forecasts
    redis_client = aioredis.from_url(settings.redis_url, socket_timeout=2.0)
    try:
        await redis_client.delete(f"forecast:{patient_id}")
        logger.info("invalidated_forecast_redis_cache", patient_id=patient_id)
    except Exception as redis_err:
        logger.warning(
            "failed_to_clear_forecast_redis_cache",
            patient_id=patient_id,
            error=str(redis_err)
        )
    finally:
        await redis_client.aclose()
        
    logger.info("log_hb_reading_completed_successfully", patient_id=patient_id, reading_id=db_reading.id)
    return ApiResponse(
        success=True,
        data=db_reading,
        error=None
    )


from pydantic import BaseModel  # noqa: E402


class PatientStatusUpdate(BaseModel):
    """Request body for patient status update."""

    status: str
    transition_patient_id: Optional[str] = None


@router.post(
    "/{patient_id}/status",
    response_model=Dict[str, Any],
    tags=["Patients Directory"],
    summary="Update patient status (deceased triggers Grief Protocol)",
)
async def update_patient_status(
    patient_id: str,
    body: PatientStatusUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Update the clinical status of a patient.

    Allowed status values: `active`, `critical`, `stable`, `deceased`.

    If `status` is set to `deceased`, the Grief Protocol (Innovation 5) is
    automatically activated — generating per-guardian memorial messages and
    creating a circle_repair_log entry.

    - **patient_id**: UUID of the patient.
    - **transition_patient_id**: Optional UUID of a new patient to suggest for
      guardian circle transition (grief protocol only).
    """
    allowed = {"active", "critical", "stable", "deceased"}
    if body.status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. Must be one of: {sorted(allowed)}",
        )

    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if patient is None:
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")

    if body.status == "deceased":
        # Delegate to the full grief protocol
        from services.grief_service import activate_grief_protocol
        result = await activate_grief_protocol(
            patient_id=patient_id,
            db=db,
            transition_patient_id=body.transition_patient_id,
        )
        return {"status": "deceased", "grief_protocol": result}

    # Simple status update for non-deceased transitions
    old_status = patient.status
    patient.status = body.status
    db.add(patient)
    await db.flush()

    logger.info(
        "patient_status_updated",
        patient_id=patient_id,
        old_status=old_status,
        new_status=body.status,
    )
    return {
        "patient_id": patient_id,
        "old_status": old_status,
        "new_status": body.status,
    }
