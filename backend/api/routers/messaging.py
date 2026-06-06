from __future__ import annotations
import json
from datetime import datetime, date
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import redis.asyncio as aioredis

from core.config import settings
from core.constants import MOOD_RISK_MAP, MOOD_LABELS, ADHERENCE_RISK_CONSECUTIVE_DAYS
from core.logging import logger
from db.session import get_db_session
from models.patient import Patient
from models.guardian import Guardian
from models.alert import Alert
from models.mood_log import MoodLog
from schemas.common import ApiResponse
from services.messaging_service import send_telegram_message
from services.mobilization_service import trigger_mobilization
from services.bedrock_service import invoke_bedrock_converse
from services.mood_event_service import push_mood_event

router = APIRouter()

# ── Positive / negative reply detection ───────────────────────────────────────
_POSITIVE_WORDS = frozenset({"yes", "confirm", "active", "y", "agree", "support", "haan", "ji"})
_NEGATIVE_WORDS = frozenset({"no", "busy", "decline", "n", "reject", "unavailable", "nahi", "na"})

CONFIRM_CALLBACK_DATA: str = "confirm_donation"
DECLINE_CALLBACK_DATA: str = "decline_donation"


def _resolve_valence(
    callback_data: Optional[str],
    body_text: str,
) -> tuple[bool, bool]:
    """Return ``(is_positive, is_negative)`` from callback data or free text.

    Args:
        callback_data: Telegram inline-keyboard ``callback_data`` string, or ``None``.
        body_text: Raw text body of a non-button message.

    Returns:
        Tuple of two booleans: ``(is_positive, is_negative)``.
    """
    if callback_data == CONFIRM_CALLBACK_DATA:
        return True, False
    if callback_data == DECLINE_CALLBACK_DATA:
        return False, True

    lower = body_text.lower().strip()
    tokens = set(lower.split())
    is_positive = bool(tokens & _POSITIVE_WORDS)
    is_negative = bool(tokens & _NEGATIVE_WORDS)
    return is_positive, is_negative


async def _handle_mood_callback(
    callback_data: str,
    telegram_user_id: int,
    db: AsyncSession,
) -> Dict[str, Any]:
    parts = callback_data.split(":")
    if len(parts) < 3:
        logger.warning("malformed_mood_callback_data", callback_data=callback_data)
        return {"status": "failed", "reason": "malformed_callback_data"}

    mood_score = int(parts[1])
    patient_id = parts[2]
    mood_label = MOOD_LABELS.get(mood_score, "Unknown")
    risk_multiplier = MOOD_RISK_MAP.get(mood_score, 1.0)

    patient_stmt = select(Patient).where(Patient.id == patient_id)
    patient_res = await db.execute(patient_stmt)
    patient = patient_res.scalar_one_or_none()

    if not patient:
        logger.warning("mood_callback_patient_not_found", patient_id=patient_id)
        return {"status": "failed", "reason": "patient_not_found"}

    log = MoodLog(
        patient_id=patient_id,
        mood_score=mood_score,
        mood_label=mood_label,
        source="telegram",
        telegram_chat_id=str(telegram_user_id),
        calculated_risk_multiplier=risk_multiplier,
    )
    db.add(log)
    await db.flush()

    await _update_adherence_risk(patient_id, db, log)
    await _invalidate_forecast_cache(patient_id)

    await push_mood_event(patient_id, {
        "id": log.id,
        "patient_id": patient_id,
        "mood_score": mood_score,
        "mood_label": mood_label,
        "calculated_risk_multiplier": risk_multiplier,
        "timestamp": log.timestamp.isoformat() if hasattr(log.timestamp, 'isoformat') else str(log.timestamp),
    })

    confirmation = await _generate_mood_confirmation(patient.name, mood_label, mood_score)
    chat_id_str = str(telegram_user_id)
    await send_telegram_message(chat_id=chat_id_str, message=confirmation)

    logger.info(
        "mood_callback_processed",
        patient_id=patient_id,
        mood_score=mood_score,
        mood_label=mood_label,
    )

    return {
        "status": "success",
        "mood_score": mood_score,
        "mood_label": mood_label,
        "patient_id": patient_id,
        "risk_multiplier": risk_multiplier,
    }


async def _generate_mood_confirmation(
    patient_name: str,
    mood_label: str,
    mood_score: int,
) -> str:
    system_prompt = (
        "You are a compassionate clinical coordinator for RaktaSetu NOOR. Generate brief, "
        "warm confirmation messages acknowledging a patient's mood check-in. "
        "Max 2 sentences. No greetings. Be empathetic and encouraging."
    )
    context = f"The patient {patient_name}'s mood has been logged as '{mood_label}'."
    if mood_score == 1:
        context += (
            " Also include a brief supportive sentence about self-care, like a breathing "
            "exercise or contacting their counselor. Keep it gentle and caring."
        )
    elif mood_score == 3:
        context += " Express warmth and positivity."
    else:
        context += " Acknowledge the mood and offer support."

    try:
        generated = await invoke_bedrock_converse(context, system_prompt, max_tokens=120, temperature=0.7)
        return generated.strip().strip('"')
    except Exception as exc:
        logger.warning("bedrock_mood_confirmation_failed_falling_back", error=str(exc))
        fallbacks = {
            3: f"That's wonderful to hear! {patient_name}'s care team has been updated. Keep shining! \u2728",
            2: f"Thanks! {patient_name}'s mood has been noted. We're here to support. \ud83d\udc9b",
            1: (
                f"I notice {patient_name} has been feeling stressed lately. "
                f"Here is a quick 5-minute breathing exercise, or reach out to their "
                f"counselor for support. \ud83d\udc99"
            ),
        }
        return fallbacks.get(mood_score, f"Thanks! {patient_name}'s care team has been updated. \u2606")


async def _update_adherence_risk(
    patient_id: str,
    db: AsyncSession,
    current_log: MoodLog,
) -> None:
    stmt = (
        select(MoodLog)
        .where(MoodLog.patient_id == patient_id)
        .order_by(desc(MoodLog.timestamp))
        .limit(ADHERENCE_RISK_CONSECUTIVE_DAYS)
    )
    res = await db.execute(stmt)
    recent_logs = list(res.scalars().all())

    patient_stmt = select(Patient).where(Patient.id == patient_id)
    patient_res = await db.execute(patient_stmt)
    patient = patient_res.scalar_one_or_none()

    if not patient:
        return

    if len(recent_logs) >= ADHERENCE_RISK_CONSECUTIVE_DAYS and all(
        l.mood_score == 1 for l in recent_logs
    ):
        patient.adherence_risk = "high"
        logger.info(
            "adherence_risk_set_to_high",
            patient_id=patient_id,
            consecutive_depressed=ADHERENCE_RISK_CONSECUTIVE_DAYS,
        )
    else:
        patient.adherence_risk = "low"

    db.add(patient)


async def _invalidate_forecast_cache(patient_id: str) -> None:
    redis_client = aioredis.from_url(settings.redis_url, socket_timeout=2.0)
    try:
        await redis_client.delete(f"forecast:{patient_id}")
        logger.info("forecast_cache_invalidated_on_mood_update", patient_id=patient_id)
    except Exception as redis_err:
        logger.warning(
            "forecast_cache_invalidation_failed_on_mood_update",
            patient_id=patient_id,
            error=str(redis_err),
        )
    finally:
        await redis_client.aclose()


async def _find_guardian_by_telegram_id(
    telegram_user_id: int,
    db: AsyncSession,
) -> Optional[Guardian]:
    """Locate a Guardian by their stored ``telegram_chat_id``.

    Args:
        telegram_user_id: Telegram numeric user/chat ID from the incoming update.
        db: Active async database session.

    Returns:
        Matching Guardian, or ``None`` if not found.
    """
    stmt = select(Guardian).where(Guardian.telegram_chat_id == str(telegram_user_id))
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/messaging/telegram/webhook")
async def handle_telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Process incoming Telegram Bot webhook updates.

    Handles two update types:
    - ``callback_query``: Inline keyboard button tap (confirm / decline donation).
    - ``message``: Plain-text reply containing a positive or negative intent phrase.

    For each valid guardian response the handler:
    1. Transitions the Guardian's ``status`` field in the DB.
    2. Triggers a mobilization recalculation for the linked patient.
    3. Sends a Telegram confirmation reply back to the guardian.
    4. Logs a ``low_mobilization`` Alert in the DB when the response is negative.

    Args:
        request: Raw FastAPI request (Telegram sends raw JSON, no fixed schema).
        db: Active async database session.

    Returns:
        Dict containing execution ``status`` and updated ``guardian`` details.
    """
    try:
        update: Dict[str, Any] = await request.json()
    except Exception:
        logger.warning("telegram_webhook_invalid_json")
        return {"status": "skipped", "reason": "invalid_json"}

    logger.info("telegram_webhook_update_received", update_id=update.get("update_id"))

    # ── 1. Parse update type ───────────────────────────────────────────────────
    telegram_user_id: Optional[int] = None
    callback_data: Optional[str] = None
    body_text: str = ""
    sender_name: str = ""

    if "callback_query" in update:
        cq = update["callback_query"]
        telegram_user_id = cq.get("from", {}).get("id")
        callback_data = cq.get("data", "")
        sender_name = cq.get("from", {}).get("first_name", "")
        logger.info(
            "parsed_telegram_callback_query",
            user_id=telegram_user_id,
            callback_data=callback_data,
        )

    elif "message" in update:
        msg = update["message"]
        telegram_user_id = msg.get("from", {}).get("id")
        body_text = msg.get("text", "").strip()
        sender_name = msg.get("from", {}).get("first_name", "")
        logger.info(
            "parsed_telegram_text_message",
            user_id=telegram_user_id,
            text=body_text[:60],
        )

    else:
        logger.info("telegram_webhook_unrecognised_update_type", keys=list(update.keys()))
        return {"status": "skipped", "reason": "unrecognised_update_type"}

    if not telegram_user_id:
        return {"status": "failed", "reason": "missing_user_id"}

    # ── 2a. Mood Check Callback ────────────────────────────────────────────────
    if callback_data and callback_data.startswith("mood:"):
        return await _handle_mood_callback(callback_data, telegram_user_id, db)

    # ── 2b. Match Guardian ─────────────────────────────────────────────────────
    guardian = await _find_guardian_by_telegram_id(telegram_user_id, db)

    if not guardian:
        # Friendly onboarding reply — tells the user to register via the app
        logger.warning(
            "no_guardian_mapped_to_telegram_id",
            telegram_user_id=telegram_user_id,
        )
        await send_telegram_message(
            chat_id=str(telegram_user_id),
            message=(
                f"Hello {sender_name}! 👋 You are not yet registered in RaktaSetu NOOR. "
                "Please ask your clinical coordinator to link your Telegram account so "
                "you can start receiving donation requests."
            ),
        )
        return {"status": "failed", "reason": "guardian_not_found"}

    # ── 3. Retrieve associated Patient ────────────────────────────────────────
    patient_stmt = select(Patient).where(Patient.id == guardian.patient_id)
    patient_res = await db.execute(patient_stmt)
    patient = patient_res.scalar_one_or_none()

    if not patient:
        logger.error(
            "guardian_patient_not_found",
            guardian_id=guardian.id,
            patient_id=guardian.patient_id,
        )
        return {"status": "failed", "reason": "patient_not_found"}

    # ── 4. Resolve response valence ────────────────────────────────────────────
    is_positive, is_negative = _resolve_valence(callback_data, body_text)
    logger.info(
        "resolved_telegram_response_valence",
        guardian=guardian.name,
        patient=patient.name,
        is_positive=is_positive,
        is_negative=is_negative,
    )

    transfusion_date = (
        patient.next_transfusion_predicted.date().isoformat()
        if patient.next_transfusion_predicted
        else "soon"
    )
    chat_id = str(telegram_user_id)

    # ── 5. State machine transitions ───────────────────────────────────────────
    if is_positive:
        guardian.status = "active"
        db.add(guardian)
        await db.flush()

        predicted_date = (
            patient.next_transfusion_predicted.date()
            if patient.next_transfusion_predicted
            else date.today()
        )
        await trigger_mobilization(patient.id, predicted_date, db)

        confirm_reply = (
            f"🩸 Thank you, <b>{guardian.name}</b>! Your blood donation for "
            f"<b>{patient.name}</b> has been confirmed.\n\n"
            f"📅 Please arrive at the hospital on <b>{transfusion_date}</b>. "
            f"Your support saves lives! 💙"
        )
        await send_telegram_message(chat_id, confirm_reply)
        logger.info(
            "guardian_confirmed_donation_saved",
            guardian=guardian.name,
            status=guardian.status,
        )

    elif is_negative:
        guardian.status = "unavailable"
        db.add(guardian)
        await db.flush()

        predicted_date = (
            patient.next_transfusion_predicted.date()
            if patient.next_transfusion_predicted
            else date.today()
        )
        await trigger_mobilization(patient.id, predicted_date, db)

        alert_msg = (
            f"Primary guardian {guardian.name} has declined the donation "
            f"request for patient {patient.name}."
        )
        rec_action = (
            "Initiate emergency inventory match via RaktaGrid optimization "
            "immediately to secure alternative blood units."
        )
        alert = Alert(
            patient_id=patient.id,
            alert_type="low_mobilization",
            severity="critical",
            message=alert_msg,
            recommended_action=rec_action,
            sent_at=datetime.utcnow(),
            resolved_at=None,
        )
        db.add(alert)
        await db.flush()

        decline_reply = (
            f"We understand, <b>{guardian.name}</b>. Thank you for letting us know "
            f"quickly. 🙏 We will coordinate with other circle members to support "
            f"<b>{patient.name}</b>."
        )
        await send_telegram_message(chat_id, decline_reply)
        logger.warning(
            "guardian_declined_donation_alert_logged",
            guardian=guardian.name,
            status=guardian.status,
        )

    else:
        # Unrecognised input — send help nudge
        help_reply = (
            f"Hello <b>{guardian.name}</b>, we received your message. 📩\n\n"
            "Please reply with <b>Yes</b> to confirm your donation or "
            "<b>No</b> if you are unavailable."
        )
        await send_telegram_message(chat_id, help_reply)
        logger.info("unrecognised_telegram_response", text=body_text)

    await db.commit()
    return {
        "status": "success",
        "guardian": guardian.name,
        "new_status": guardian.status,
    }
