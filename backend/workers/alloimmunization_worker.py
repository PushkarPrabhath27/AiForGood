from __future__ import annotations
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.logging import logger
from models.patient import Patient
from models.hb_reading import HbReading
from models.alert import Alert
from ml.noor_engine.alloimmunization import detect_alloimmunization


async def run_alloimmunization_worker(patient_id: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Executes CUSUM statistical checks for an individual patient,
    saving any detected alloimmunization anomalies directly in the database.

    Args:
        patient_id (str): Unique database identifier of the patient.
        db (AsyncSession): Active async database session.

    Returns:
        Dict[str, Any]: Execution stats summary.
    """
    logger.info("alloimmunization_worker_started", patient_id=patient_id)
    start_time = datetime.utcnow()

    # 1. Retrieve Patient
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()

    if not patient:
        logger.warning("allo_worker_skipped_patient_not_found", patient_id=patient_id)
        return {"status": "patient_not_found", "flagged": False}

    # 2. Retrieve readings sorted chronologically
    readings_stmt = select(HbReading).where(
        HbReading.patient_id == patient_id
    ).order_by(HbReading.reading_date)
    readings_res = await db.execute(readings_stmt)
    sorted_readings = list(readings_res.scalars().all())

    # Map to expected structures
    readings_dicts = [
        {
            "id": r.id,
            "hb_value": r.hb_value,
            "reading_date": r.reading_date.date().isoformat() if isinstance(r.reading_date, datetime) else r.reading_date.isoformat(),
            "post_transfusion": r.post_transfusion,
            "units_transfused": r.units_transfused,
            "hb_rise_per_unit": r.hb_rise_per_unit
        }
        for r in sorted_readings
    ]

    # 3. Detect alloimmunization
    flagged, cusum_val, evidence = detect_alloimmunization(readings_dicts)
    
    if flagged:
        # Sync patient flag
        if not patient.alloimmunization_flag:
            patient.alloimmunization_flag = True
            db.add(patient)

        # 4. Check if an alert already exists in DB to prevent duplicate alerts
        alert_stmt = select(Alert).where(
            Alert.patient_id == patient_id,
            Alert.alert_type == "alloimmunization"
        )
        alert_res = await db.execute(alert_stmt)
        existing_alert = alert_res.scalar_one_or_none()

        if not existing_alert:
            # Create fresh Alert in database
            alert = Alert(
                patient_id=patient_id,
                alert_type="alloimmunization",
                severity="critical",
                message="Alloimmunization Warning: Sequential post-transfusion rise recovery rate drop crosses control threshold (H = 0.4).",
                recommended_action="Recommend extended minor antigen phenotyping matching Kell, Duffy, and Kidd blood groups.",
                sent_at=None,
                resolved_at=None
            )
            db.add(alert)
            logger.info("allo_worker_critical_alert_logged", patient_id=patient_id)

    await db.flush()

    duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
    summary = {
        "job_name": "alloimmunization_worker",
        "patient_id": patient_id,
        "flagged": flagged,
        "cusum_value": float(cusum_val),
        "duration_ms": duration_ms
    }
    
    logger.info("alloimmunization_worker_completed", **summary)
    return summary
