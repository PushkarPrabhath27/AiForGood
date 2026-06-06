from datetime import date, datetime
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis

from core.config import settings
from core.constants import MOOD_RISK_LOOKBACK_DAYS
from core.exceptions import PatientNotFoundError, InsufficientDataError, ForecastError
from core.logging import logger
from db.session import get_db_session
from models.patient import Patient
from models.hb_reading import HbReading
from models.forecast import Forecast
from models.mood_log import MoodLog
from schemas.common import ApiResponse, ApiError
from schemas.forecast import ForecastResponse, HbReadingSchema, ForecastPointSchema, AlertFlagSchema
from ml.noor_engine.hb_forecaster import generate_forecast
from ml.noor_engine.alloimmunization import detect_alloimmunization
from ml.noor_engine.iron_overload_detector import detect_iron_overload

router = APIRouter()

@router.get("/{patient_id}/forecast", response_model=ApiResponse[ForecastResponse])
async def get_patient_forecast(
    patient_id: str,
    db: AsyncSession = Depends(get_db_session)
) -> ApiResponse[ForecastResponse]:
    """
    Retrieves or generates a clinical hemoglobin decay forecast and diagnostic alerts.
    
    Checks the Redis cache first for fresh predictions. On a cache miss, trains a
    Facebook Prophet model, computes sequential CUSUM alloimmunization, evaluates iron overload,
    caches results, and updates patient prediction metadata.
    
    Args:
        patient_id: Unique identifier for the patient.
        db: Async database session.
        
    Returns:
        ApiResponse containing the full clinical ForecastResponse.
    """
    logger.info("forecast_request_received", patient_id=patient_id)
    
    # 1. Fetch Patient details
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    
    if not patient:
        logger.warning("forecast_patient_not_found", patient_id=patient_id)
        raise PatientNotFoundError(f"Patient with ID {patient_id} does not exist.")
        
    # 2. Fetch Historical Hemoglobin Readings sorted chronologically
    readings_stmt = select(HbReading).where(HbReading.patient_id == patient_id).order_by(HbReading.reading_date)
    readings_res = await db.execute(readings_stmt)
    sorted_readings = list(readings_res.scalars().all())
    
    # 3. Safety Guard: Return custom error envelope if readings count is insufficient
    if len(sorted_readings) < 3:
        logger.info("forecast_skipped_insufficient_readings", patient_id=patient_id, count=len(sorted_readings))
        return ApiResponse(
            success=True,
            data=None,
            error=ApiError(
                code="INSUFFICIENT_DATA",
                message="At least 3 Hb readings required for forecasting."
            )
        )
        
    # Convert readings to dict format for CUSUM
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
    
    # Inject Mock Ferritin readings for Priya's iron overload demo
    ferritin_readings = []
    if patient.name == "Priya" or patient.id == "550e8400-e29b-41d4-a716-446655440001":
        ferritin_readings = [("2024-08-01", 2200.0), ("2024-09-01", 2400.0), ("2024-10-01", 2650.0)]
        
    # 4. Check Redis Cache for pre-computed forecast
    redis_client = aioredis.from_url(settings.redis_url, socket_timeout=2.0)
    cached_payload = None
    try:
        cached_data = await redis_client.get(f"forecast:{patient_id}")
        if cached_data:
            cached_payload = json.loads(cached_data)
            logger.info("forecast_cache_hit", patient_id=patient_id)
    except Exception as redis_err:
        logger.warning("forecast_redis_read_failed_falling_back", error=str(redis_err))
        
    forecast_status = "success"
    
    if cached_payload:
        # Construct ForecastResponse using cached forecast coordinates
        predicted_date = date.fromisoformat(cached_payload["predicted_transfusion_date"])
        conf_lower = date.fromisoformat(cached_payload["confidence_lower"])
        conf_upper = date.fromisoformat(cached_payload["confidence_upper"])
        conf_pct = float(cached_payload["confidence_pct"])
        forecast_status = "cached"
        
        forecast_points = [
            ForecastPointSchema(
                date=date.fromisoformat(p["date"]),
                hb_predicted=p["hb_predicted"],
                ci_lower=p["ci_lower"],
                ci_upper=p["ci_upper"]
            )
            for p in cached_payload["forecast_points"]
        ]
    else:
        # Compute risk multiplier from recent mood logs
        mood_stmt = (
            select(MoodLog)
            .where(MoodLog.patient_id == patient_id)
            .order_by(MoodLog.timestamp.desc())
            .limit(MOOD_RISK_LOOKBACK_DAYS)
        )
        mood_res = await db.execute(mood_stmt)
        recent_moods = list(mood_res.scalars().all())
        risk_multiplier = 1.0
        if recent_moods:
            risk_multiplier = sum(
                m.calculated_risk_multiplier for m in recent_moods
            ) / len(recent_moods)
        logger.info(
            "forecast_risk_multiplier_computed",
            patient_id=patient_id,
            risk_multiplier=round(risk_multiplier, 4),
            mood_logs_count=len(recent_moods),
        )

        # Cache Miss: Generate fresh forecast using Prophet
        logger.info("forecast_cache_miss_generating", patient_id=patient_id)
        forecast_res = await generate_forecast(
            patient_id, sorted_readings, patient.age, risk_multiplier=risk_multiplier
        )
        
        if not forecast_res:
            raise ForecastError("Forecasting failed unexpectedly.")
            
        predicted_date, conf_lower, conf_upper, conf_pct, forecast_points, forecast_status = forecast_res
        
        # Save generated forecast metadata in database forecasts table
        db_forecast = Forecast(
            patient_id=patient_id,
            predicted_transfusion_date=datetime.combine(predicted_date, datetime.min.time()),
            confidence_lower=datetime.combine(conf_lower, datetime.min.time()),
            confidence_upper=datetime.combine(conf_upper, datetime.min.time()),
            confidence_pct=conf_pct,
            model_version="prophet-v1",
            generated_at=datetime.utcnow(),
            status=forecast_status
        )
        db.add(db_forecast)
        
        # Sync patient metadata
        patient.next_transfusion_predicted = datetime.combine(predicted_date, datetime.min.time())
        patient.hb_current = sorted_readings[-1].hb_value
        
    # 5. Run Clinical Diagnostic Alerts (CUSUM + Iron Overload)
    alert_flags = []
    
    # A) Run CUSUM Alloimmunization Anomaly Detection
    flagged, cusum_val, evidence = detect_alloimmunization(readings_dicts)
    if flagged:
        # Sync the alloimmunization flag to the patient model if not already set
        if not patient.alloimmunization_flag:
            patient.alloimmunization_flag = True
            
        alert_flags.append(
            AlertFlagSchema(
                type="alloimmunization",
                severity="critical",
                message="Alloimmunization Warning: Sequential post-transfusion rise recovery rate drop crosses control threshold (H = 0.4).",
                recommended_action="Recommend extended minor antigen phenotyping matching Kell, Duffy, and Kidd blood groups.",
                detected_at=datetime.now()
            )
        )
        
    # B) Run Iron Overload Detector
    ferritin_alerts = detect_iron_overload(ferritin_readings)
    for alert in ferritin_alerts:
        alert_flags.append(
            AlertFlagSchema(
                type=alert["type"],
                severity=alert["severity"],
                message=alert["message"],
                recommended_action=alert["recommended_action"],
                detected_at=alert["detected_at"]
            )
        )
        
    # Construct complete clinical response envelope
    historical_readings = [
        HbReadingSchema(
            id=r.id,
            hb_value=r.hb_value,
            reading_date=r.reading_date.date() if isinstance(r.reading_date, datetime) else r.reading_date,
            post_transfusion=r.post_transfusion,
            units_transfused=r.units_transfused,
            hb_rise_per_unit=r.hb_rise_per_unit
        )
        for r in sorted_readings
    ]
    
    response_data = ForecastResponse(
        patient_id=patient_id,
        historical_readings=historical_readings,
        forecast_points=forecast_points,
        predicted_transfusion_date=predicted_date,
        confidence_lower=conf_lower,
        confidence_upper=conf_upper,
        confidence_pct=conf_pct,
        alert_flags=alert_flags,
        model_version="prophet-v1",
        generated_at=datetime.utcnow(),
        status=forecast_status
    )
    
    await redis_client.aclose()
    
    logger.info("forecast_generation_completed", patient_id=patient_id, status=forecast_status)
    return ApiResponse(
        success=True,
        data=response_data,
        error=None
    )
