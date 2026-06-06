import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings
from models.blood_bank import BloodBank
from models.inventory import Inventory

engine = create_engine(settings.database_url_sync)
SessionLocal = sessionmaker(bind=engine)

def main():
    db = SessionLocal()
    try:
        print("--- Blood Banks ---")
        banks = db.query(BloodBank).all()
        for b in banks:
            print(f"Bank ID: {b.id}, Name: {b.name}, City: {b.city}, Lat: {b.lat}, Lng: {b.lng}")
            print(f"  Inventory Count: {len(b.inventory)}")
            for item in b.inventory:
                print(f"    - Type: {item.blood_type}{item.rh_factor}, Units: {item.units_available}, Expiry: {item.expiry_date}")
    finally:
        db.close()

if __name__ == '__main__':
    main()
