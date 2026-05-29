from datetime import datetime, date, timedelta
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path to cleanly resolve modules during standalone execution
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings
from models.patient import Patient
from models.hb_reading import HbReading
from models.forecast import Forecast
from models.guardian import Guardian
from models.blood_bank import BloodBank
from models.inventory import Inventory
from models.alert import Alert

# Initialize sync engine and session factory
engine = create_engine(settings.database_url_sync)
SessionLocal = sessionmaker(bind=engine)

# Constant Demo IDs matching frontend requirements
PRIYA_ID = "550e8400-e29b-41d4-a716-446655440001"
VIKRAM_ID = "550e8400-e29b-41d4-a716-446655440002"

def compute_hb_rise(post_hb: float, pre_hb: float, units: int) -> float:
    """
    Helper function to compute average hemoglobin rise per unit transfused.
    
    Args:
        post_hb (float): Post-transfusion Hb value in g/dL.
        pre_hb (float): Pre-transfusion Hb value in g/dL.
        units (int): Transfused units count.
        
    Returns:
        float: Computed Hb rise per unit (rounded to 2 decimals).
    """
    return round((post_hb - pre_hb) / units, 2)

def seed_database() -> None:
    """
    Synchronously populates seed data supporting the hackathon narrative.
    Implements a strict idempotency check to avoid duplicate keys.
    """
    db = SessionLocal()
    try:
        # Idempotency Guard
        existing = db.query(Patient).filter(Patient.id == PRIYA_ID).first()
        if existing:
            print("Database already seeded. Skipping.")
            return

        print("Initiating database seeding...")

        # 1. Seed Priya (Regular 14-month Thalassemia patient)
        priya = Patient(
            id=PRIYA_ID,
            name="Priya",
            age=9,
            blood_type="B",
            rh_factor="+",
            kell_negative=False,
            duffy_negative=False,
            kidd_negative=False,
            alloimmunization_flag=False,
            hospital_id="hospital-001",
            enrolled_at=datetime(2023, 9, 1, 10, 0, 0),
            next_transfusion_predicted=datetime(2024, 11, 3, 10, 0, 0),
            hb_current=7.2
        )
        db.add(priya)

        # Generate 14-month historical sawtooth readings for Priya
        # Start date: September 1, 2023
        # End date: October 20, 2024 (pre-demo date)
        # Cycle length: 21 days
        start_date = datetime(2023, 9, 1, 10, 0, 0)
        current_time = start_date

        while current_time < datetime(2024, 10, 20, 10, 0, 0):
            # Pre-transfusion valley reading (Day 0)
            hb_pre = 7.0
            pre_reading = HbReading(
                patient_id=PRIYA_ID,
                hb_value=hb_pre,
                reading_date=current_time,
                post_transfusion=False
            )
            db.add(pre_reading)

            # Transfusion occurs, post-transfusion spike (Day 1)
            hb_post = 11.0
            post_reading = HbReading(
                patient_id=PRIYA_ID,
                hb_value=hb_post,
                reading_date=current_time + timedelta(days=1),
                post_transfusion=True,
                units_transfused=2,
                hb_rise_per_unit=compute_hb_rise(hb_post, hb_pre, 2)
            )
            db.add(post_reading)

            # Advance to next cycle (21 days later)
            current_time += timedelta(days=21)

        # Add Priya's final active reading (Hb current)
        db.add(HbReading(
            patient_id=PRIYA_ID,
            hb_value=7.2,
            reading_date=datetime(2024, 10, 20, 10, 0, 0),
            post_transfusion=False
        ))

        # 2. Seed Vikram (Alloimmunized B+ Kell-negative patient)
        vikram = Patient(
            id=VIKRAM_ID,
            name="Vikram",
            age=12,
            blood_type="B",
            rh_factor="+",
            kell_negative=True,
            duffy_negative=False,
            kidd_negative=False,
            alloimmunization_flag=True,
            hospital_id="hospital-001",
            enrolled_at=datetime(2024, 1, 1, 10, 0, 0),
            next_transfusion_predicted=datetime(2024, 11, 7, 10, 0, 0),
            hb_current=6.8
        )
        db.add(vikram)

        # Seed exactly 4 post-transfusion rise cycles, mapping declining Hb rise per unit
        vikram_cycles = [
            {"pre": 6.8, "post": 8.9, "units": 1, "days_ago": 63},  # Cycle 1: rise=2.1
            {"pre": 7.0, "post": 8.9, "units": 1, "days_ago": 42},  # Cycle 2: rise=1.9
            {"pre": 6.9, "post": 8.6, "units": 1, "days_ago": 21},  # Cycle 3: rise=1.7
            {"pre": 7.2, "post": 8.1, "units": 1, "days_ago": 2},   # Cycle 4: rise=0.9 (CUSUM triggers here)
        ]
        
        anchor_date = datetime(2024, 10, 22, 10, 0, 0)
        for cycle in vikram_cycles:
            cycle_date = anchor_date - timedelta(days=cycle["days_ago"])
            pre_r = HbReading(
                patient_id=VIKRAM_ID,
                hb_value=cycle["pre"],
                reading_date=cycle_date,
                post_transfusion=False
            )
            db.add(pre_r)
            
            post_r = HbReading(
                patient_id=VIKRAM_ID,
                hb_value=cycle["post"],
                reading_date=cycle_date + timedelta(days=1),
                post_transfusion=True,
                units_transfused=cycle["units"],
                hb_rise_per_unit=compute_hb_rise(cycle["post"], cycle["pre"], cycle["units"])
            )
            db.add(post_r)

        # Add Vikram's current reading
        db.add(HbReading(
            patient_id=VIKRAM_ID,
            hb_value=6.8,
            reading_date=datetime(2024, 10, 22, 10, 0, 0),
            post_transfusion=False
        ))

        # 3. Seed Priya's 8 Guardians
        guardians = [
            Guardian(
                patient_id=PRIYA_ID,
                name="Raju",
                phone="+919876543210",
                role="primary",
                status="cooldown",
                last_donation_date=datetime(2024, 9, 10, 10, 0, 0),
                next_eligible_date=datetime(2024, 11, 10, 10, 0, 0),
                donation_count=12,
                response_latency_avg_hours=6.5,
                preferred_language="te",
                compatibility_score=100,
                reliability_score=95,
                geography_score=90
            ),
            Guardian(
                patient_id=PRIYA_ID,
                name="Suresh",
                phone="+919876543211",
                role="primary",
                status="pending",
                last_donation_date=datetime(2024, 8, 15, 10, 0, 0),
                next_eligible_date=datetime(2024, 10, 15, 10, 0, 0),
                donation_count=8,
                response_latency_avg_hours=12.0,
                preferred_language="te",
                compatibility_score=100,
                reliability_score=85,
                geography_score=80
            ),
            Guardian(
                patient_id=PRIYA_ID,
                name="Anita",
                phone="+919876543212",
                role="secondary",
                status="active",
                last_donation_date=datetime(2024, 10, 1, 10, 0, 0),
                next_eligible_date=datetime(2024, 11, 1, 10, 0, 0),
                donation_count=15,
                response_latency_avg_hours=3.2,
                preferred_language="en",
                compatibility_score=100,
                reliability_score=100,
                geography_score=95
            ),
            Guardian(patient_id=PRIYA_ID, name="Mani", phone="+919876543213", role="secondary", status="active", donation_count=5),
            Guardian(patient_id=PRIYA_ID, name="Preet", phone="+919876543214", role="secondary", status="active", donation_count=7),
            Guardian(patient_id=PRIYA_ID, name="Kavya", phone="+919876543215", role="rare_specialist", status="active", donation_count=3),
            Guardian(patient_id=PRIYA_ID, name="Ravi", phone="+919876543216", role="rare_specialist", status="active", donation_count=11),
            Guardian(patient_id=PRIYA_ID, name="Divya", phone="+919876543217", role="primary", status="active", donation_count=4)
        ]
        db.add_all(guardians)

        # 4. Seed 5 Blood Banks in Hyderabad
        banks = [
            BloodBank(id="550e8400-e29b-41d4-a716-446655440010", name="Apollo Blood Bank", city="HYD", lat=17.4065, lng=78.4772, last_sync_at=datetime(2024, 10, 19, 10, 0, 0)),
            BloodBank(id="550e8400-e29b-41d4-a716-446655440011", name="Yashoda Hospital", city="HYD", lat=17.3984, lng=78.4857, last_sync_at=datetime(2024, 10, 20, 10, 0, 0)),
            BloodBank(name="KIMS Hospital", city="HYD", lat=17.3688, lng=78.5243, last_sync_at=datetime(2024, 10, 18, 10, 0, 0)),
            BloodBank(name="Care Hospital", city="HYD", lat=17.4420, lng=78.4956, last_sync_at=datetime(2024, 10, 19, 10, 0, 0)),
            BloodBank(name="Rainbow Children's", city="HYD", lat=17.4156, lng=78.4502, last_sync_at=datetime(2024, 10, 20, 10, 0, 0))
        ]
        db.add_all(banks)

        # 5. Seed expiring Kell-negative B+ units at Apollo Blood Bank (Critical for Vikram's Match)
        inventory_items = [
            Inventory(
                bank_id="550e8400-e29b-41d4-a716-446655440010",
                blood_type="B",
                rh_factor="+",
                kell=True,  # Kell-negative unit
                duffy=False,
                kidd=False,
                units_available=2,
                collection_date=datetime(2024, 10, 5, 10, 0, 0),
                expiry_date=datetime(2024, 11, 5, 10, 0, 0)
            ),
            Inventory(
                bank_id="550e8400-e29b-41d4-a716-446655440010",
                blood_type="A",
                rh_factor="+",
                units_available=5,
                collection_date=datetime(2024, 10, 10, 10, 0, 0),
                expiry_date=datetime(2024, 11, 10, 10, 0, 0)
            ),
            Inventory(
                bank_id="550e8400-e29b-41d4-a716-446655440011",
                blood_type="B",
                rh_factor="+",
                units_available=3,
                collection_date=datetime(2024, 10, 12, 10, 0, 0),
                expiry_date=datetime(2024, 11, 12, 10, 0, 0)
            )
        ]
        db.add_all(inventory_items)

        # 6. Pre-computed Forecast for Priya (Cached metadata)
        # Note: Detailed 60-day forecast points will reside strictly inside Redis
        priya_forecast = Forecast(
            patient_id=PRIYA_ID,
            predicted_transfusion_date=datetime(2024, 11, 3, 10, 0, 0),
            confidence_lower=datetime(2024, 11, 1, 10, 0, 0),
            confidence_upper=datetime(2024, 11, 5, 10, 0, 0),
            confidence_pct=89.0,
            model_version="prophet-v1",
            generated_at=datetime(2024, 10, 20, 10, 0, 0),
            status="success"
        )
        db.add(priya_forecast)

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
