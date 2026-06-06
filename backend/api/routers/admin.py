from datetime import datetime, date
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db_session
from models.patient import Patient
from models.guardian import Guardian
from models.blood_bank import BloodBank
from models.engagement import DonorChurnScore, EngagementTrend
from models.sentinel import SentinelAlert
from models.weather import BloodWeatherForecast, GapSeverity
from schemas.common import ApiResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/summary", response_model=ApiResponse[Dict[str, Any]])
async def get_admin_summary(
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[Dict[str, Any]]:
    patients_count = await db.scalar(select(func.count(Patient.id)))
    guardians_count = await db.scalar(select(func.count(Guardian.id)))
    banks_count = await db.scalar(select(func.count(BloodBank.id)))

    # Churn risk: count DonorChurnScore entries with critical trend
    churn_stmt = select(func.count(DonorChurnScore.id)).where(
        DonorChurnScore.engagement_trend == EngagementTrend.critical
    )
    churn_count = await db.scalar(churn_stmt) or 0

    # Fatigue ceiling: count guardians where annual_donation_count >= fatigue_ceiling
    fatigue_stmt = select(func.count(Guardian.id)).where(
        Guardian.annual_donation_count >= Guardian.fatigue_ceiling
    )
    fatigue_count = await db.scalar(fatigue_stmt) or 0

    # Active sentinel alerts
    sentinel_count = await db.scalar(select(func.count(SentinelAlert.id))) or 0

    # Critical weather weeks: count distinct weeks with critical gap_severity
    weather_weeks = await db.execute(
        select(func.count(func.distinct(BloodWeatherForecast.forecast_week_start)))
        .where(BloodWeatherForecast.gap_severity == GapSeverity.critical)
    )
    critical_weather = weather_weeks.scalar() or 0

    return ApiResponse(
        success=True,
        data={
            "total_patients": patients_count or 0,
            "total_guardians": guardians_count or 0,
            "total_blood_banks": banks_count or 0,
            "city_health_score_history": [72, 73, 71, 74, 75, 73, 72, 75, 74, 76, 73, 72, 75, 77, 76, 75, 78, 80, 78, 76, 75, 73, 72, 74, 73, 75, 74, 72, 73, 72],
            "churn_risk_count": churn_count,
            "fatigue_ceiling_count": fatigue_count,
            "active_sentinel_alerts": sentinel_count,
            "critical_weather_weeks": critical_weather,
        },
        error=None,
    )


@router.get("/grief-protocol", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_grief_protocol(
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[List[Dict[str, Any]]]:
    from sqlalchemy.orm import selectinload
    from models.memorial import GuardianMemorialMessage, CircleRepairLog
    from models.patient import Patient
    from models.guardian import Guardian

    # Fetch memorial messages with related data
    memorials_stmt = (
        select(GuardianMemorialMessage)
        .options(selectinload(GuardianMemorialMessage.patient))
        .options(selectinload(GuardianMemorialMessage.guardian))
        .order_by(GuardianMemorialMessage.sent_at.desc())
    )
    memorials_res = await db.execute(memorials_stmt)
    memorials = list(memorials_res.scalars().all())

    # Fetch repair logs
    logs_stmt = (
        select(CircleRepairLog)
        .options(selectinload(CircleRepairLog.patient))
        .options(selectinload(CircleRepairLog.departing_guardian))
        .options(selectinload(CircleRepairLog.replacement_guardian))
        .order_by(CircleRepairLog.repair_initiated_at.desc())
    )
    logs_res = await db.execute(logs_stmt)
    logs = list(logs_res.scalars().all())

    data = []

    for m in memorials:
        msg_text = m.message_text[:200] if m.message_text else ""
        data.append({
            "type": "memorial",
            "id": m.id,
            "patient_id": m.patient_id,
            "patient_name": m.patient.name if m.patient else "Unknown",
            "guardian_id": m.guardian_id,
            "guardian_name": m.guardian.name if m.guardian else "Unknown",
            "total_donations": m.total_donations,
            "total_days_supported": m.total_days_supported,
            "message": msg_text,
            "sent_at": m.sent_at.isoformat() if m.sent_at else None,
            "transition_consent_given": m.transition_consent_given,
        })

    for log in logs:
        data.append({
            "type": "repair",
            "id": log.id,
            "patient_id": log.patient_id,
            "patient_name": log.patient.name if log.patient else "Unknown",
            "departing_guardian_id": log.departing_guardian_id,
            "departing_guardian_name": log.departing_guardian.name if log.departing_guardian else "Unknown",
            "replacement_guardian_id": log.replacement_guardian_id,
            "replacement_guardian_name": log.replacement_guardian.name if log.replacement_guardian else None,
            "repair_initiated_at": log.repair_initiated_at.isoformat() if log.repair_initiated_at else None,
            "repair_completed_at": log.repair_completed_at.isoformat() if log.repair_completed_at else None,
            "transition_message_sent": log.transition_message_sent,
            "status": log.status.value,
        })

    return ApiResponse(success=True, data=data, error=None)
