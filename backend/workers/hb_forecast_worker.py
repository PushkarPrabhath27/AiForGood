from __future__ import annotations
import json
from datetime import datetime, date
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis

from core.config import settings
from core.logging import logger
from models.patient import Patient
from models.hb_reading import HbReading
from models.forecast import Forecast
from ml.noor_engine.hb_forecaster import generate_forecast

# Redis socket configurations
REDIS_SOCKET_TIMEOUT: float = 2.0
REDIS_CACHE_TTL: int = 86400  # 24 hours


async def run_hb_forecast_worker(db: AsyncSession) -> Dict[str, Any]:
    """
    Background worker that aggregates all patients with sufficient readings
    and regenerates their Prophet forecasts, updating the DB and caching in Redis.

    Args:
        db (AsyncSession): Active async database session.

    Returns:
        Dict[str, Any]: Execution stats summary.
    """
    logger.info("hb_forecast_worker_started")
    start_time = datetime.utcnow()

    # 1. Query all patients
    patients_stmt = select(Patient)
    patients_res = await db.execute(patients_stmt)
    patients = list(patients_res.scalars().all())

    success_count = 0
    failure_count = 0
    skipped_count = 0

    redis_client = aioredis.from_url(settings.redis_url, socket_timeout=REDIS_SOCKET_TIMEOUT)

    try:
        for patient in patients:
            # 2. Query readings for the patient sorted chronologically
            readings_stmt = select(HbReading).where(
                HbReading.patient_id == patient.id
            ).order_by(HbReading.reading_date)
            
            readings_res = await db.execute(readings_stmt)
            sorted_readings = list(readings_res.scalars().all())

            # 3. Check readings boundary
            if len(sorted_readings) < 3:
                logger.info(
                    "forecast_worker_skipped_patient_insufficient_data",
                    patient_id=patient.id,
                    readings_count=len(sorted_readings)
                )
                skipped_count += 1
                continue

            try:
                # 4. Generate Prophet prediction
                forecast_res = await generate_forecast(patient.id, sorted_readings, patient.age)
                if not forecast_res:
                    failure_count += 1
                    continue
                
                predicted_date, conf_lower, conf_upper, conf_pct, forecast_points, forecast_status = forecast_res

                # 5. Insert Forecast record into Database
                db_forecast = Forecast(
                    patient_id=patient.id,
                    predicted_transfusion_date=datetime.combine(predicted_date, datetime.min.time()),
                    confidence_lower=datetime.combine(conf_lower, datetime.min.time()),
                    confidence_upper=datetime.combine(conf_upper, datetime.min.time()),
                    confidence_pct=conf_pct,
                    model_version="prophet-v1",
                    generated_at=datetime.utcnow(),
                    status=forecast_status
                )
                db.add(db_forecast)

                # 6. Sync patient model metadata
                patient.next_transfusion_predicted = datetime.combine(predicted_date, datetime.min.time())
                patient.hb_current = sorted_readings[-1].hb_value
                db.add(patient)

                # 7. Refresh/Cache in Redis
                cache_payload = {
                    "patient_id": patient.id,
                    "predicted_transfusion_date": predicted_date.isoformat(),
                    "confidence_lower": conf_lower.isoformat(),
                    "confidence_upper": conf_upper.isoformat(),
                    "confidence_pct": conf_pct,
                    "forecast_points": [
                        {
                            "date": p.date.isoformat() if isinstance(p.date, (date, datetime)) else p.date,
                            "hb_predicted": p.hb_predicted,
                            "ci_lower": p.ci_lower,
                            "ci_upper": p.ci_upper
                        }
                        for p in forecast_points
                    ]
                }
                
                try:
                    await redis_client.setex(
                        f"forecast:{patient.id}",
                        REDIS_CACHE_TTL,
                        json.dumps(cache_payload)
                    )
                except Exception as redis_err:
                    logger.warning("forecast_worker_redis_cache_write_failed", patient_id=patient.id, error=str(redis_err))
                
                success_count += 1
                logger.info("forecast_worker_completed_for_patient", patient_id=patient.id)

            except Exception as pat_err:
                failure_count += 1
                logger.error(
                    "forecast_worker_failed_for_patient",
                    patient_id=patient.id,
                    error=str(pat_err)
                )
                
        # Flush and save transactions
        await db.flush()

    finally:
        await redis_client.aclose()

    duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
    summary = {
        "job_name": "hb_forecast_worker",
        "patient_count": len(patients),
        "success_count": success_count,
        "failure_count": failure_count,
        "skipped_count": skipped_count,
        "duration_ms": duration_ms
    }
    
    logger.info("hb_forecast_worker_completed", **summary)
    return summary
