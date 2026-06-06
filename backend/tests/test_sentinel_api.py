import pytest
from httpx import AsyncClient, ASGITransport
from api.main import app

@pytest.mark.asyncio
async def test_get_sentinel_status_api():
    """
    Verifies that GET /api/v1/sentinel/{patient_id} returns the integrated
    SentinelStatusSchema within the standard ApiResponse envelope.
    """
    priya_id = "550e8400-e29b-41d4-a716-446655440001"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(f"/api/v1/sentinel/{priya_id}")
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        assert "sentinel_score" in payload["data"]
        assert "last_checkin" in payload["data"]
        assert "alert_active" in payload["data"]
        assert "recommended_action" in payload["data"]
