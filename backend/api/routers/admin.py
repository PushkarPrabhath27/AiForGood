from datetime import datetime
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db_session
from models.patient import Patient
from models.guardian import Guardian
from models.blood_bank import BloodBank
from schemas.common import ApiResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/summary", response_model=ApiResponse[Dict[str, Any]])
async def get_admin_summary(
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[Dict[str, Any]]:
    patients_count = await db.scalar(select(func.count(Patient.id)))
    guardians_count = await db.scalar(select(func.count(Guardian.id)))
    banks_count = await db.scalar(select(func.count(BloodBank.id)))
    return ApiResponse(
        success=True,
        data={
            "total_patients": patients_count or 0,
            "total_guardians": guardians_count or 0,
            "total_blood_banks": banks_count or 0,
            "city_health_score_history": [72, 73, 71, 74, 75, 73, 72, 75, 74, 76, 73, 72, 75, 77, 76, 75, 78, 80, 78, 76, 75, 73, 72, 74, 73, 75, 74, 72, 73, 72],
            "churn_risk_count": 2,
            "fatigue_ceiling_count": 1,
            "active_sentinel_alerts": 0,
            "critical_weather_weeks": 1,
        },
        error=None,
    )


@router.get("/grief-protocol", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_grief_protocol(
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[List[Dict[str, Any]]]:
    return ApiResponse(success=True, data=[], error=None)
