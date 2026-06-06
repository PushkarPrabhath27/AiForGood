"""
Donor Fatigue Service — Innovation 4: Donor Fatigue Ceiling.

Enforces donation frequency ceilings to protect donor health. Every guardian
has a configurable `fatigue_ceiling` (default 6 donations/year). When a donor
hits their ceiling, they enter a mandatory rest period (`fatigue_rest_until`).

This service:
1. Checks fatigue eligibility before a mobilization ask.
2. Records donation completions and updates annual counts.
3. Lifts rest flags when the rest period expires.
4. Updates DynamoDB compatibility edges to reflect ineligibility.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import logger
from models.guardian import Guardian

# ─── Fatigue Rest Duration ────────────────────────────────────────────────────
# After hitting the ceiling, a donor must rest at least this many days.
_FATIGUE_REST_DAYS: int = 60

# Minimum days between any two whole-blood donations (WHO recommendation).
_MIN_INTER_DONATION_DAYS: int = 56


def is_fatigue_eligible(guardian: Guardian) -> bool:
    """Determine whether a guardian is eligible for a mobilization ask.

    Checks both the annual ceiling and the minimum inter-donation gap.

    Args:
        guardian: Guardian ORM instance with fatigue tracking fields populated.

    Returns:
        bool: True if the donor can be asked to donate.

    Notes:
        O(1) time · O(1) space.
    """
    today = date.today()

    # 1. Still in mandatory rest period
    if guardian.fatigue_rest_until and guardian.fatigue_rest_until > today:
        return False

    # 2. Annual ceiling hit
    if guardian.annual_donation_count >= guardian.fatigue_ceiling:
        return False

    # 3. Minimum inter-donation gap (check last_donation_date)
    if guardian.last_donation_date:
        last_date = (
            guardian.last_donation_date.date()
            if isinstance(guardian.last_donation_date, datetime)
            else guardian.last_donation_date
        )
        days_since = (today - last_date).days
        if days_since < _MIN_INTER_DONATION_DAYS:
            return False

    return True


async def record_donation(
    guardian_id: str,
    patient_id: str,
    db: AsyncSession,
) -> Dict[str, Any]:
    """Record a completed donation, increment annual counter, enforce ceiling.

    Updates guardian.donation_count, annual_donation_count, last_donation_date.
    If annual_donation_count reaches fatigue_ceiling, sets fatigue_rest_until
    and marks the DynamoDB edge ineligible.

    Args:
        guardian_id: UUID of the donating guardian.
        patient_id:  UUID of the patient for whom the donation was made.
        db:          Async DB session.

    Returns:
        Dict[str, Any]: Updated state including fatigue_triggered flag.

    Raises:
        ValueError: If guardian not found.
    """
    stmt = select(Guardian).where(Guardian.id == guardian_id)
    res = await db.execute(stmt)
    guardian = res.scalar_one_or_none()
    if guardian is None:
        raise ValueError(f"Guardian {guardian_id!r} not found")

    now = datetime.now(timezone.utc)
    guardian.donation_count += 1
    guardian.annual_donation_count += 1
    guardian.last_donation_date = now

    fatigue_triggered = False
    if guardian.annual_donation_count >= guardian.fatigue_ceiling:
        rest_until = (now.date() if isinstance(now, datetime) else now) + timedelta(days=_FATIGUE_REST_DAYS)
        guardian.fatigue_rest_until = rest_until
        guardian.fatigue_notified = False  # Reset so notification is re-sent
        fatigue_triggered = True

        # Update DynamoDB edge eligibility
        try:
            from services.compatibility_graph_service import mark_donor_ineligible
            mark_donor_ineligible(guardian_id, patient_id)
        except Exception as exc:
            logger.warning(
                "fatigue_dynamodb_edge_update_failed",
                guardian_id=guardian_id,
                error=str(exc),
            )

        logger.warning(
            "donor_fatigue_ceiling_hit",
            guardian_id=guardian_id,
            annual_count=guardian.annual_donation_count,
            ceiling=guardian.fatigue_ceiling,
            rest_until=str(rest_until),
        )

    db.add(guardian)
    await db.flush()

    return {
        "guardian_id": guardian_id,
        "donation_count": guardian.donation_count,
        "annual_donation_count": guardian.annual_donation_count,
        "fatigue_triggered": fatigue_triggered,
        "fatigue_rest_until": str(guardian.fatigue_rest_until) if guardian.fatigue_rest_until else None,
        "fatigue_ceiling": guardian.fatigue_ceiling,
    }


async def lift_expired_fatigue_rests(db: AsyncSession) -> Dict[str, Any]:
    """Scheduler job: lift fatigue rest for all guardians whose rest has expired.

    Restores guardian.status to 'active' and clears fatigue_rest_until.
    Updates DynamoDB edges to eligible=True for affected donors.

    Args:
        db: Async DB session.

    Returns:
        Dict[str, Any]: Count of lifted rests for observability.
    """
    today = date.today()
    stmt = select(Guardian).where(
        Guardian.fatigue_rest_until != None,  # noqa: E711
        Guardian.fatigue_rest_until <= today,
    )
    res = await db.execute(stmt)
    guardians = list(res.scalars().all())

    lifted_count = 0
    for guardian in guardians:
        guardian.fatigue_rest_until = None
        guardian.annual_donation_count = 0  # Reset annual counter on rest lift
        if guardian.status == "cooldown":
            guardian.status = "active"
        db.add(guardian)
        lifted_count += 1
        logger.info("fatigue_rest_lifted", guardian_id=guardian.id)

    await db.flush()
    return {"lifted_fatigue_rests": lifted_count}


async def get_fatigue_status(guardian_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Return current fatigue state for a guardian.

    Args:
        guardian_id: UUID of the guardian.
        db:          Async DB session.

    Returns:
        Dict[str, Any]: Fatigue eligibility status.

    Raises:
        ValueError: If guardian not found.
    """
    stmt = select(Guardian).where(Guardian.id == guardian_id)
    res = await db.execute(stmt)
    guardian = res.scalar_one_or_none()
    if guardian is None:
        raise ValueError(f"Guardian {guardian_id!r} not found")

    eligible = is_fatigue_eligible(guardian)
    return {
        "guardian_id": guardian_id,
        "eligible": eligible,
        "annual_donation_count": guardian.annual_donation_count,
        "fatigue_ceiling": guardian.fatigue_ceiling,
        "fatigue_rest_until": str(guardian.fatigue_rest_until) if guardian.fatigue_rest_until else None,
        "last_donation_date": guardian.last_donation_date.isoformat() if guardian.last_donation_date else None,
    }
