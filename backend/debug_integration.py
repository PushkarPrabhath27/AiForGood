# save as debug_integration.py
import asyncio
import httpx
import json

BASE = "http://localhost:8000"
TOKEN = "test-token"
PRIYA = "550e8400-e29b-41d4-a716-446655440001"

async def check():
    async with httpx.AsyncClient() as client:
        # Health
        r = await client.get(f"{BASE}/health")
        print(f"Health: {r.status_code} {r.json()}")
        
        # Priya forecast
        r = await client.get(
            f"{BASE}/api/v1/patients/{PRIYA}/forecast",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        data = r.json()
        print(f"Forecast: {data.get('success')} "
              f"date={data.get('data',{}).get('predicted_transfusion_date')}")
        
        # Guardian circle
        r = await client.get(
            f"{BASE}/api/v1/patients/{PRIYA}/guardian-circle",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        data = r.json()
        circle = data.get('data', {})
        print(f"Guardians: coverage={circle.get('coverage_score')} "
              f"engagement={circle.get('engagement_score')} "
              f"resilience={circle.get('resilience_score')}")

if __name__ == "__main__":
    asyncio.run(check())
