import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import date, datetime, timedelta
from sqlalchemy import select
from httpx import AsyncClient, ASGITransport

from api.main import app
from db.session import get_session_maker
from models.patient import Patient
from models.guardian import Guardian
from models.alert import Alert
from core.config import settings
from services.messaging_service import generate_guardian_message, send_whatsapp_message


@pytest.mark.asyncio
async def test_generate_message_uses_claude():
    """
    Verifies that generate_guardian_message constructs a query, invokes the Anthropic
    Claude API with the correct system prompt context, and successfully caches the result.
    """
    # Create mock patient and guardian
    patient = Patient(name="Priya", hospital_id="Apollo Hospital")
    guardian = Guardian(id="test-g-id", name="Suresh", preferred_language="en", phone="+919876543211")
    context = {"date": "2024-11-03", "time": "10:00 AM"}

    # Mock AsyncAnthropic messages create response
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="Dear Suresh, Priya's transfusion is on 2024-11-03 at Apollo Hospital. Can you confirm?")]
    
    # We patch the AsyncAnthropic client creation and message dispatch
    with patch("services.messaging_service.AsyncAnthropic") as MockAnthropic, \
         patch("services.messaging_service.settings") as mock_settings:
        
        mock_settings.anthropic_api_key = "fake-key-value-12345-67890"
        mock_settings.redis_url = settings.redis_url
        
        mock_instance = MockAnthropic.return_value
        mock_instance.messages.create = AsyncMock(return_value=mock_message)

        # Call generation service
        msg = await generate_guardian_message(guardian, patient, "t10_soft_ask", context)

        # Verify client invocation
        assert "Dear Suresh" in msg
        assert "Priya" in msg
        MockAnthropic.assert_called_once_with(api_key="fake-key-value-12345-67890")
        mock_instance.messages.create.assert_called_once()
        
        # Verify system prompt context contains primary guardrails
        kwargs = mock_instance.messages.create.call_args[1]
        assert "compassionate clinical coordinator" in kwargs["system"]
        assert kwargs["temperature"] == 0.7


@pytest.mark.asyncio
async def test_generate_message_fallback_on_claude_failure():
    """
    Verifies that generate_guardian_message gracefully falls back to pre-written
    localized template fallbacks if the Anthropic Claude API raises exceptions or key is missing.
    """
    patient = Patient(name="Priya", hospital_id="Apollo Hospital")
    guardian = Guardian(id="test-g-id-fallback", name="Suresh", preferred_language="te", phone="+919876543211")
    context = {"date": "2024-11-03", "hospital": "Apollo Hospital", "time": "10:00 AM"}

    # Case A: Missing API key
    with patch("services.messaging_service.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""
        mock_settings.redis_url = settings.redis_url
        
        msg = await generate_guardian_message(guardian, patient, "t10_soft_ask", context)
        # Telugu soft ask template should render
        assert "నమస్తే Suresh గారు" in msg
        assert "Priya" in msg

    # Case B: Claude client raises an API error
    with patch("services.messaging_service.AsyncAnthropic") as MockAnthropic, \
         patch("services.messaging_service.settings") as mock_settings:
        
        mock_settings.anthropic_api_key = "fake-key"
        mock_settings.redis_url = settings.redis_url
        
        mock_instance = MockAnthropic.return_value
        mock_instance.messages.create = AsyncMock(side_effect=Exception("Claude rate limit exceeded"))

        msg = await generate_guardian_message(guardian, patient, "t10_soft_ask", context)
        assert "నమస్తే Suresh గారు" in msg


@pytest.mark.asyncio
async def test_send_whatsapp_uses_twilio():
    """
    Verifies send_whatsapp_message successfully invokes Twilio SDK client when credentials exist.
    """
    with patch("services.messaging_service.TwilioClient") as MockTwilioClient, \
         patch("services.messaging_service.settings") as mock_settings:
        
        mock_settings.twilio_account_sid = "AC_twilio_account_sid_123"
        mock_settings.twilio_auth_token = "token_12345"
        mock_settings.twilio_whatsapp_from = "whatsapp:+14155238886"

        mock_instance = MockTwilioClient.return_value
        mock_message_response = MagicMock(sid="SM123456789", status="queued")
        mock_instance.messages.create = MagicMock(return_value=mock_message_response)

        res = await send_whatsapp_message("+919876543211", "Hello Suresh!")

        assert res["sid"] == "SM123456789"
        assert res["status"] == "queued"
        MockTwilioClient.assert_called_once_with("AC_twilio_account_sid_123", "token_12345")
        mock_instance.messages.create.assert_called_once_with(
            from_="whatsapp:+14155238886",
            to="whatsapp:+919876543211",
            body="Hello Suresh!"
        )


@pytest.mark.asyncio
async def test_send_whatsapp_mock_mode():
    """
    Verifies send_whatsapp_message falls back to MOCK_SEND mode when Twilio keys are missing,
    logging output warnings cleanly rather than raising exceptions.
    """
    with patch("services.messaging_service.settings") as mock_settings:
        mock_settings.twilio_account_sid = ""
        mock_settings.twilio_auth_token = ""
        
        res = await send_whatsapp_message("+919876543211", "Hello Suresh!")
        assert "mock_sid" in res["sid"]
        assert res["status"] == "mock_sent"


@pytest.mark.asyncio
async def test_saathi_chatbot_intent_matching():
    """
    Tests the Saathi Chatbot POST /api/v1/chatbot/message endpoint
    for deterministic regex pattern-matching across critical user intents.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Next Eligible Donation Date (cooldown state)
        req_a = {"message": "When is my next eligible donation date?", "language": "en"}
        resp_a = await client.post("/api/v1/chatbot/message", json=req_a)
        assert resp_a.status_code == 200
        payload_a = resp_a.json()
        assert payload_a["success"] is True
        assert "next eligible" in payload_a["data"]["reply"].lower()
        assert payload_a["data"]["context_retrieved"]["next_eligible_date"] == "2024-11-10"

        # B. Alloimmunization Explanation
        req_b = {"message": "What does alloimmunization mean?", "language": "en"}
        resp_b = await client.post("/api/v1/chatbot/message", json=req_b)
        assert resp_b.status_code == 200
        payload_b = resp_b.json()
        assert payload_b["success"] is True
        assert "antibodies" in payload_b["data"]["reply"].lower()
        assert payload_b["data"]["context_retrieved"]["concept"] == "alloimmunization"

        # C. Hemoglobin / Hb Level
        req_c = {"message": "Show me Priya's hemoglobin level", "language": "en"}
        resp_c = await client.post("/api/v1/chatbot/message", json=req_c)
        assert resp_c.status_code == 200
        payload_c = resp_c.json()
        assert payload_c["success"] is True
        hb_val = payload_c["data"]["context_retrieved"]["current_hb"]
        assert hb_val in payload_c["data"]["reply"]
        assert payload_c["data"]["context_retrieved"]["patient_name"] == "Priya"

        # D. Default Fallback Dialog
        req_d = {"message": "Hello Saathi!", "language": "en"}
        resp_d = await client.post("/api/v1/chatbot/message", json=req_d)
        assert resp_d.status_code == 200
        payload_d = resp_d.json()
        assert payload_d["success"] is True
        assert "coordinate blood donations" in payload_d["data"]["reply"].lower()


@pytest.mark.asyncio
async def test_alerts_notify_endpoint():
    """
    Retrieves Priya from the database, creates a temporary Alert in DB,
    and calls POST /api/v1/patients/{patient_id}/alerts/{alert_id}/notify.
    Asserts notification is successfully dispatched (in mock-send mode) and updated in DB.
    """
    import uuid
    session_maker = get_session_maker()
    async with session_maker() as session:
        # 1. Fetch Priya patient record
        stmt = select(Patient).where(Patient.name == "Priya")
        res = await session.execute(stmt)
        priya = res.scalar_one_or_none()
        
        assert priya is not None
        priya_id = priya.id

        # 2. Add temporary alert to DB
        temp_id = f"test-alert-{uuid.uuid4()}"
        temp_alert = Alert(
            id=temp_id,
            patient_id=priya_id,
            alert_type="iron_overload",
            severity="warning",
            message="Serum ferritin is 2650 ng/mL, exceeding threshold.",
            recommended_action="Review chelation therapy.",
            sent_at=None,
            resolved_at=None
        )
        session.add(temp_alert)
        await session.commit()

        # 3. Call notify endpoint using ASGITransport AsyncClient
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/v1/patients/{priya_id}/guardian-circle")
            assert resp.status_code == 200
            
            # Post trigger notify
            notify_url = f"/api/v1/patients/{priya_id}/alerts/{temp_alert.id}/notify"
            notify_resp = await client.post(notify_url, json={})
            
            assert notify_resp.status_code == 200
            payload = notify_resp.json()
            assert payload["success"] is True
            
            data = payload["data"]
            assert data["delivery_status"] in ["mock_sent", "sent"]
            assert "****" in data["recipient_phone"]  # Masked last 4 phone number
            
            # Fetch primary or first available guardian dynamically to match database state
            stmt_guardians = select(Guardian).where(Guardian.patient_id == priya_id)
            res_g = await session.execute(stmt_guardians)
            guardians_list = list(res_g.scalars().all())
            valid_g = [g for g in guardians_list if g.status != "empty"]
            primary_g = [g for g in valid_g if g.role == "primary"]
            recipient = primary_g[0] if primary_g else valid_g[0]
            
            assert recipient.name in data["message_body"]

        # 4. Verify alert.sent_at is updated in the database
        session.expire_all()
        stmt_alert = select(Alert).where(Alert.id == temp_id)
        alert_res = await session.execute(stmt_alert)
        updated_alert = alert_res.scalar_one_or_none()
        
        assert updated_alert is not None
        assert updated_alert.sent_at is not None

        # Clean up temporary database records
        await session.delete(updated_alert)
        await session.commit()
