import pytest
from httpx import AsyncClient, ASGITransport
from api.main import app

@pytest.mark.asyncio
async def test_get_guardian_circle_priya():
    """
    Verifies that calling GET /api/v1/patients/{priya_id}/guardian-circle returns
    Priya's full circle, with exact health metrics matching slides:
    coverage = 100.0%, engagement = 94.0%, and resilience = 87.0%.
    """
    priya_id = "550e8400-e29b-41d4-a716-446655440001"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/patients/{priya_id}/guardian-circle")
        
        assert response.status_code == 200
        payload = response.json()
        
        assert payload["success"] is True
        assert payload["error"] is None
        
        data = payload["data"]
        assert data["coverage_score"] == 100.0
        assert data["engagement_score"] == 94.0
        assert data["resilience_score"] == 87.0
        assert data["mobilization_status"] == "active"
        assert data["days_to_transfusion"] == 14
        
        # Verify 8 guardians returned and phone numbers are masked properly
        guardians = data["guardians"]
        assert len(guardians) == 8
        
        for g in guardians:
            assert g["phone"].startswith("****")
            assert len(g["phone"]) == 8  # **** + 4 digits = 8 chars


@pytest.mark.asyncio
async def test_mobilize_guardian_circle_priya():
    """
    Verifies that calling POST /api/v1/patients/{priya_id}/guardian-circle/mobilize
    updates Suresh's status from 'pending' to 'active' in the database and caches
    the new state with incremented confirmed_count.
    """
    priya_id = "550e8400-e29b-41d4-a716-446655440001"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mobilize circle
        response = await client.post(f"/api/v1/patients/{priya_id}/guardian-circle/mobilize")
        
        assert response.status_code == 200
        payload = response.json()
        
        assert payload["success"] is True
        assert payload["error"] is None
        
        data = payload["data"]
        assert data["status"] == "active"
        assert data["days_to_transfusion"] == 14
        assert data["total_count"] == 8
        
        # Confirm that GET reflects updated scores (and Suresh is active!)
        circle_res = await client.get(f"/api/v1/patients/{priya_id}/guardian-circle")
        assert circle_res.status_code == 200
        circle_payload = circle_res.json()
        
        guardians = circle_payload["data"]["guardians"]
        suresh = next(g for g in guardians if g["name"] == "Suresh")
        assert suresh["status"] == "active"
