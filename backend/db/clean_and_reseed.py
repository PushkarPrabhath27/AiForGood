import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings
from db.seed_dataset import seed_dataset

def clean_and_reseed():
    engine = create_engine(settings.database_url_sync)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("==================================================================")
        print("          RAKTASETU NOOR — CLEANING DATABASE TABLES               ")
        print("==================================================================")
        
        # Deleting child tables first to satisfy foreign key constraints
        tables_to_clear = [
            "sentinel_alerts",
            "caregiver_checkins",
            "mood_logs",
            "forecasts",
            "hb_readings",
            "guardians",
            "inventory",
            "blood_banks",
            "patients"
        ]
        
        for table in tables_to_clear:
            try:
                db.execute(text(f"DELETE FROM {table};"))
                print(f"[*] Cleared table: {table}")
            except Exception as e:
                # Table might not exist or be named differently, just continue
                print(f"[-] Skip/Error clearing table {table}: {e}")
                
        db.commit()
        print("[*] All tables cleared successfully.")
        print("==================================================================")
        
    except Exception as e:
        db.rollback()
        print(f"[!] Error during database clean: {e}")
        sys.exit(1)
    finally:
        db.close()
        
    # Run the seed dataset script
    print("Starting fresh seeding from Dataset.csv...")
    seed_dataset()

    print("Running data constraint fixes (T-X range and 8 guardians per patient)...")
    import asyncio
    from scripts.fix_patient_data import fix_data
    asyncio.run(fix_data())

if __name__ == "__main__":
    clean_and_reseed()
