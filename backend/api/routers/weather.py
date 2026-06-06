"""
Blood Weather API Router — Innovation 6.

Exposes endpoints for:
- GET  /weather/{city_code}     — retrieve current week's forecast for a city
- POST /weather/generate        — trigger an on-demand forecast generation
- GET  /weather/cities          — list all city codes with available forecasts
"""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from models.weather import BloodWeatherForecast
from services.blood_weather_service import generate_blood_weather_forecast, get_weather_forecast

router = APIRouter(prefix="/weather", tags=["Blood Weather"])


@router.get(
    "/{city_code}",
    response_model=List[Dict[str, Any]],
    summary="Get blood weather forecast for a city",
)
async def get_city_forecast(
    city_code: str,
    week_start: date = Query(default=None, description="Forecast week start (defaults to today)"),
    db: AsyncSession = Depends(get_db_session),
) -> List[Dict[str, Any]]:
    """Return the weekly blood supply-demand gap forecast for a city.

    Results are sorted by severity (critical first). If no forecast exists
    for the requested week, returns an empty list — call POST /weather/generate first.

    - **city_code**: 3-letter city code (e.g. 'HYD', 'MUM').
    - **week_start**: ISO date for the forecast week start (optional).
    """
    return await get_weather_forecast(city_code.upper(), db, week_start)


@router.post(
    "/generate",
    response_model=Dict[str, Any],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger blood weather forecast generation",
)
async def trigger_forecast_generation(
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Run an on-demand blood weather forecast for all cities and blood types.

    Derives city codes from patient hospital_id prefixes and computes demand
    from next_transfusion_predicted windows. Supply is read from inventory.
    """
    result = await generate_blood_weather_forecast(db)
    return result


@router.get(
    "/",
    response_model=List[str],
    summary="List city codes with available forecasts",
)
async def list_forecast_cities(
    db: AsyncSession = Depends(get_db_session),
) -> List[str]:
    """Return distinct city codes that have blood weather forecast data."""
    stmt = select(func.distinct(BloodWeatherForecast.city_code))
    res = await db.execute(stmt)
    return sorted(list(res.scalars().all()))
