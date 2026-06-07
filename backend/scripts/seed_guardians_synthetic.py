import asyncio
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_session_maker
from models.guardian import Guardian
from models.patient import Patient
from models.hb_reading import HbReading
from models.mood_log import MoodLog
from models.forecast import Forecast

from sqlalchemy import select

# Realistic Indian names for donors
FIRST_NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Suresh", "Neha", "Ravi", "Kavita", "Arjun", "Pooja", "Rajesh", "Divya", "Sanjay", "Ritu", "Mohit", "Kiran", "Nitin", "Meena"]
LAST_NAMES = ["Sharma", "Reddy", "Patel", "Singh", "Kumar", "Rao", "Gupta", "Desai", "Joshi", "Choudhury", "Nair", "Verma", "Yadav", "Menon", "Das"]

async def seed_guardians():
    maker = get_session_maker()
    async with maker() as session:
        result = await session.execute(select(Guardian))
        guardians = result.scalars().all()
        
        for idx, g in enumerate(guardians):
            if g.status == "empty":
                continue
                
            # Assign a realistic name instead of "Donor ..."
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            g.name = f"{first_name} {last_name}"
            
            # Generate realistic telemetry
            g.donation_count = random.randint(1, 15)
            
            # Calculate dates
            days_since_last_donation = random.randint(30, 400)
            last_donation = datetime.utcnow() - timedelta(days=days_since_last_donation)
            g.last_donation_date = last_donation
            
            # Men can donate every 90 days (approx), women 120 days. Let's just use 90 days for simplicity.
            g.next_eligible_date = last_donation + timedelta(days=90)
            
            # If next_eligible is in the past, they are eligible now
            if g.next_eligible_date < datetime.utcnow():
                g.status = "active"
            else:
                g.status = "cooldown"
                
            # Random response time between 1 and 24 hours
            g.response_latency_avg_hours = round(random.uniform(0.5, 24.0), 1)
            
            # Random scores
            g.compatibility_score = random.choice([60, 80, 90, 100])
            g.reliability_score = random.randint(60, 100)
            g.geography_score = random.randint(70, 100)
            
            # Phone number last 4 digits mock
            g.phone = f"+9198765{random.randint(1000, 9999)}"
            
        await session.commit()
        print(f"Updated {len(guardians)} guardians with synthetic data.")

if __name__ == "__main__":
    asyncio.run(seed_guardians())
