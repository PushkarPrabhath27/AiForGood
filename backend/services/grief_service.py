"""
Grief Protocol Service — Innovation 5: Grief Protocol & Memorial.

Handles patient status transitions to 'deceased' with dignity:
1. Sets patient.status = 'deceased'
2. Generates a personalised memorial message per guardian via Bedrock
3. Logs messages to guardian_memorial_messages table
4. Creates a circle_repair_log entry for the departing circle
5. Optionally facilitates guardian-circle transition to a new patient

This service is intentionally careful: it does not auto-send messages.
Messages are generated and stored; dispatching is an explicit coordinator action.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import logger
from models.guardian import Guardian
from models.memorial import CircleRepairLog, GuardianMemorialMessage, RepairStatus
from models.patient import Patient
from services.bedrock_service import generate_message

# ─── Memorial Prompt Template ─────────────────────────────────────────────────
_MEMORIAL_PROMPT_TEMPLATE = (
    "Write a heartfelt, dignified memorial message to a blood donor named {guardian_name}. "
    "They supported patient {patient_name} through {donation_count} donations over {days_supported} days. "
    "Thank them for their compassion. Acknowledge the patient's passing with respect. "
    "Invite the donor to continue their legacy by potentially supporting another patient in need. "
    "The message should be under 120 words, warm, and not clinical. "
    "Do not use generic placeholders. Make it feel personal."
)


async def _generate_memorial_message(
    guardian_name: str,
    patient_name: str,
    donation_count: int,
    days_supported: int,
) -> str:
    """Generate a memorial message via Bedrock.

    Falls back to a respectful template on Bedrock failure.

    Args:
        guardian_name:  Name of the guardian to address.
        patient_name:   Name of the deceased patient.
        donation_count: Total donations the guardian made.
        days_supported: Total days the guardian was part of the circle.

    Returns:
        str: Generated memorial message text.
    """
    prompt = _MEMORIAL_PROMPT_TEMPLATE.format(
        guardian_name=guardian_name,
        patient_name=patient_name,
        donation_count=donation_count,
        days_supported=days_supported,
    )
    try:
        return await generate_message(prompt)
    except Exception as exc:
        logger.error("memorial_bedrock_failed", error=str(exc))
        return (
            f"Dear {guardian_name}, thank you for standing by {patient_name} "
            f"through {donation_count} donations. Your care made a profound difference. "
            "We honour their memory and invite you to carry this compassion forward."
        )


async def activate_grief_protocol(
    patient_id: str,
    db: AsyncSession,
    transition_patient_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute the full grief protocol for a deceased patient.

    Steps:
    1. Update patient status to 'deceased'.
    2. For each non-empty guardian, generate a memorial message.
    3. Persist all messages to guardian_memorial_messages.
    4. Create a circle_repair_log entry marking the departing circle.

    Args:
        patient_id:              UUID of the deceased patient.
        db:                      Async DB session.
        transition_patient_id:   Optional UUID of a new patient to transition
                                 the guardian circle to.

    Returns:
        Dict[str, Any]: Summary including patient_id, message_count, repair_log_id.

    Raises:
        ValueError: If patient is not found or already deceased.
    """
    # 1. Validate and update patient
    p_stmt = select(Patient).where(Patient.id == patient_id)
    p_res = await db.execute(p_stmt)
    patient = p_res.scalar_one_or_none()
    if patient is None:
        raise ValueError(f"Patient {patient_id!r} not found")
    if patient.status == "deceased":
        raise ValueError(f"Patient {patient_id!r} is already marked as deceased")

    patient.status = "deceased"
    db.add(patient)
    logger.info("grief_protocol_patient_status_updated", patient_id=patient_id)

    # 2. Fetch all active guardians
    g_stmt = select(Guardian).where(
        Guardian.patient_id == patient_id,
        Guardian.status != "empty",
    )
    g_res = await db.execute(g_stmt)
    guardians = list(g_res.scalars().all())

    # 3. Generate memorial messages
    now = datetime.now(timezone.utc)
    enrolled_at = patient.enrolled_at or now
    days_supported = max(0, (now - enrolled_at).days) if enrolled_at.tzinfo else 0

    messages_created: List[str] = []
    for guardian in guardians:
        msg_text = await _generate_memorial_message(
            guardian_name=guardian.name,
            patient_name=patient.name,
            donation_count=guardian.donation_count,
            days_supported=days_supported,
        )

        memorial = GuardianMemorialMessage(
            patient_id=patient_id,
            guardian_id=guardian.id,
            total_donations=guardian.donation_count,
            total_days_supported=days_supported,
            message_text=msg_text,
            sent_at=now,
            transition_consent_given=False,  # Coordinator must confirm
            transition_patient_id=transition_patient_id,
        )
        db.add(memorial)
        messages_created.append(guardian.id)

    await db.flush()

    # 4. Create circle_repair_log for the departing circle
    # Use the first guardian as the departing primary for the log entry
    departing_guardian_id = guardians[0].id if guardians else None
    repair_log_id: Optional[str] = None

    if departing_guardian_id:
        repair_log = CircleRepairLog(
            patient_id=patient_id,
            departing_guardian_id=departing_guardian_id,
            replacement_guardian_id=None,
            repair_initiated_at=now,
            transition_message_sent=False,
            status=RepairStatus.initiated,
        )
        db.add(repair_log)
        await db.flush()
        repair_log_id = repair_log.id

    await db.flush()

    result = {
        "patient_id": patient_id,
        "patient_name": patient.name,
        "guardians_notified": len(messages_created),
        "memorial_guardian_ids": messages_created,
        "repair_log_id": repair_log_id,
        "transition_patient_id": transition_patient_id,
    }
    logger.info("grief_protocol_completed", **result)
    return result


async def get_memorial_messages(
    patient_id: str,
    db: AsyncSession,
) -> List[Dict[str, Any]]:
    """Retrieve all memorial messages generated for a patient's circle.

    Args:
        patient_id: UUID of the deceased patient.
        db:         Async DB session.

    Returns:
        List[Dict]: Each dict contains guardian_id, message_text, sent_at.
    """
    stmt = select(GuardianMemorialMessage).where(
        GuardianMemorialMessage.patient_id == patient_id
    )
    res = await db.execute(stmt)
    rows = list(res.scalars().all())
    return [
        {
            "id": r.id,
            "guardian_id": r.guardian_id,
            "total_donations": r.total_donations,
            "total_days_supported": r.total_days_supported,
            "message_text": r.message_text,
            "sent_at": r.sent_at.isoformat(),
            "transition_consent_given": r.transition_consent_given,
            "transition_patient_id": r.transition_patient_id,
        }
        for r in rows
    ]
