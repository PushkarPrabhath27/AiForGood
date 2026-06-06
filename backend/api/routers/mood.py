from __future__ import annotations
import asyncio
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.config import settings
from core.constants import MOOD_RISK_MAP, MOOD_LABELS, MOOD_EMOJIS
from core.exceptions import PatientNotFoundError
from core.logging import logger
from db.session import get_db_session
from models.patient import Patient
from models.mood_log import MoodLog
from schemas.common import ApiResponse
from schemas.mood import MoodLogResponse, MoodLogListResponse, MoodCheckTriggerResponse
from services.messaging_service import send_telegram_message
from services.bedrock_service import invoke_bedrock_converse
from services.mood_event_service import get_mood_queue

router = APIRouter()


async def _generate_mood_prompt(patient_name: str) -> str:
    system_prompt = (
        "You are a compassionate clinical coordinator for RaktaSetu NOOR, a Thalassemia care "
        "platform. Generate warm, brief messages checking in on a patient's mood. "
        "Use the patient's name naturally. Max 2 sentences. No greetings or sign-offs."
    )
    prompt = (
        f"Write a brief, warm check-in message asking how {patient_name} is feeling today. "
        f"The patient will select from mood options: Good, Okay, or Stressed. "
        f"Make it feel personal and caring, like a friend checking in."
    )
    try:
        generated = await invoke_bedrock_converse(prompt, system_prompt, max_tokens=100, temperature=0.8)
        return generated.strip().strip('"')
    except Exception as exc:
        logger.warning("bedrock_mood_prompt_failed_falling_back", error=str(exc))
        return f"Hey! How is {patient_name} feeling today? Please select their mood below:"


async def _generate_mood_confirmation(
    patient_name: str,
    mood_label: str,
    mood_score: int,
    is_stressed_sequence: bool = False,
) -> str:
    system_prompt = (
        "You are a compassionate clinical coordinator for RaktaSetu NOOR. Generate brief, "
        "warm confirmation messages acknowledging a patient's mood check-in. "
        "Max 2 sentences. No greetings. Be empathetic and encouraging."
    )
    context = (
        f"The patient's mood has been logged as '{mood_label}'. "
        f"Generate a warm confirmation message acknowledging {patient_name}'s mood."
    )
    if mood_score == 1:
        context += (
            f" Also include a brief supportive sentence about self-care, like a breathing "
            f"exercise or contacting their counselor. Keep it gentle and caring."
        )
    elif mood_score == 3:
        context += " Express warmth and positivity."

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


# ── Routes ─────────────────────────────────────────────────────────────────────


@router.post("/mood/trigger/{patient_id}", response_model=ApiResponse[MoodCheckTriggerResponse])
async def trigger_mood_check(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[MoodCheckTriggerResponse]:
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()

    if not patient:
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")

    chat_id = settings.telegram_chat_id
    if not chat_id:
        return ApiResponse(
            success=True,
            data=MoodCheckTriggerResponse(
                status="skipped",
                message="TELEGRAM_CHAT_ID not configured. Mood check skipped.",
                chat_id=None,
            ),
        )

    prompt = await _generate_mood_prompt(patient.name)

    buttons = [
        {
            "id": f"mood:3:{patient_id}",
            "title": f"{MOOD_EMOJIS[3]} Good / Energetic",
        },
        {
            "id": f"mood:2:{patient_id}",
            "title": f"{MOOD_EMOJIS[2]} Okay / Tired",
        },
        {
            "id": f"mood:1:{patient_id}",
            "title": f"{MOOD_EMOJIS[1]} Stressed / Depressed",
        },
    ]

    await send_telegram_message(chat_id=chat_id, message=prompt, buttons=buttons)

    logger.info(
        "mood_check_triggered",
        patient_id=patient_id,
        patient_name=patient.name,
        chat_id=chat_id,
    )

    return ApiResponse(
        success=True,
        data=MoodCheckTriggerResponse(
            status="sent",
            message=f"Mood check prompt sent via Telegram for {patient.name}.",
            chat_id=chat_id,
        ),
    )


@router.get("/mood/logs/{patient_id}", response_model=ApiResponse[MoodLogListResponse])
async def get_mood_logs(
    patient_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[MoodLogListResponse]:
    stmt = (
        select(MoodLog)
        .where(MoodLog.patient_id == patient_id)
        .order_by(desc(MoodLog.timestamp))
        .limit(limit)
    )
    res = await db.execute(stmt)
    logs = list(res.scalars().all())

    return ApiResponse(
        success=True,
        data=MoodLogListResponse(logs=logs, total=len(logs)),
    )


@router.get("/mood/logs/{patient_id}/latest", response_model=ApiResponse[MoodLogResponse])
async def get_latest_mood_log(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[MoodLogResponse]:
    stmt = (
        select(MoodLog)
        .where(MoodLog.patient_id == patient_id)
        .order_by(desc(MoodLog.timestamp))
        .limit(1)
    )
    res = await db.execute(stmt)
    log = res.scalar_one_or_none()

    if not log:
        return ApiResponse(
            success=False,
            data=None,
            error={"code": "NO_MOOD_LOGS", "message": "No mood logs found for this patient."},
        )

    return ApiResponse(success=True, data=log)


@router.get("/mood/stream/{patient_id}")
async def stream_mood_updates(
    patient_id: str,
    request: Request,
):
    queue = get_mood_queue(patient_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            while True:
                if await request.is_disconnected():
                    logger.info("sse_client_disconnected", patient_id=patient_id)
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")
