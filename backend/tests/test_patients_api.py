import pytest
from httpx import AsyncClient, ASGITransport
from api.main import app

@pytest.mark.asyncio
async def test_list_patients():
    """
    Verifies that calling GET /api/v1/patients returns a standard ApiResponse
    containing the full list of enrolled patients, including Priya and Vikram.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/patients")
        
        assert response.status_code == 200
        payload = response.json()
        
        # Verify envelope structure
        assert payload["success"] is True
        assert payload["error"] is None
        
        data = payload["data"]
        assert data["total"] >= 2
        assert data["page"] == 1
        
        # Check that we can identify Priya and Vikram
        patient_names = [p["name"] for p in data["patients"]]
        assert "Priya" in patient_names
        assert "Vikram" in patient_names


@pytest.mark.asyncio
async def test_get_patient_detail():
    """
    Verifies that querying GET /api/v1/patients/{patient_id} for a valid ID
    returns the correct patient record, and raises a 404 for invalid IDs.
    """
    priya_id = "550e8400-e29b-41d4-a716-446655440001"
    non_existent_id = "00000000-0000-0000-0000-000000000000"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Query valid patient (Priya)
        res_priya = await client.get(f"/api/v1/patients/{priya_id}")
        assert res_priya.status_code == 200
        
        payload_priya = res_priya.json()
        assert payload_priya["success"] is True
        assert payload_priya["data"]["name"] == "Priya"
        assert payload_priya["data"]["age"] == 9
        
        # 2. Query non-existent patient (404 Exception check)
        res_none = await client.get(f"/api/v1/patients/{non_existent_id}")
        assert res_none.status_code == 404
        
        payload_none = res_none.json()
        assert payload_none["success"] is False
        assert payload_none["error"]["code"] == "PatientNotFoundError"


@pytest.mark.asyncio
async def test_log_hb_reading():
    """
    Verifies that POST /api/v1/patients/{patient_id}/hb-reading successfully saves
    individual readings, updates metadata, and correctly calculates incremental post-transfusion
    hemoglobin rises against the latest pre-transfusion check.
    """
    priya_id = "550e8400-e29b-41d4-a716-446655440001"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Log a new pre-transfusion check
        pre_payload = {
            "hb_value": 7.0,
            "reading_date": "2024-10-21",
            "post_transfusion": False
        }
        pre_res = await client.post(
            f"/api/v1/patients/{priya_id}/hb-reading",
            json=pre_payload
        )
        assert pre_res.status_code == 200
        pre_data = pre_res.json()["data"]
        assert pre_data["hb_value"] == 7.0
        assert pre_data["post_transfusion"] is False
        assert pre_data["hb_rise_per_unit"] is None
        
        # 2. Log a subsequent post-transfusion check with 1 unit transfused
        post_payload = {
            "hb_value": 9.2,
            "reading_date": "2024-10-22",
            "post_transfusion": True,
            "units_transfused": 1
        }
        post_res = await client.post(
            f"/api/v1/patients/{priya_id}/hb-reading",
            json=post_payload
        )
        assert post_res.status_code == 200
        post_data = post_res.json()["data"]
        assert post_data["hb_value"] == 9.2
        assert post_data["post_transfusion"] is True
        
        # Assert rise per unit calculation: (9.2 - 7.0) / 1 = 2.2
        assert post_data["hb_rise_per_unit"] == 2.2
        
        # 3. Verify patient's current Hb is dynamically synchronized to 9.2
        detail_res = await client.get(f"/api/v1/patients/{priya_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["data"]["hb_current"] == 9.2


@pytest.mark.asyncio
async def test_update_patient_status_api():
    """
    Verifies that calling POST /api/v1/patients/{patient_id}/status updates patient status
    and handles validation of invalid states correctly.
    """
    priya_id = "550e8400-e29b-41d4-a716-446655440001"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Update status to active
        res_active = await client.post(
            f"/api/v1/patients/{priya_id}/status",
            json={"status": "active"}
        )
        assert res_active.status_code == 200
        assert res_active.json()["data"]["new_status"] == "active"

        # 2. Update status to an invalid value
        res_invalid = await client.post(
            f"/api/v1/patients/{priya_id}/status",
            json={"status": "invalid_state"}
        )
        assert res_invalid.status_code == 422

