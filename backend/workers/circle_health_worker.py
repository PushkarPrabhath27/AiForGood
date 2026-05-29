from __future__ import annotations
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.logging import logger
from models.patient import Patient
from models.guardian import Guardian
from models.alert import Alert
from services.guardian_service import calculate_circle_health


async def run_circle_health_worker(db: AsyncSession) -> Dict[str, Any]:
    """
    Scans all registered patient guardian networks, continuous health scoring,
    and creates critical alerts for degraded network circle statuses.

    Args:
        db (AsyncSession): Active async database session.

    Returns:
        Dict[str, Any]: Execution stats summary.
    """
    logger.info("circle_health_worker_started")
    start_time = datetime.utcnow()

    # 1. Query all patients
    stmt = select(Patient)
    res = await db.execute(stmt)
    patients = list(res.scalars().all())

    checked_count = 0
    degraded_count = 0

    for patient in patients:
        # 2. Retrieve patient guardians
        g_stmt = select(Guardian).where(Guardian.patient_id == patient.id)
        g_res = await db.execute(g_stmt)
        guardians = list(g_res.scalars().all())

        # 3. Calculate scores
        scores = calculate_circle_health(guardians, patient.id)
        checked_count += 1

        # Determine if circle health is degraded (coverage < 100 or resilience < 50)
        is_degraded = scores["coverage_score"] < 100.0 or scores["resilience_score"] < 50.0

        if is_degraded:
            degraded_count += 1
            
            # Check if alert already logged
            alert_stmt = select(Alert).where(
                Alert.patient_id == patient.id,
                Alert.alert_type == "low_mobilization"
            )
            alert_res = await db.execute(alert_stmt)
            existing_alert = alert_res.scalar_one_or_none()

            if not existing_alert:
                # Add alert to database
                alert = Alert(
                    patient_id=patient.id,
                    alert_type="low_mobilization",
                    severity="warning",
                    message="Degraded Guardian Circle: Network coverage is below 100% or pair-survivability resilience is insufficient.",
                    recommended_action="Contact regional care coordinator or trigger circle repair search immediately.",
                    sent_at=None,
                    resolved_at=None
                )
                db.add(alert)
                logger.warning("circle_health_degraded_alert_registered", patient_id=patient.id, scores=scores)

    await db.flush()

    duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
    summary = {
        "job_name": "circle_health_worker",
        "patient_count": len(patients),
        "checked_count": checked_count,
        "degraded_count": degraded_count,
        "duration_ms": duration_ms
    }
    
    logger.info("circle_health_worker_completed", **summary)
    return summary
