import csv
import sys
import uuid
from pathlib import Path
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings
from models.patient import Patient
from models.guardian import Guardian
from models.hb_reading import HbReading
from models.blood_bank import BloodBank
from models.inventory import Inventory
from models.forecast import Forecast
from models.sentinel import CaregiverCheckin, ActivityLevel, ConcernLevel
import random

# Initialize sync engine and session factory
engine = create_engine(settings.database_url_sync)
SessionLocal = sessionmaker(bind=engine)

# Constant Demo IDs matching frontend requirements
PRIYA_ID = "550e8400-e29b-41d4-a716-446655440001"
VIKRAM_ID = "550e8400-e29b-41d4-a716-446655440002"
EMERGENCY_POOL_PATIENT_ID = "550e8400-e29b-41d4-a716-446655440003"

def parse_date(date_str):
    if not date_str or date_str.strip() == "":
        return None
    try:
        # Try formats
        if " " in date_str:
            return datetime.strptime(date_str.split(".")[0], "%Y-%m-%d %H:%M:%S")
        else:
            return datetime.strptime(date_str, "%Y-%m-%d")
    except Exception:
        return None

def get_stable_uuid(hex_id):
    if not hex_id or hex_id.strip() == "":
        return None
    # Generate stable UUIDv5 from hex string to fit String(36)
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, hex_id.strip()))

def seed_dataset():
    db = SessionLocal()
    dataset_path = Path(__file__).resolve().parents[2] / "Newprompts" / "Dataset.csv"
    
    if not dataset_path.exists():
        print(f"Error: Dataset.csv not found at {dataset_path}")
        sys.exit(1)
        
    try:
        # Check if already seeded
        existing = db.query(Patient).filter(Patient.id == PRIYA_ID).first()
        if existing:
            print("Database already seeded. Skipping.")
            return

        print(f"Reading dataset from {dataset_path}...")
        with open(dataset_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Total rows read: {len(rows)}")

        # 1. Identify Candidate Patients for Priya and Vikram
        patient_rows = [r for r in rows if r['role'].lower() == 'patient']
        
        # Candidate Priya: Female, B Positive (or other group with donors)
        priya_cand = None
        for p in patient_rows:
            if p['blood_group'] == 'B Positive' and p['gender'].lower() == 'female' and p['bridge_id']:
                priya_cand = p
                break
        if not priya_cand:
            # Fallback to any B Positive female
            priya_cand = next((p for p in patient_rows if p['blood_group'] == 'B Positive' and p['gender'].lower() == 'female'), None)
        if not priya_cand:
            # Fallback to first patient
            priya_cand = patient_rows[0]

        # Candidate Vikram: Male, B Positive (or other group with donors)
        vikram_cand = None
        for p in patient_rows:
            if p['blood_group'] == 'B Positive' and p['gender'].lower() == 'male' and p['bridge_id'] and p['user_id'] != priya_cand['user_id']:
                vikram_cand = p
                break
        if not vikram_cand:
            # Fallback to any B Positive male
            vikram_cand = next((p for p in patient_rows if p['blood_group'] == 'B Positive' and p['gender'].lower() == 'male' and p['user_id'] != priya_cand['user_id']), None)
        if not vikram_cand:
            # Fallback to second patient
            vikram_cand = patient_rows[1]

        print(f"Selected candidate for Priya: {priya_cand['user_id']} (bridge_id: {priya_cand['bridge_id']})")
        print(f"Selected candidate for Vikram: {vikram_cand['user_id']} (bridge_id: {vikram_cand['bridge_id']})")

        # Map of CSV IDs to Database IDs
        id_map = {}
        
        # Add Priya
        id_map[priya_cand['bridge_id']] = PRIYA_ID
        id_map[priya_cand['user_id']] = PRIYA_ID
        
        # Add Vikram
        id_map[vikram_cand['bridge_id']] = VIKRAM_ID
        id_map[vikram_cand['user_id']] = VIKRAM_ID

        # 2. Seed Patients
        print("Seeding Patients...")
        db_patients = []
        
        # Seed dummy Emergency Pool patient to hold all Emergency Donors (due to non-nullable patient_id in guardians)
        emergency_pool = Patient(
            id=EMERGENCY_POOL_PATIENT_ID,
            name="Emergency Pool",
            age=30,
            blood_type="O",
            rh_factor="+",
            hospital_id="pool-001",
            enrolled_at=datetime.utcnow(),
            status="active"
        )
        db.add(emergency_pool)
        
        for idx, p in enumerate(patient_rows, 1):
            csv_bridge_id = p['bridge_id']
            csv_user_id = p['user_id']
            
            # Map ID
            if csv_bridge_id in id_map:
                p_id = id_map[csv_bridge_id]
            else:
                p_id = get_stable_uuid(csv_bridge_id) or get_stable_uuid(csv_user_id)
                id_map[csv_bridge_id] = p_id
                id_map[csv_user_id] = p_id
            
            # Skip if duplicate
            if any(dp.id == p_id for dp in db_patients):
                continue
                
            blood_group = p['blood_group'] or 'O Positive'
            # Parse blood type and rh factor
            blood_type = "O"
            rh_factor = "+"
            for g in ["A1B", "A2B", "A1", "A2", "AB", "A", "B", "O"]:
                if g in blood_group:
                    blood_type = g
                    break
            if "Negative" in blood_group or "-" in blood_group:
                rh_factor = "-"
                
            # Demo clinical overrides
            kell = False
            allo = False
            name = f"Patient {blood_group} #{idx}"
            age = 10
            
            if p_id == PRIYA_ID:
                name = "Priya"
                age = 9
            elif p_id == VIKRAM_ID:
                name = "Vikram"
                age = 12
                kell = True
                allo = True
                
            enrolled = parse_date(p['registration_date']) or datetime.utcnow()
            
            # T-15 to T-20 constraint (based on Oct 20, 2024)
            base_date = datetime(2024, 10, 20)
            next_trans = base_date + timedelta(days=random.randint(15, 20))
            
            patient = Patient(
                id=p_id,
                name=name,
                age=age,
                blood_type=blood_type,
                rh_factor=rh_factor,
                kell_negative=kell,
                duffy_negative=False,
                kidd_negative=False,
                alloimmunization_flag=allo,
                hospital_id="hospital-001",
                enrolled_at=enrolled,
                next_transfusion_predicted=next_trans,
                hb_current=round(random.uniform(4.5, 11.5), 1),
                status="active"
            )
            db_patients.append(patient)
            db.add(patient)

        db.flush()
        print(f"Successfully staged {len(db_patients) + 1} patients.")

        # 3. Seed Guardians (Donors)
        print("Seeding Guardians...")
        donor_rows = [r for r in rows if r['role'].lower() in ['bridge donor', 'emergency donor', 'volunteer', 'other']]
        
        db_guardians = {}
        
        for idx, d in enumerate(donor_rows, 1):
            csv_user_id = d['user_id']
            csv_bridge_id = d['bridge_id']
            
            d_id = get_stable_uuid(csv_user_id) or str(uuid.uuid4())
            if d_id in db_guardians:
                continue
                
            # Determine linked patient
            p_id = None
            if csv_bridge_id:
                p_id = id_map.get(csv_bridge_id) or get_stable_uuid(csv_bridge_id)
            else:
                # Emergency donor or unlinked volunteer goes to the Emergency Pool patient
                p_id = EMERGENCY_POOL_PATIENT_ID
                
            # Map role
            d_role = "secondary"
            if d['role'].lower() == 'bridge donor':
                d_role = "primary" if idx % 3 == 0 else "secondary"
            elif d['role'].lower() == 'emergency donor':
                d_role = "rare_specialist"
                
            # Map status
            active_status = d['user_donation_active_status'].lower()
            d_status = "active"
            if active_status == "inactive":
                d_status = "cooldown" if idx % 2 == 0 else "unavailable"
                
            # Donation counts
            donation_count = int(d['donations_till_date']) if d['donations_till_date'] else 0
            
            # Average response latency (calculated from call ratio/frequency)
            latency = 12.0
            if d['calls_to_donations_ratio']:
                try:
                    ratio = float(d['calls_to_donations_ratio'])
                    latency = min(max(ratio * 4.0, 1.0), 72.0)
                except ValueError:
                    pass
            
            last_don = parse_date(d['last_donation_date'])
            next_elig = parse_date(d['next_eligible_date'])
            
            # Randomize languages among standard choices
            langs = ["te", "hi", "en"]
            pref_lang = langs[idx % len(langs)]
            
            # Fetch names or generate
            blood_group = d['blood_group'] or 'O Positive'
            d_name = f"Donor {blood_group} #{idx}"
            
            guardian = Guardian(
                id=d_id,
                patient_id=p_id,
                name=d_name,
                phone=f"+91{9800000000 + idx}",
                telegram_chat_id=str(6408740000 + idx) if idx % 5 != 0 else None,
                role=d_role,
                status=d_status,
                last_donation_date=last_don,
                next_eligible_date=next_elig,
                donation_count=donation_count,
                response_latency_avg_hours=round(latency, 1),
                preferred_language=pref_lang,
                compatibility_score=90 if d_status == "active" else 60,
                reliability_score=85 if donation_count > 2 else 70,
                geography_score=90
            )
            db_guardians[d_id] = guardian

        print(f"Total guardians prepared: {len(db_guardians)}")
        db_guardians_list = list(db_guardians.values())
        print(f"Total unique IDs in list: {len(set(g.id for g in db_guardians_list))}")
        
        # Test adding them one by one to find the culprit
        for g in db_guardians_list:
            db.add(g)
            try:
                db.flush()
            except Exception as e:
                db.rollback()
                print(f"Failed on Guardian ID {g.id}: {e}")
                sys.exit(1)
        print(f"Successfully staged {len(db_guardians)} guardians.")

        # 4. Seed 5 Blood Banks in Hyderabad (for RaktaGrid Map discovery)
        print("Seeding Blood Banks...")
        banks = [
            BloodBank(id="550e8400-e29b-41d4-a716-446655440010", name="Apollo Blood Bank", city="HYD", lat=17.4065, lng=78.4772, last_sync_at=datetime.utcnow() - timedelta(days=1)),
            BloodBank(id="550e8400-e29b-41d4-a716-446655440011", name="Yashoda Hospital", city="HYD", lat=17.3984, lng=78.4857, last_sync_at=datetime.utcnow()),
            BloodBank(name="KIMS Hospital", city="HYD", lat=17.3688, lng=78.5243, last_sync_at=datetime.utcnow() - timedelta(days=2)),
            BloodBank(name="Care Hospital", city="HYD", lat=17.4420, lng=78.4956, last_sync_at=datetime.utcnow() - timedelta(days=1)),
            BloodBank(name="Rainbow Children's", city="HYD", lat=17.4156, lng=78.4502, last_sync_at=datetime.utcnow())
        ]
        db.add_all(banks)

        # 5. Seed expiring Kell-negative B+ units at Apollo Blood Bank (Critical for Vikram's Match scenario)
        print("Seeding Inventory...")
        inventory_items = [
            Inventory(
                bank_id="550e8400-e29b-41d4-a716-446655440010",
                blood_type="B",
                rh_factor="+",
                kell=True,  # Kell-negative unit (Vikram match candidate)
                duffy=False,
                kidd=False,
                units_available=2,
                collection_date=datetime.utcnow() - timedelta(days=10),
                expiry_date=datetime.utcnow() + timedelta(days=25)
            ),
            Inventory(
                bank_id="550e8400-e29b-41d4-a716-446655440010",
                blood_type="A",
                rh_factor="+",
                units_available=5,
                collection_date=datetime.utcnow() - timedelta(days=5),
                expiry_date=datetime.utcnow() + timedelta(days=30)
            ),
            Inventory(
                bank_id="550e8400-e29b-41d4-a716-446655440011",
                blood_type="B",
                rh_factor="+",
                units_available=3,
                collection_date=datetime.utcnow() - timedelta(days=8),
                expiry_date=datetime.utcnow() + timedelta(days=27)
            )
        ]
        db.add_all(inventory_items)

        # 6. Seed mock forecast for Priya (satisfies frontend immediate checks)
        print("Seeding Priya's cached forecast metadata...")
        priya_forecast = Forecast(
            patient_id=PRIYA_ID,
            predicted_transfusion_date=datetime.utcnow() + timedelta(days=14),
            confidence_lower=datetime.utcnow() + timedelta(days=12),
            confidence_upper=datetime.utcnow() + timedelta(days=16),
            confidence_pct=89.0,
            model_version="prophet-v1",
            generated_at=datetime.utcnow(),
            status="success"
        )
        db.add(priya_forecast)

        # 7. Add historic readings for Priya & Vikram to verify NOOR forecast runs
        print("Seeding historic Hb readings for Priya & Vikram...")
        # Priya (sawtooth readings)
        priya_start = datetime.utcnow() - timedelta(days=21*5)
        for i in range(5):
            cycle_date = priya_start + timedelta(days=21*i)
            # Valley
            db.add(HbReading(patient_id=PRIYA_ID, hb_value=7.0, reading_date=cycle_date, post_transfusion=False))
            # Spike
            db.add(HbReading(patient_id=PRIYA_ID, hb_value=11.0, reading_date=cycle_date + timedelta(days=1), post_transfusion=True, units_transfused=2, hb_rise_per_unit=2.00))
        # Final active reading
        db.add(HbReading(patient_id=PRIYA_ID, hb_value=7.2, reading_date=datetime.utcnow() - timedelta(days=1), post_transfusion=False))

        # Vikram (alloimmunized declining Hb rise)
        vikram_start = datetime.utcnow() - timedelta(days=21*3)
        vikram_cycles = [
            {"pre": 6.8, "post": 8.9, "units": 1, "days_ago": 63},
            {"pre": 7.0, "post": 8.9, "units": 1, "days_ago": 42},
            {"pre": 6.9, "post": 8.6, "units": 1, "days_ago": 21},
        ]
        for c in vikram_cycles:
            c_date = datetime.utcnow() - timedelta(days=c["days_ago"])
            db.add(HbReading(patient_id=VIKRAM_ID, hb_value=c["pre"], reading_date=c_date, post_transfusion=False))
            db.add(HbReading(patient_id=VIKRAM_ID, hb_value=c["post"], reading_date=c_date + timedelta(days=1), post_transfusion=True, units_transfused=c["units"], hb_rise_per_unit=round((c["post"] - c["pre"])/c["units"], 2)))
        db.add(HbReading(patient_id=VIKRAM_ID, hb_value=6.8, reading_date=datetime.utcnow() - timedelta(days=1), post_transfusion=False))

        # 8. Add synthetic readings & check-ins for all other patients
        print("Seeding synthetic historic Hb readings and CaregiverCheckins for all non-demo patients...")
        for pt in db_patients:
            if pt.id in [PRIYA_ID, VIKRAM_ID, EMERGENCY_POOL_PATIENT_ID]:
                continue
                
            # Synthesize HbReadings (Sawtooth pattern)
            start_date = datetime.utcnow() - timedelta(days=21*3)
            for i in range(3):
                c_date = start_date + timedelta(days=21*i)
                pre_hb = round(random.uniform(5.5, 7.5), 1)
                post_hb = round(pre_hb + random.uniform(1.5, 3.5), 1)
                units = random.randint(1, 2)
                
                db.add(HbReading(patient_id=pt.id, hb_value=pre_hb, reading_date=c_date, post_transfusion=False))
                db.add(HbReading(patient_id=pt.id, hb_value=post_hb, reading_date=c_date + timedelta(days=1), post_transfusion=True, units_transfused=units, hb_rise_per_unit=round((post_hb - pre_hb)/units, 2)))
                
            # Final active reading matching their new diverse hb_current
            db.add(HbReading(patient_id=pt.id, hb_value=pt.hb_current, reading_date=datetime.utcnow() - timedelta(days=random.randint(1, 5)), post_transfusion=False))

            # Synthesize CaregiverCheckin
            num_checkins = random.randint(1, 3)
            for i in range(num_checkins):
                chk_date = datetime.utcnow() - timedelta(days=random.randint(1, 14))
                act_level = random.choice(list(ActivityLevel))
                con_level = random.choice(list(ConcernLevel))
                s_score = random.uniform(0.0, 10.0)
                
                db.add(CaregiverCheckin(
                    patient_id=pt.id,
                    checkin_date=chk_date,
                    channel="telegram",
                    symptom_score=round(s_score, 1),
                    fatigue_reported=random.choice([True, False]),
                    appetite_normal=random.choice([True, False]),
                    activity_level=act_level,
                    caregiver_concern_level=con_level
                ))

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_dataset()
