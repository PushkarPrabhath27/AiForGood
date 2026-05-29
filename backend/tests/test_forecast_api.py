import pytest
from httpx import AsyncClient, ASGITransport
from api.main import app

@pytest.mark.asyncio
async def test_get_forecast_priya():
    """
    Verifies that calling GET /api/v1/patients/{priya_id}/forecast returns
    the correct sawtooth prediction and includes the injected iron overload warning alert.
    """
    priya_id = "550e8400-e29b-41d4-a716-446655440001"
    
    # Use ASGITransport to call the FastAPI app directly without spinning up a live server
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/patients/{priya_id}/forecast")
        
        assert response.status_code == 200
        payload = response.json()
        
        # Assert standard ApiResponse wrapper structure
        assert payload["success"] is True
        assert payload["error"] is None
        
        data = payload["data"]
        assert data["patient_id"] == priya_id
        assert data["model_version"] == "prophet-v1"
        
        # Assert predicted transfusion date crosses around November 3rd, 2024
        predicted_date = data["predicted_transfusion_date"]
        assert "2024-11-" in predicted_date
        
        # Assert Priya's mock ferritin data triggered the iron overload amber alert (warning severity)
        alerts = data["alert_flags"]
        assert len(alerts) >= 1
        
        iron_alerts = [a for a in alerts if a["type"] == "iron_overload"]
        assert len(iron_alerts) == 1
        assert iron_alerts[0]["severity"] == "warning"
        assert "Serum ferritin" in iron_alerts[0]["message"]
        assert "adjust chelation" in iron_alerts[0]["recommended_action"].lower()


@pytest.mark.asyncio
async def test_get_forecast_vikram():
    """
    Verifies that calling GET /api/v1/patients/{vikram_id}/forecast returns
    the correct prediction and includes the CUSUM alloimmunization critical alert.
    """
    vikram_id = "550e8400-e29b-41d4-a716-446655440002"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/patients/{vikram_id}/forecast")
        
        assert response.status_code == 200
        payload = response.json()
        
        assert payload["success"] is True
        assert payload["error"] is None
        
        data = payload["data"]
        assert data["patient_id"] == vikram_id
        
        # Assert CUSUM triggered and Vikram is flagged as alloimmunized (critical severity)
        alerts = data["alert_flags"]
        assert len(alerts) >= 1
        
        allo_alerts = [a for a in alerts if a["type"] == "alloimmunization"]
        assert len(allo_alerts) == 1
        assert allo_alerts[0]["severity"] == "critical"
        assert "Alloimmunization Warning" in allo_alerts[0]["message"]
        assert "extended minor antigen" in allo_alerts[0]["recommended_action"].lower()


@pytest.mark.asyncio
async def test_get_forecast_patient_not_found():
    """
    Verifies that querying a non-existent patient ID correctly raises a PatientNotFoundError,
    returning a structured 404 ApiResponse.
    """
    non_existent_id = "00000000-0000-0000-0000-000000000000"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/patients/{non_existent_id}/forecast")
        
        # PatientNotFoundError has status code 404
        assert response.status_code == 404
        payload = response.json()
        
        assert payload["success"] is False
        assert payload["data"] is None
        
        error = payload["error"]
        assert error["code"] == "PatientNotFoundError"
        assert "does not exist" in error["message"]
