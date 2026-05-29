import pytest
from datetime import date, datetime
from sqlalchemy import select

from db.session import get_session_maker
from models.patient import Patient
from models.hb_reading import HbReading
from models.forecast import Forecast
from models.guardian import Guardian
from models.blood_bank import BloodBank
from models.inventory import Inventory
from models.alert import Alert
from ml.noor_engine.hb_forecaster import generate_forecast
from ml.noor_engine.alloimmunization import detect_alloimmunization
from ml.noor_engine.iron_overload_detector import detect_iron_overload

@pytest.mark.asyncio
async def test_prophet_forecast_sufficient_data():
    """
    1. test_prophet_forecast_sufficient_data:
    Passes Priya's 41 sawtooth readings. Asserts predicted date crosses around
    November 3rd, 2024 and confidence matches bounds.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        # Fetch Priya and her readings
        stmt = select(Patient).where(Patient.name == "Priya")
        res = await session.execute(stmt)
        patient = res.scalar_one_or_none()
        
        assert patient is not None, "Priya must exist in the database from seed data."
        readings = patient.hb_readings
        assert len(readings) >= 24, "Priya must have at least 24 readings."
        
        # Run forecast pipeline
        forecast_res = await generate_forecast(patient.id, readings, patient.age)
        
        assert forecast_res is not None, "Forecast should be successfully generated."
        predicted_date, conf_lower, conf_upper, conf_pct, forecast_points, status = forecast_res
        
        # Verify predicted date falls in early November (linear sawtooth decay target is Nov 3rd)
        assert predicted_date is not None
        assert date(2024, 11, 1) <= predicted_date <= date(2024, 11, 6)
        
        # Verify confidence matches bounds and Priya's custom standard percentage (89.0%)
        assert conf_lower <= predicted_date <= conf_upper
        assert conf_pct == 89.0
        assert len(forecast_points) == 60


@pytest.mark.asyncio
async def test_prophet_forecast_insufficient_data():
    """
    2. test_prophet_forecast_insufficient_data:
    Passes fewer than 3 readings. Asserts model returns None gracefully.
    """
    # Create two dummy readings
    dummy_readings = [
        HbReading(
            id="dummy-1",
            patient_id="test-patient-id",
            hb_value=10.5,
            reading_date=datetime(2024, 10, 1),
            post_transfusion=True,
            units_transfused=1,
            hb_rise_per_unit=2.0
        ),
        HbReading(
            id="dummy-2",
            patient_id="test-patient-id",
            hb_value=7.2,
            reading_date=datetime(2024, 10, 20),
            post_transfusion=False
        )
    ]
    
    forecast_res = await generate_forecast("test-patient-id", dummy_readings, 9)
    assert forecast_res is None, "Forecaster must return None for fewer than 3 readings."


@pytest.mark.asyncio
async def test_cusum_normal_patient():
    """
    3. test_cusum_normal_patient:
    Passes Priya's readings. Asserts alloimmunization_flag is False.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        # Fetch Priya and her readings
        stmt = select(Patient).where(Patient.name == "Priya")
        res = await session.execute(stmt)
        patient = res.scalar_one_or_none()
        
        assert patient is not None
        sorted_readings = sorted(patient.hb_readings, key=lambda r: r.reading_date)
        
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
        
        flagged, final_cusum, evidence = detect_alloimmunization(readings_dicts)
        assert flagged is False, "Priya has normal rise patterns and should not be flagged."


@pytest.mark.asyncio
async def test_cusum_alloimmunized_patient():
    """
    4. test_cusum_alloimmunized_patient:
    Passes Vikram's declining rise data. Asserts alloimmunization_flag is True
    and CUSUM has triggered based on positive threshold H = 0.4.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        # Fetch Vikram and his readings
        stmt = select(Patient).where(Patient.name == "Vikram")
        res = await session.execute(stmt)
        patient = res.scalar_one_or_none()
        
        assert patient is not None
        sorted_readings = sorted(patient.hb_readings, key=lambda r: r.reading_date)
        
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
        
        flagged, final_cusum, evidence = detect_alloimmunization(readings_dicts)
        
        # Assert CUSUM calculation correctly triggers alloimmunization
        assert flagged is True, "Vikram's declining Hb rise should be flagged."
        # Cycle 4 rise is 0.9, deviation is 1.9 - 0.9 = 1.0. CUSUM term is 1.0 - 0.5 = 0.5.
        # Cumulative sum = max(0, 0 + 0.5) = 0.5. This crosses threshold H = 0.4.
        assert final_cusum == 0.5


@pytest.mark.asyncio
async def test_cusum_early_stage():
    """
    5. test_cusum_early_stage:
    Passes 3 readings of Vikram. Asserts no trigger due to fewer than 4 required readings.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        # Fetch Vikram and his readings
        stmt = select(Patient).where(Patient.name == "Vikram")
        res = await session.execute(stmt)
        patient = res.scalar_one_or_none()
        
        assert patient is not None
        # Sort and take only first 3 readings
        sorted_readings = sorted(patient.hb_readings, key=lambda r: r.reading_date)[:3]
        
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
        
        flagged, final_cusum, evidence = detect_alloimmunization(readings_dicts)
        
        # Verify that CUSUM rejects it and doesn't trigger
        assert flagged is False
        assert final_cusum == 0.0
        assert "Insufficient post-transfusion cycles" in evidence[0]
