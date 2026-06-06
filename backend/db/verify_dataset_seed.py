import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path
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

engine = create_engine(settings.database_url_sync)
SessionLocal = sessionmaker(bind=engine)

def verify_dataset_seeding():
    db = SessionLocal()
    try:
        print("==================================================================")
        print("     RAKTASETU NOOR — DATASET SEED VERIFICATION DIAGNOSTICS      ")
        print("==================================================================")

        # 1. Check Patients count
        patient_count = db.query(Patient).count()
        print(f"[*] Total Patients in Database: {patient_count} (Expected: 81)")
        assert patient_count == 81, f"Patient count mismatch: found {patient_count}"

        # 2. Check Guardians count
        guardian_count = db.query(Guardian).count()
        print(f"[*] Total Guardians (Donors) in Database: {guardian_count} (Expected: 4,442)")
        assert guardian_count == 4442, f"Guardian count mismatch: found {guardian_count}"

        # 3. Check Priya & Vikram exist
        priya = db.query(Patient).filter(Patient.id == PRIYA_ID).first()
        vikram = db.query(Patient).filter(Patient.id == VIKRAM_ID).first()
        
        assert priya is not None, "Priya missing!"
        assert vikram is not None, "Vikram missing!"
        
        print(f"[*] Demographics verified:")
        print(f"    - Priya: ID={priya.id}, Blood={priya.blood_type}{priya.rh_factor}, Status={priya.status}")
        print(f"    - Vikram: ID={vikram.id}, Blood={vikram.blood_type}{vikram.rh_factor}, Kell-Negative={vikram.kell_negative}, Status={vikram.status}")

        # 4. Check linked guardians
        priya_guardians = db.query(Guardian).filter(Guardian.patient_id == PRIYA_ID).count()
        vikram_guardians = db.query(Guardian).filter(Guardian.patient_id == VIKRAM_ID).count()
        print(f"[*] Linked donor circle counts:")
        print(f"    - Priya circle: {priya_guardians} donors")
        print(f"    - Vikram circle: {vikram_guardians} donors")
        
        assert priya_guardians > 0, "Priya must have linked donors!"
        assert vikram_guardians > 0, "Vikram must have linked donors!"

        # 5. Check Blood Banks
        bank_count = db.query(BloodBank).count()
        print(f"[*] Total Blood Banks: {bank_count} (Expected: 5)")
        assert bank_count == 5, f"Blood bank count mismatch: found {bank_count}"

        # 6. Check Inventory
        inventory_count = db.query(Inventory).count()
        print(f"[*] Total Inventory records: {inventory_count} (Expected: 3)")
        assert inventory_count == 3, f"Inventory records mismatch: found {inventory_count}"

        print("==================================================================")
        print("          DIAGNOSTIC STATUS: DATASET SEED SUCCESSFUL & STABLE     ")
        print("==================================================================")

    except Exception as e:
        print(f"[!] Validation failed: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    verify_dataset_seeding()
