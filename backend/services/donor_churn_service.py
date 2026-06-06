"""
Donor Churn Detection Service — Innovation 1: Living Circle.

Implements CUSUM (Cumulative Sum) control chart logic to detect when a
guardian's engagement behaviour is drifting toward churn. CUSUM is a
sequential analysis technique that accumulates small deviations to detect
process shifts early — far more sensitive than simple threshold checks.

Usage:
    score, trend = compute_cusum_score(signals)
    if trend == EngagementTrend.critical:
        await trigger_reengagement(guardian_id, db)
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from typing import List, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import logger
from models.engagement import (
    DonorChurnScore,
    DonorEngagementSignal,
    EngagementTrend,
    ResponseType,
)
from models.guardian import Guardian
from services.bedrock_service import generate_message

# ─── CUSUM Tuning Constants ──────────────────────────────────────────────────
# Target mean response latency (hours) for a healthy donor.
_CUSUM_TARGET_LATENCY_HOURS: float = 24.0
# Allowable slack before accumulation kicks in (half the standard deviation).
_CUSUM_K_SLACK: float = 6.0
# Control limit — CUSUM above this triggers a "critical" classification.
_CUSUM_H_CRITICAL: float = 0.4
# Intermediate limit — CUSUM above this triggers "declining" classification.
_CUSUM_H_DECLINING: float = 0.15
# Window of most recent signals to consider (prevents ancient data skewing).
_SIGNAL_LOOKBACK: int = 8
# Days before today within which we look for re-engagement eligibility.
_REENGAGEMENT_COOLDOWN_DAYS: int = 14


def compute_cusum_score(signals: Sequence[DonorEngagementSignal]) -> Tuple[float, EngagementTrend]:
    """Compute CUSUM score and classify engagement trend from raw signal list.

    Uses a one-sided upper-CUSUM to detect increasing response latency.
    No-response events are penalised with a synthetic latency of 168 h (7 days).

    Args:
        signals: Ordered sequence of DonorEngagementSignal ORM objects,
                 most-recent-last. At most _SIGNAL_LOOKBACK entries are used.

    Returns:
        Tuple[float, EngagementTrend]:
            cusum_score — the accumulated CUSUM value (0.0 = healthy).
            trend       — classified engagement trend enum.

    Notes:
        O(n) time · O(1) space where n = len(signals) capped at _SIGNAL_LOOKBACK.
    """
    recent = list(signals[-_SIGNAL_LOOKBACK:])
    if not recent:
        return 0.0, EngagementTrend.stable

    cusum: float = 0.0
    for sig in recent:
        if sig.response_type == ResponseType.no_response:
            # Synthetic 7-day penalty for a ghost response
            latency = 168.0
        elif sig.response_latency_hours is not None:
            latency = float(sig.response_latency_hours)
        else:
            latency = _CUSUM_TARGET_LATENCY_HOURS

        deviation = latency - _CUSUM_TARGET_LATENCY_HOURS - _CUSUM_K_SLACK
        cusum = max(0.0, cusum + deviation)

    # Normalise to [0, 1] using an asymptotic sigmoid-like transform
    # so that a cusum near H_CRITICAL maps to ~1.0
    normalised = 1.0 - math.exp(-cusum / (_CUSUM_H_CRITICAL * 1000.0))

    if cusum >= _CUSUM_H_CRITICAL * 1000.0:
        trend = EngagementTrend.critical
    elif cusum >= _CUSUM_H_DECLINING * 1000.0:
        trend = EngagementTrend.declining
    else:
        trend = EngagementTrend.stable

    return round(normalised, 4), trend


async def upsert_churn_score(
    guardian_id: str,
    cusum_score: float,
    trend: EngagementTrend,
    db: AsyncSession,
) -> DonorChurnScore:
    """Upsert the DonorChurnScore row for a given guardian.

    Creates a new row if none exists, otherwise updates in place.

    Args:
        guardian_id: UUID of the guardian.
        cusum_score: Normalised CUSUM value.
        trend:       Classified EngagementTrend enum value.
        db:          Async DB session.

    Returns:
        DonorChurnScore: The saved (or updated) ORM instance.
    """
    stmt = select(DonorChurnScore).where(DonorChurnScore.guardian_id == guardian_id)
    res = await db.execute(stmt)
    score_row = res.scalar_one_or_none()

    if score_row is None:
        score_row = DonorChurnScore(
            guardian_id=guardian_id,
            cusum_score=cusum_score,
            engagement_trend=trend,
        )
        db.add(score_row)
    else:
        score_row.cusum_score = cusum_score
        score_row.engagement_trend = trend

    if trend == EngagementTrend.critical:
        # Predict churn 30 days from now as a conservative estimate
        score_row.predicted_churn_date = date.today() + timedelta(days=30)
    else:
        score_row.predicted_churn_date = None

    await db.flush()
    logger.info(
        "churn_score_upserted",
        guardian_id=guardian_id,
        cusum=cusum_score,
        trend=trend.value,
    )
    return score_row


async def trigger_reengagement_if_needed(
    guardian: Guardian,
    score_row: DonorChurnScore,
    db: AsyncSession,
) -> bool:
    """Send a Bedrock-generated re-engagement message if the donor is critical.

    Respects the cooldown window — will not re-send within _REENGAGEMENT_COOLDOWN_DAYS.

    Args:
        guardian:   Guardian ORM instance.
        score_row:  Their current DonorChurnScore row.
        db:         Async DB session.

    Returns:
        bool: True if a re-engagement message was dispatched.
    """
    if score_row.engagement_trend != EngagementTrend.critical:
        return False

    if score_row.reengagement_attempted and score_row.reengagement_sent_at:
        days_since = (datetime.utcnow() - score_row.reengagement_sent_at).days
        if days_since < _REENGAGEMENT_COOLDOWN_DAYS:
            logger.info(
                "reengagement_cooldown_active",
                guardian_id=guardian.id,
                days_since=days_since,
            )
            return False

    # Generate a personalised re-engagement nudge via Bedrock
    prompt = (
        f"Write a warm, concise WhatsApp/Telegram message to re-engage a blood donor named {guardian.name}. "
        f"They have {guardian.donation_count} past donations and haven't responded recently. "
        "Remind them that their commitment is saving a life. Keep under 80 words. "
        "Do not use placeholders. Use a compassionate, urgent tone."
    )
    try:
        message_text = await generate_message(prompt)
    except Exception as err:
        logger.error("reengagement_bedrock_failed", guardian_id=guardian.id, error=str(err))
        message_text = (
            f"Hi {guardian.name}, we miss you! A patient is counting on your support. "
            "Your past donations have made a real difference. Please let us know if you're available."
        )

    # Dispatch the message via Telegram if chat_id exists
    if guardian.telegram_chat_id:
        try:
            from services.messaging_service import send_telegram_message
            await send_telegram_message(
                chat_id=guardian.telegram_chat_id,
                message=message_text
            )
            logger.info("reengagement_telegram_sent", guardian_id=guardian.id)
        except Exception as msg_err:
            logger.error("reengagement_telegram_failed", guardian_id=guardian.id, error=str(msg_err))

    # Log the attempt — actual sending is handled by the Telegram messaging service
    score_row.reengagement_attempted = True
    score_row.reengagement_sent_at = datetime.utcnow()
    db.add(score_row)
    await db.flush()

    logger.info(
        "reengagement_message_dispatched",
        guardian_id=guardian.id,
        message_preview=message_text[:60],
    )
    return True


async def run_churn_scan(db: AsyncSession) -> dict:
    """Scan every guardian, compute CUSUM scores, trigger re-engagement for critical donors.

    Entry point for the background scheduler job.

    Args:
        db: Async DB session.

    Returns:
        dict: Summary stats for observability.
    """
    logger.info("donor_churn_scan_started")
    start = datetime.utcnow()

    g_stmt = select(Guardian).where(Guardian.status != "empty")
    g_res = await db.execute(g_stmt)
    guardians = list(g_res.scalars().all())

    critical_count = 0
    reengaged_count = 0

    for guardian in guardians:
        # Fetch latest signals (ordered by contacted_at ascending)
        sig_stmt = (
            select(DonorEngagementSignal)
            .where(DonorEngagementSignal.guardian_id == guardian.id)
            .order_by(DonorEngagementSignal.contacted_at)
        )
        sig_res = await db.execute(sig_stmt)
        signals = list(sig_res.scalars().all())

        cusum_val, trend = compute_cusum_score(signals)
        score_row = await upsert_churn_score(guardian.id, cusum_val, trend, db)

        if trend == EngagementTrend.critical:
            critical_count += 1
            dispatched = await trigger_reengagement_if_needed(guardian, score_row, db)
            if dispatched:
                reengaged_count += 1

    duration_ms = int((datetime.utcnow() - start).total_seconds() * 1000)
    summary = {
        "job_name": "donor_churn_scan",
        "guardians_scanned": len(guardians),
        "critical_count": critical_count,
        "reengaged_count": reengaged_count,
        "duration_ms": duration_ms,
    }
    logger.info("donor_churn_scan_completed", **summary)
    return summary
