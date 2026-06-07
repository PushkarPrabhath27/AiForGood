import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_session_maker
from models.patient import Patient
from models.guardian import Guardian
from models.hb_reading import HbReading
from models.mood_log import MoodLog
from models.forecast import Forecast
from sqlalchemy import select, delete

FIRST_NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Suresh", "Neha", "Ravi", "Kavita", "Arjun", "Pooja", "Rajesh", "Divya", "Sanjay", "Ritu", "Mohit", "Kiran", "Nitin", "Meena"]
LAST_NAMES = ["Sharma", "Reddy", "Patel", "Singh", "Kumar", "Rao", "Gupta", "Desai", "Joshi", "Choudhury", "Nair", "Verma", "Yadav", "Menon", "Das"]

def random_date(start: datetime, end: datetime) -> datetime:
    delta = end - start
    random_days = random.randrange(delta.days + 1)
    return start + timedelta(days=random_days)

async def fix_data():
    maker = get_session_maker()
    async with maker() as session:
        # 1. Update T-X for every patient to be between T-15 and T-20
        # The base date is Oct 20, 2024
        base_date = datetime(2024, 10, 20, tzinfo=timezone.utc)
        min_date = base_date + timedelta(days=15)
        max_date = base_date + timedelta(days=20)
        
        result = await session.execute(select(Patient))
        patients = result.scalars().all()
        
        for p in patients:
            p.next_transfusion_predicted = random_date(min_date, max_date)
            
        print(f"Updated {len(patients)} patients' transfusion dates.")
        
        # 2. Ensure exactly 8 guardians per patient
        for p in patients:
            # Get guardians for patient
            g_result = await session.execute(
                select(Guardian).where(Guardian.patient_id == p.id)
            )
            guardians = g_result.scalars().all()
            
            if len(guardians) > 8:
                # Delete excess
                to_delete = guardians[8:]
                for g in to_delete:
                    await session.delete(g)
            elif len(guardians) < 8:
                # Add missing
                num_to_add = 8 - len(guardians)
                for _ in range(num_to_add):
                    first_name = random.choice(FIRST_NAMES)
                    last_name = random.choice(LAST_NAMES)
                    days_since_last_donation = random.randint(30, 400)
                    last_donation = datetime.utcnow() - timedelta(days=days_since_last_donation)
                    next_eligible = last_donation + timedelta(days=90)
                    status = "active" if next_eligible < datetime.utcnow() else "cooldown"
                    
                    new_g = Guardian(
                        id=str(uuid.uuid4()),
                        patient_id=p.id,
                        name=f"{first_name} {last_name}",
                        phone=f"+9198765{random.randint(1000, 9999)}",
                        role=random.choice(["primary", "secondary", "rare_specialist"]),
                        status=status,
                        last_donation_date=last_donation,
                        next_eligible_date=next_eligible,
                        donation_count=random.randint(1, 15),
                        response_latency_avg_hours=round(random.uniform(0.5, 24.0), 1),
                        preferred_language=random.choice(["hi", "en", "te", "ta"]),
                        compatibility_score=random.choice([60, 80, 90, 100]),
                        reliability_score=random.randint(60, 100),
                        geography_score=random.randint(70, 100),
                        annual_donation_count=random.randint(1, 5),
                        fatigue_ceiling=6,
                        fatigue_notified=False,
                    )
                    session.add(new_g)
        
        await session.commit()
        print("Ensured exactly 8 guardians per patient.")

if __name__ == "__main__":
    asyncio.run(fix_data())
