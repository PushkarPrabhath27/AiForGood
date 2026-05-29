from datetime import datetime, date
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.exceptions import PatientNotFoundError, GuardianCircleError
from core.logging import logger
from db.session import get_db_session
from models.patient import Patient
from models.guardian import Guardian
from schemas.common import ApiResponse, ApiError
from schemas.guardian import GuardianCircleResponse, GuardianSchema, MobilizationStatusResponse
from services.guardian_service import calculate_circle_health, build_circle
from services.mobilization_service import trigger_mobilization, get_mobilization_status

router = APIRouter()

@router.get("/{patient_id}/guardian-circle", response_model=ApiResponse[GuardianCircleResponse])
async def get_patient_guardian_circle(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[GuardianCircleResponse]:
    """
    Retrieves the clinical guardian circle details, continuous health scores,
    and current T-minus countdown mobilization states.
    
    Args:
        patient_id: Unique database identifier of the patient.
        db: Async database session.
        
    Returns:
        ApiResponse containing the detailed GuardianCircleResponse.
    """
    logger.info("guardian_circle_request_received", patient_id=patient_id)
    
    # 1. Fetch Patient details
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    
    if not patient:
        logger.warning("guardian_circle_patient_not_found", patient_id=patient_id)
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")
        
    # 2. Fetch guardians mapped to patient
    guardians_stmt = select(Guardian).where(Guardian.patient_id == patient_id)
    guardians_res = await db.execute(guardians_stmt)
    guardians = list(guardians_res.scalars().all())
    
    # 3. Calculate circle health scores (coverage, engagement, pair-survivability resilience)
    scores = calculate_circle_health(guardians, patient_id)
    
    # 4. Read mobilization state
    mob_status = await get_mobilization_status(patient_id)
    
    # Map to schema structures
    mapped_guardians = [
        GuardianSchema(
            id=g.id,
            patient_id=g.patient_id,
            name=g.name,
            phone=g.phone,
            role=g.role,
            status=g.status,
            last_donation_date=g.last_donation_date.date() if isinstance(g.last_donation_date, datetime) else g.last_donation_date,
            next_eligible_date=g.next_eligible_date.date() if isinstance(g.next_eligible_date, datetime) else g.next_eligible_date,
            donation_count=g.donation_count,
            response_latency_avg_hours=g.response_latency_avg_hours,
            preferred_language=g.preferred_language,
            compatibility_score=g.compatibility_score,
            reliability_score=g.reliability_score,
            geography_score=g.geography_score
        )
        for g in guardians
    ]
    
    response_data = GuardianCircleResponse(
        patient_id=patient_id,
        coverage_score=scores["coverage_score"],
        engagement_score=scores["engagement_score"],
        resilience_score=scores["resilience_score"],
        mobilization_status=mob_status["status"],
        days_to_transfusion=mob_status["days_to_transfusion"],
        guardians=mapped_guardians
    )
    
    logger.info("guardian_circle_retrieval_completed", patient_id=patient_id)
    return ApiResponse(
        success=True,
        data=response_data,
        error=None
    )


@router.post("/{patient_id}/guardian-circle/mobilize", response_model=ApiResponse[MobilizationStatusResponse])
async def mobilize_guardian_circle(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[MobilizationStatusResponse]:
    """
    Manually activates the mobilization sequence for the patient's network.
    If Suresh is pending, transitions his status to active and updates calculations.
    
    Args:
        patient_id: Unique database identifier of the patient.
        db: Async database session.
        
    Returns:
        ApiResponse containing the updated MobilizationStatusResponse.
    """
    logger.info("guardian_circle_mobilization_trigger_received", patient_id=patient_id)
    
    # Fetch Patient details
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    
    if not patient:
        logger.warning("mobilize_patient_not_found", patient_id=patient_id)
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")
        
    # Fetch Patient's guardians
    guardians_stmt = select(Guardian).where(Guardian.patient_id == patient_id)
    guardians_res = await db.execute(guardians_stmt)
    guardians = list(guardians_res.scalars().all())
    
    if not guardians:
        logger.warning("mobilize_skipped_no_guardians", patient_id=patient_id)
        raise GuardianCircleError("Cannot mobilize a patient with an empty guardian network.")
        
    # Smart Demo confirmations: Transition Suresh from pending to active if found
    for g in guardians:
        if g.name == "Suresh" and g.status == "pending":
            g.status = "active"
            db.add(g)
            logger.info("suresh_confirmed_mobilization_transitioned_to_active", patient_id=patient_id)
            
    # Save the updated database states
    await db.flush()
    
    # Trigger/Update mobilization state machine and cache
    predicted_date = patient.next_transfusion_predicted.date() if patient.next_transfusion_predicted else date.today() + timedelta(days=14)
    mob_state = await trigger_mobilization(patient_id, predicted_date, db)
    
    # Return the newly updated state details
    response_data = MobilizationStatusResponse(
        status=mob_state["status"],
        days_to_transfusion=mob_state["days_to_transfusion"],
        confirmed_count=mob_state["confirmed_count"],
        total_count=mob_state["total_count"]
    )
    
    logger.info("guardian_circle_mobilized_successfully", patient_id=patient_id, status=mob_state["status"])
    return ApiResponse(
        success=True,
        data=response_data,
        error=None
    )
