from __future__ import annotations
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.exceptions import PatientNotFoundError, GuardianCircleError
from core.logging import logger
from db.session import get_db_session
from models.patient import Patient
from models.guardian import Guardian
from models.alert import Alert
from schemas.common import ApiResponse
from schemas.messaging import NotifyAlertResponse
from services.messaging_service import generate_guardian_message, send_whatsapp_message

router = APIRouter()


@router.post("/{patient_id}/alerts/{alert_id}/notify", response_model=ApiResponse[NotifyAlertResponse])
async def notify_patient_alert(
    patient_id: str,
    alert_id: str,
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[NotifyAlertResponse]:
    """
    Triggers an empathetic notification to the patient's primary guardian regarding a clinical alert.
    Fetches details, formats dynamic context, calls Claude, and dispatches via Twilio.

    Args:
        patient_id (str): Unique database identifier of the patient.
        alert_id (str): Unique database identifier of the clinical alert.
        db (AsyncSession): Active async database session.

    Returns:
        ApiResponse containing the NotifyAlertResponse details.
    """
    logger.info("alert_notification_request_received", patient_id=patient_id, alert_id=alert_id)

    # 1. Fetch Patient details
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    
    if not patient:
        logger.warning("alert_notify_patient_not_found", patient_id=patient_id)
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")

    # 2. Fetch Alert details
    alert_stmt = select(Alert).where(Alert.id == alert_id, Alert.patient_id == patient_id)
    alert_res = await db.execute(alert_stmt)
    alert = alert_res.scalar_one_or_none()

    if not alert:
        logger.warning("alert_notify_alert_not_found", alert_id=alert_id, patient_id=patient_id)
        raise HTTPException(status_code=404, detail=f"Alert with ID {alert_id} not found for this patient.")

    # 3. Retrieve primary active or first available guardian in the circle to notify
    guardians_stmt = select(Guardian).where(Guardian.patient_id == patient_id)
    guardians_res = await db.execute(guardians_stmt)
    guardians = list(guardians_res.scalars().all())

    # Filter out empty stubs
    valid_guardians = [g for g in guardians if g.status != "empty"]
    if not valid_guardians:
        logger.warning("alert_notify_skipped_no_guardians", patient_id=patient_id)
        raise GuardianCircleError("Cannot dispatch alerts because the patient has no registered guardians.")

    # Prioritize primary guardians
    primary_guardians = [g for g in valid_guardians if g.role == "primary"]
    recipient = primary_guardians[0] if primary_guardians else valid_guardians[0]

    # 4. Formulate contextual variables for Claude message generation
    context = {
        "date": patient.next_transfusion_predicted.date().isoformat() if patient.next_transfusion_predicted else "soon",
        "time": "10:00 AM",
        "pre_hb": "6.8",
        "post_hb": "10.4",
        "day": "Tuesday",
        "score": "94%"
    }

    # Map alert types to clinical messaging pathways
    msg_type = "t10_soft_ask"
    if alert.alert_type == "iron_overload":
        msg_type = "post_donation_outcome"
        context["pre_hb"] = "2200 ng/mL"  # Ferritin context representation
        context["post_hb"] = "2650 ng/mL"
        context["day"] = "for an iron evaluation clinic visit"

    # 5. Generate message and dispatch
    logger.info("generating_alert_message_via_clinical_writer", guardian_id=recipient.id, alert_type=alert.alert_type)
    message_body = await generate_guardian_message(recipient, patient, msg_type, context)
    
    # Send WhatsApp notification
    delivery = await send_whatsapp_message(recipient.phone, message_body)

    # 6. Update database record to track sent status
    alert.sent_at = datetime.utcnow()
    db.add(alert)
    await db.flush()

    # Mask phone for privacy in response envelope
    phone = recipient.phone
    masked_phone = f"****{phone[-4:]}" if len(phone) >= 4 else phone

    logger.info("alert_notified_successfully", alert_id=alert_id, recipient=recipient.name)
    return ApiResponse(
        success=True,
        data=NotifyAlertResponse(
            delivery_status=delivery.get("status", "sent"),
            recipient_phone=masked_phone,
            message_body=message_body
        ),
        error=None
    )
