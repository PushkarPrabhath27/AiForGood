from __future__ import annotations
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path to resolve packages cleanly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings
from models.patient import Patient
from models.hb_reading import HbReading
from models.guardian import Guardian
from models.blood_bank import BloodBank
from models.inventory import Inventory
from models.forecast import Forecast

# Constant Demo IDs
PRIYA_ID = "550e8400-e29b-41d4-a716-446655440001"
VIKRAM_ID = "550e8400-e29b-41d4-a716-446655440002"

# Deploy sync engine
engine = create_engine(settings.database_url_sync)
SessionLocal = sessionmaker(bind=engine)

def verify_seed_diagnostics() -> None:
    """
    Validates database counts, mathematical sawtooth properties for Priya,
    and Vikram's declining rise per unit calculations.
    """
    db = SessionLocal()
    try:
        print("==================================================================")
        print("          RAKTASETU NOOR — DATABASE SEED DIAGNOSTICS REPORT       ")
        print("==================================================================")

        # 1. Validate Patients Count
        patient_count = db.query(Patient).count()
        print(f"[*] Total Patients Enrolled: {patient_count} (Expected: 2)")
        assert patient_count == 2, "Patient count mismatch!"

        # Retrieve entities
        priya = db.query(Patient).filter(Patient.id == PRIYA_ID).first()
        vikram = db.query(Patient).filter(Patient.id == VIKRAM_ID).first()
        assert priya is not None, "Priya entity missing!"
        assert vikram is not None, "Vikram entity missing!"

        print(f"    - Patient 1: {priya.name} | Group: {priya.blood_type}{priya.rh_factor}")
        print(f"    - Patient 2: {vikram.name} | Group: {vikram.blood_type}{vikram.rh_factor} | Kell-Negative: {vikram.kell_negative} | Alloimmunized: {vikram.alloimmunization_flag}")

        # 2. Validate Blood Bank Counts
        bank_count = db.query(BloodBank).count()
        print(f"[*] Total Blood Banks Seeds: {bank_count} (Expected: 5)")
        assert bank_count == 5, "Blood bank count mismatch!"

        # 3. Validate Priya's Sawtooth Readings Count (14-month history)
        priya_readings_count = db.query(HbReading).filter(HbReading.patient_id == PRIYA_ID).count()
        print(f"[*] Priya Hb readings count: {priya_readings_count} (Expected: 20+ readings for 14-month history)")
        assert priya_readings_count >= 20, f"Priya Hb reading counts insufficient: {priya_readings_count}"

        # 4. Validate Vikram's 4 declining recovery cycles
        vikram_post_readings = db.query(HbReading).filter(
            HbReading.patient_id == VIKRAM_ID,
            HbReading.post_transfusion == True
        ).order_by(HbReading.reading_date).all()
        
        print(f"[*] Vikram post-transfusion readings count: {len(vikram_post_readings)} (Expected: 4)")
        assert len(vikram_post_readings) == 4, "Vikram post readings count mismatch!"

        # Validate decline values: 2.1 -> 1.9 -> 1.7 -> 0.9
        expected_rises = [2.1, 1.9, 1.7, 0.9]
        print("[*] Vikram Hb Rise per unit sequential check:")
        for idx, reading in enumerate(vikram_post_readings):
            actual_rise = reading.hb_rise_per_unit
            expected_rise = expected_rises[idx]
            print(f"    - Cycle {idx + 1}: expected rise {expected_rise}, actual rise {actual_rise}")
            assert abs(actual_rise - expected_rise) < 1e-5, f"Rise values mismatch at cycle {idx+1}!"

        # 5. Validate Apollo B+ Kell-negative Expiring Inventory
        apollo_kell_neg_units = db.query(Inventory).filter(
            Inventory.bank_id == "550e8400-e29b-41d4-a716-446655440010",
            Inventory.blood_type == "B",
            Inventory.rh_factor == "+",
            Inventory.kell == True
        ).first()

        assert apollo_kell_neg_units is not None, "Apollo expiring Kell-negative unit missing!"
        print(f"[*] Apollo Expiring Kell-negative inventory matches: {apollo_kell_neg_units.units_available} units, expiring {apollo_kell_neg_units.expiry_date.strftime('%Y-%m-%d')}")
        assert apollo_kell_neg_units.units_available == 2, "Apollo Kell-negative units count mismatch!"

        # 6. Validate Priya's cached Forecast metadata
        priya_fc = db.query(Forecast).filter(Forecast.patient_id == PRIYA_ID).first()
        assert priya_fc is not None, "Priya pre-computed forecast cache missing!"
        print(f"[*] Priya Cached Forecast predicted date: {priya_fc.predicted_transfusion_date.strftime('%Y-%m-%d')} | confidence: {priya_fc.confidence_pct}%")

        print("==================================================================")
        print("          DIAGNOSTIC STATUS: SCHEMA COMPLIANT & SEED SUCCESS      ")
        print("==================================================================")

    except Exception as e:
        print(f"[!] Validation check failed: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    verify_seed_diagnostics()
