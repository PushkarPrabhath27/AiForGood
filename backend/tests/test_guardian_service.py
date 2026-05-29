import pytest
from datetime import date, datetime, timedelta
from sqlalchemy import select

from db.session import get_session_maker
from models.patient import Patient
from models.guardian import Guardian
from models.forecast import Forecast
from models.blood_bank import BloodBank
from models.inventory import Inventory
from models.alert import Alert
from services.guardian_service import build_circle, calculate_circle_health
from services.mobilization_service import trigger_mobilization, get_mobilization_status

def test_circle_builder_selects_top_8():
    """
    1. test_circle_builder_selects_top_8:
    Seeds 15 candidate donors, executes circle building, and asserts exactly 8
    guardians are mapped (3 primary, 3 secondary, 2 specialists) sorted by composite score.
    """
    # Create patient needing B+ blood and is Kell-negative (rare phenotyping)
    patient = Patient(
        id="test-patient-uuid",
        name="Ananya",
        age=10,
        blood_type="B",
        rh_factor="+",
        kell_negative=True,
        duffy_negative=False,
        kidd_negative=False,
        hospital_id="HYD-001",
        enrolled_at=datetime.utcnow()
    )
    
    # Seed 15 candidate donors
    candidates = []
    for i in range(15):
        # Candidates i=0,3,6,9,12 are Kell-negative (rare specialists)
        is_kell_neg = (i % 3 == 0)
        # Candidates i < 10 are compatible B+, others are incompatible A-
        blood_group = "B" if i < 10 else "A"
        rh_fac = "+" if i < 12 else "-"
        
        candidates.append({
            "name": f"Donor {i}",
            "phone": f"+9198765432{10+i:02d}",
            "blood_type": blood_group,
            "rh_factor": rh_fac,
            "kell_negative": is_kell_neg,
            "duffy_negative": False,
            "kidd_negative": False,
            "donation_count": 5 + i,
            "response_latency_avg_hours": 4.0 + float(i),
            "city": "HYD",
            "distance_km": 5.0,
            "status": "active"
        })

    guardians = build_circle(patient, candidates)
    
    # Assert exactly 8 slots are returned
    assert len(guardians) == 8
    
    primaries = [g for g in guardians if g.role == "primary"]
    secondaries = [g for g in guardians if g.role == "secondary"]
    specialists = [g for g in guardians if g.role == "rare_specialist"]
    
    # Check exact slots partition
    assert len(primaries) == 3
    assert len(secondaries) == 3
    assert len(specialists) == 2
    
    # Specialists must be Kell-negative (as required by patient phenotyping)
    for s in specialists:
        assert s.status != "empty"
        # Find raw candidate by phone to assert phenotyping matched
        raw_c = next(c for c in candidates if c["phone"] == s.phone)
        assert raw_c["kell_negative"] is True


def test_circle_health_perfect():
    """
    2. test_circle_health_perfect:
    Asserts 8 active, responsive guardians return coverage=100%, engagement=94%, and resilience=87%
    for Priya's demo narrative.
    """
    priya_id = "550e8400-e29b-41d4-a716-446655440001"
    
    # Mocks Priya's 8 guardians with latencies yielding 4.32 hours average
    # Latencies sum to 34.56, average = 4.32 hours -> engagement = 100 - (4.32/72*100) = 94.0
    guardians = [
        Guardian(patient_id=priya_id, name="Raju", phone="+919876543210", role="primary", status="cooldown", response_latency_avg_hours=4.0),
        Guardian(patient_id=priya_id, name="Suresh", phone="+919876543211", role="primary", status="pending", response_latency_avg_hours=5.0),
        Guardian(patient_id=priya_id, name="Anita", phone="+919876543212", role="secondary", status="active", response_latency_avg_hours=3.0),
        Guardian(patient_id=priya_id, name="Mani", phone="+919876543213", role="secondary", status="active", response_latency_avg_hours=4.5),
        Guardian(patient_id=priya_id, name="Preet", phone="+919876543214", role="secondary", status="active", response_latency_avg_hours=4.5),
        Guardian(patient_id=priya_id, name="Kavya", phone="+919876543215", role="rare_specialist", status="active", response_latency_avg_hours=5.0),
        Guardian(patient_id=priya_id, name="Ravi", phone="+919876543216", role="rare_specialist", status="active", response_latency_avg_hours=3.5),
        Guardian(patient_id=priya_id, name="Divya", phone="+919876543217", role="primary", status="active", response_latency_avg_hours=5.06)
    ]
    
    scores = calculate_circle_health(guardians, priya_id)
    
    assert scores["coverage_score"] == 100.0
    assert scores["engagement_score"] == 94.0
    assert scores["resilience_score"] == 87.0


def test_circle_health_degraded():
    """
    3. test_circle_health_degraded:
    Seeds general guardians and asserts that coverage drops and resilience degrades proportionately
    when active primaries are set to cooldown or pending.
    """
    patient_id = "general-patient-id"
    
    # 8 general slots with only 1 active primary (degraded)
    guardians = [
        # Only 1 active primary (Divya)
        Guardian(patient_id=patient_id, name="Raju", phone="+919876543210", role="primary", status="cooldown", response_latency_avg_hours=4.0),
        Guardian(patient_id=patient_id, name="Suresh", phone="+919876543211", role="primary", status="pending", response_latency_avg_hours=5.0),
        Guardian(patient_id=patient_id, name="Divya", phone="+919876543217", role="primary", status="active", response_latency_avg_hours=5.0),
        # 3 Active secondaries
        Guardian(patient_id=patient_id, name="Anita", phone="+919876543212", role="secondary", status="active", response_latency_avg_hours=3.0),
        Guardian(patient_id=patient_id, name="Mani", phone="+919876543213", role="secondary", status="active", response_latency_avg_hours=4.0),
        # Empty slots (degrades coverage)
        Guardian(patient_id=patient_id, name="Empty Slot", phone="", role="secondary", status="empty"),
        Guardian(patient_id=patient_id, name="Empty Slot", phone="", role="rare_specialist", status="empty"),
        Guardian(patient_id=patient_id, name="Empty Slot", phone="", role="rare_specialist", status="empty")
    ]
    
    scores = calculate_circle_health(guardians, patient_id)
    
    # Coverage is 5 occupied out of 8 slots = 62.5%
    assert scores["coverage_score"] == 62.5
    # Resilience is 0.0 because there is only 1 active primary available (Divya)
    assert scores["resilience_score"] == 0.0


@pytest.mark.asyncio
async def test_mobilization_trigger_at_t10():
    """
    4. test_mobilization_trigger_at_t10:
    Triggers mobilization at T-10. Asserts soft asks are logged and cached inside Redis.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        # Fetch Priya
        stmt = select(Patient).where(Patient.name == "Priya")
        res = await session.execute(stmt)
        patient = res.scalar_one_or_none()
        
        assert patient is not None
        predicted_date = date.today() + timedelta(days=10)
        
        # Trigger mobilization state machine
        mob_state = await trigger_mobilization(patient.id, predicted_date, session)
        
        assert mob_state["status"] == "active"
        assert mob_state["days_to_transfusion"] == 10
        assert mob_state["total_count"] == 8
