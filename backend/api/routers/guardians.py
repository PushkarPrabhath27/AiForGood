from datetime import datetime, date, timedelta
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from core.exceptions import PatientNotFoundError, GuardianCircleError
from core.logging import logger
from db.session import get_db_session
from models.engagement import DonorChurnScore
from models.patient import Patient
from models.guardian import Guardian
from schemas.common import ApiResponse, ApiError
from schemas.guardian import (
    GuardianCircleResponse,
    GuardianSchema,
    MobilizationStatusResponse,
    UpdateGuardianRequest,
    SendGuardianMessageRequest,
)
from schemas.messaging import NotifyAlertResponse
from services.guardian_service import calculate_circle_health, build_circle
from services.mobilization_service import trigger_mobilization, get_mobilization_status
from services.messaging_service import send_telegram_message, generate_guardian_message

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
            telegram_chat_id=g.telegram_chat_id,
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


@router.patch("/{patient_id}/guardians/{guardian_id}", response_model=ApiResponse[GuardianSchema])
async def update_patient_guardian(
    patient_id: str,
    guardian_id: str,
    payload: UpdateGuardianRequest,
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[GuardianSchema]:
    """
    Updates editable fields of a specific guardian in a patient's circle.
    """
    logger.info("update_guardian_request_received", patient_id=patient_id, guardian_id=guardian_id)
    
    # 1. Fetch Guardian details
    stmt = select(Guardian).where(Guardian.id == guardian_id, Guardian.patient_id == patient_id)
    res = await db.execute(stmt)
    guardian = res.scalar_one_or_none()
    
    if not guardian:
        logger.warning("update_guardian_not_found", patient_id=patient_id, guardian_id=guardian_id)
        raise HTTPException(status_code=404, detail="Guardian not found for this patient.")
        
    # 2. Apply updates
    if payload.telegram_chat_id is not None:
        val = payload.telegram_chat_id.strip()
        guardian.telegram_chat_id = val if val else None
    if payload.preferred_language is not None:
        guardian.preferred_language = payload.preferred_language
        
    db.add(guardian)
    await db.commit()
    await db.refresh(guardian)
    
    # Map to schema structures
    mapped = GuardianSchema(
        id=guardian.id,
        patient_id=guardian.patient_id,
        name=guardian.name,
        phone=guardian.phone,
        telegram_chat_id=guardian.telegram_chat_id,
        role=guardian.role,
        status=guardian.status,
        last_donation_date=guardian.last_donation_date.date() if isinstance(guardian.last_donation_date, datetime) else guardian.last_donation_date,
        next_eligible_date=guardian.next_eligible_date.date() if isinstance(guardian.next_eligible_date, datetime) else guardian.next_eligible_date,
        donation_count=guardian.donation_count,
        response_latency_avg_hours=guardian.response_latency_avg_hours,
        preferred_language=guardian.preferred_language,
        compatibility_score=guardian.compatibility_score,
        reliability_score=guardian.reliability_score,
        geography_score=guardian.geography_score
    )
    
    logger.info("update_guardian_completed", guardian_id=guardian_id)
    return ApiResponse(
        success=True,
        data=mapped,
        error=None
    )


@router.post("/{patient_id}/guardians/{guardian_id}/message", response_model=ApiResponse[NotifyAlertResponse])
async def message_patient_guardian(
    patient_id: str,
    guardian_id: str,
    payload: SendGuardianMessageRequest,
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[NotifyAlertResponse]:
    """
    Sends a custom or template message to a specific guardian via Telegram.
    Transitions the guardian to 'pending' state (waiting for response).
    """
    logger.info("message_guardian_request_received", patient_id=patient_id, guardian_id=guardian_id)
    
    # 1. Fetch Patient details
    patient_stmt = select(Patient).where(Patient.id == patient_id)
    patient_res = await db.execute(patient_stmt)
    patient = patient_res.scalar_one_or_none()
    if not patient:
        logger.warning("message_guardian_patient_not_found", patient_id=patient_id)
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")
        
    # 2. Fetch Guardian details
    stmt = select(Guardian).where(Guardian.id == guardian_id, Guardian.patient_id == patient_id)
    res = await db.execute(stmt)
    guardian = res.scalar_one_or_none()
    if not guardian:
        logger.warning("message_guardian_not_found", patient_id=patient_id, guardian_id=guardian_id)
        raise HTTPException(status_code=404, detail="Guardian not found for this patient.")
        
    # 3. Determine message body
    message_body = ""
    if payload.message and payload.message.strip():
        message_body = payload.message.strip()
    else:
        # Generate default empathetic template message via Gemini
        context = {
            "date": patient.next_transfusion_predicted.date().isoformat() if patient.next_transfusion_predicted else "soon",
            "time": "10:00 AM",
            "pre_hb": "6.8",
            "post_hb": "10.4",
            "day": "Tuesday",
            "score": "94%"
        }
        message_body = await generate_guardian_message(guardian, patient, "t10_soft_ask", context)
        
    # 4. Dispatch via Telegram Bot
    chat_id = guardian.telegram_chat_id or settings.telegram_chat_id or ""
    delivery = await send_telegram_message(
        chat_id=chat_id,
        message=message_body,
        buttons=[
            {"id": "confirm_donation", "title": "Yes, I will donate"},
            {"id": "decline_donation", "title": "No, I'm busy"}
        ]
    )
    
    # 5. Transition status to pending (mobilization dispatched)
    if guardian.status != "empty":
        guardian.status = "pending"
        db.add(guardian)
        await db.commit()
        
    # Mask phone for privacy in response envelope
    phone = guardian.phone
    masked_phone = f"****{phone[-4:]}" if len(phone) >= 4 else phone
    
    logger.info("message_guardian_completed", guardian_id=guardian_id, delivery_status=delivery.get("status"))
    return ApiResponse(
        success=True,
        data=NotifyAlertResponse(
            delivery_status=delivery.get("status", "sent"),
            recipient_phone=masked_phone,
            message_body=message_body
        ),
        error=None
    )


@router.get(
    "/{patient_id}/guardians/{guardian_id}/churn-score",
    response_model=Dict[str, Any],
    tags=["Living Circle — Churn Detection"],
    summary="Get CUSUM churn score for a guardian",
)
async def get_guardian_churn_score(
    patient_id: str,
    guardian_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Return the current CUSUM engagement churn score and trend classification
    for a specific guardian in a patient's circle.

    - **cusum_score**: Normalised CUSUM value [0.0 – 1.0]; higher = more at-risk.
    - **engagement_trend**: `stable` | `declining` | `critical`
    - **predicted_churn_date**: ISO date if trend is critical, else null.
    - **reengagement_attempted**: Whether a re-engagement nudge was sent.
    """
    # Validate guardian belongs to this patient
    g_stmt = select(Guardian).where(
        Guardian.id == guardian_id,
        Guardian.patient_id == patient_id,
    )
    g_res = await db.execute(g_stmt)
    guardian = g_res.scalar_one_or_none()
    if guardian is None:
        raise HTTPException(status_code=404, detail="Guardian not found for this patient.")

    # Fetch churn score row
    cs_stmt = select(DonorChurnScore).where(DonorChurnScore.guardian_id == guardian_id)
    cs_res = await db.execute(cs_stmt)
    score_row = cs_res.scalar_one_or_none()

    if score_row is None:
        # No churn scan has run yet — return baseline stable state
        return {
            "guardian_id": guardian_id,
            "patient_id": patient_id,
            "cusum_score": 0.0,
            "engagement_trend": "stable",
            "predicted_churn_date": None,
            "reengagement_attempted": False,
            "reengagement_sent_at": None,
            "note": "No churn scan has run yet. Trigger the donor_churn_job or wait for the 6-hour scheduler.",
        }

    return {
        "guardian_id": guardian_id,
        "patient_id": patient_id,
        "cusum_score": score_row.cusum_score,
        "engagement_trend": score_row.engagement_trend.value,
        "predicted_churn_date": str(score_row.predicted_churn_date) if score_row.predicted_churn_date else None,
        "reengagement_attempted": score_row.reengagement_attempted,
        "reengagement_sent_at": score_row.reengagement_sent_at.isoformat() if score_row.reengagement_sent_at else None,
    }
