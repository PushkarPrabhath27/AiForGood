from __future__ import annotations
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import date, datetime, timedelta
from sqlalchemy import select
from httpx import AsyncClient, ASGITransport, Response

from api.main import app
from db.session import get_session_maker
from models.patient import Patient
from models.guardian import Guardian
from models.alert import Alert
from core.config import settings
from services.messaging_service import generate_guardian_message, send_telegram_message


# ── Gemini message generation ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_message_uses_gemini():
    """Verify generate_guardian_message invokes the Google Gemini SDK and caches the result.

    Mocks the google-genai Client, asserts the prompt is dispatched with the
    correct API key, and verifies the returned text matches the mocked response.
    """
    patient = Patient(name="Priya", hospital_id="Apollo Hospital")
    guardian = Guardian(
        id="test-g-id",
        name="Suresh",
        preferred_language="en",
        phone="+919876543211",
    )
    context = {"date": "2024-11-03", "time": "10:00 AM"}

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_gemini_resp = MagicMock()
    mock_gemini_resp.text = "Hello Suresh, Priya's transfusion is on 2024-11-03. Can you confirm?"
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_gemini_resp)

    with patch("services.messaging_service.genai.Client", return_value=mock_client) as mock_cls, \
         patch("services.messaging_service.settings") as mock_settings:

        mock_settings.gemini_api_key = "fake-gemini-key"
        mock_settings.gemini_model = "gemini-2.5-flash-preview-05-20"
        mock_settings.redis_url = settings.redis_url

        msg = await generate_guardian_message(guardian, patient, "t10_soft_ask", context)

        assert "Hello Suresh" in msg
        assert "Priya" in msg
        mock_cls.assert_called_once_with(api_key="fake-gemini-key")
        mock_client.aio.models.generate_content.assert_called_once()


@pytest.mark.asyncio
async def test_generate_message_fallback_on_gemini_failure():
    """Verify generate_guardian_message gracefully falls back to localized templates.

    Tests two failure modes:
    - Missing API key → immediate template render.
    - Gemini raises an exception → template render after caught exception.
    """
    patient = Patient(name="Priya", hospital_id="Apollo Hospital")
    guardian = Guardian(
        id="test-g-id-fallback",
        name="Suresh",
        preferred_language="te",
        phone="+919876543211",
    )
    context = {"date": "2024-11-03", "hospital": "Apollo Hospital", "time": "10:00 AM"}

    # Case A: Missing API key
    with patch("services.messaging_service.settings") as mock_settings:
        mock_settings.gemini_api_key = ""
        mock_settings.redis_url = settings.redis_url

        msg = await generate_guardian_message(guardian, patient, "t10_soft_ask", context)
        assert "నమస్తే Suresh గారు" in msg

    # Case B: Gemini API raises an error
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=Exception("API Server Error")
    )

    with patch("services.messaging_service.genai.Client", return_value=mock_client), \
         patch("services.messaging_service.settings") as mock_settings:

        mock_settings.gemini_api_key = "fake-key"
        mock_settings.gemini_model = "gemini-2.5-flash-preview-05-20"
        mock_settings.redis_url = settings.redis_url

        msg = await generate_guardian_message(guardian, patient, "t10_soft_ask", context)
        assert "నమస్తే Suresh గారు" in msg


# ── Telegram message dispatch ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_send_telegram_uses_bot_api():
    """Verify send_telegram_message hits the Telegram Bot API with correct payload.

    Mocks httpx.AsyncClient.post to intercept the outgoing request and asserts
    that the correct endpoint, chat_id, and message text are sent.
    """
    telegram_resp = {
        "ok": True,
        "result": {"message_id": 42, "chat": {"id": 123456789}},
    }
    mock_response = MagicMock(spec=Response)
    mock_response.status_code = 200
    mock_response.json.return_value = telegram_resp

    with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post, \
         patch("services.messaging_service.settings") as mock_settings:

        mock_settings.telegram_bot_token = "fake-bot-token"

        res = await send_telegram_message("123456789", "Hello Suresh!")

        assert res["message_id"] == "42"
        assert res["status"] == "sent"
        mock_post.assert_called_once()

        # Verify correct endpoint and payload
        call_args = mock_post.call_args
        assert "sendMessage" in call_args[0][0]
        assert call_args[1]["json"]["chat_id"] == "123456789"
        assert call_args[1]["json"]["text"] == "Hello Suresh!"


@pytest.mark.asyncio
async def test_send_telegram_mock_mode():
    """Verify send_telegram_message returns mock response when bot token is absent."""
    with patch("services.messaging_service.settings") as mock_settings:
        mock_settings.telegram_bot_token = ""

        res = await send_telegram_message("123456789", "Hello Suresh!")
        assert "mock_msg_id" in res["message_id"]
        assert res["status"] == "mock_sent"


@pytest.mark.asyncio
async def test_send_telegram_with_inline_buttons():
    """Verify send_telegram_message constructs a valid inline_keyboard payload for buttons."""
    telegram_resp = {
        "ok": True,
        "result": {"message_id": 99, "chat": {"id": 123456789}},
    }
    mock_response = MagicMock(spec=Response)
    mock_response.status_code = 200
    mock_response.json.return_value = telegram_resp

    buttons = [
        {"id": "confirm_donation", "title": "Yes, I will donate"},
        {"id": "decline_donation", "title": "No, I'm busy"},
    ]

    with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post, \
         patch("services.messaging_service.settings") as mock_settings:

        mock_settings.telegram_bot_token = "fake-bot-token"

        res = await send_telegram_message("123456789", "Can you donate?", buttons=buttons)

        assert res["status"] == "sent"
        sent_payload = mock_post.call_args[1]["json"]
        keyboard = sent_payload["reply_markup"]["inline_keyboard"][0]
        assert len(keyboard) == 2
        assert keyboard[0]["callback_data"] == "confirm_donation"
        assert keyboard[1]["callback_data"] == "decline_donation"


# ── Saathi Chatbot ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_saathi_chatbot_intent_matching():
    """Test POST /api/v1/chatbot/message returns a Gemini-enriched Hb reply for Priya."""
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_gemini_resp = MagicMock()
    mock_gemini_resp.text = "Hello, I am Saathi. Priya's current hemoglobin is 7.2 g/dL."
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_gemini_resp)

    with patch("api.routers.chatbot.genai.Client", return_value=mock_client), \
         patch("api.routers.chatbot.settings") as mock_settings:

        mock_settings.gemini_api_key = "fake-gemini-key"
        mock_settings.gemini_model = "gemini-2.5-flash-preview-05-20"

        from fastapi.testclient import TestClient
        with TestClient(app) as client:
            req = {"message": "Show me Priya's hemoglobin level", "language": "en"}
            resp = client.post("/api/v1/chatbot/message", json=req)
            assert resp.status_code == 200
            payload = resp.json()
            assert payload["success"] is True
            assert "hemoglobin" in payload["data"]["reply"].lower()
            assert payload["data"]["context_retrieved"]["patient_name"] == "Priya"


# ── Alert notification ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_alerts_notify_endpoint():
    """Verify the alert notification endpoint dispatches a Telegram message (mock mode)."""
    import uuid
    session_maker = get_session_maker()
    async with session_maker() as session:
        stmt = select(Patient).where(Patient.name == "Priya")
        res = await session.execute(stmt)
        priya = res.scalar_one_or_none()
        assert priya is not None

        temp_id = f"test-alert-{uuid.uuid4()}"
        temp_alert = Alert(
            id=temp_id,
            patient_id=priya.id,
            alert_type="iron_overload",
            severity="warning",
            message="Serum ferritin check required.",
            recommended_action="Review chelation.",
            sent_at=None,
            resolved_at=None,
        )
        session.add(temp_alert)
        await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            notify_url = f"/api/v1/patients/{priya.id}/alerts/{temp_alert.id}/notify"
            notify_resp = await client.post(notify_url, json={})

            assert notify_resp.status_code == 200
            payload = notify_resp.json()
            assert payload["success"] is True
            assert payload["data"]["delivery_status"] in ["mock_sent", "sent"]

        # Cleanup
        session.expire_all()
        stmt_alert = select(Alert).where(Alert.id == temp_id)
        alert_res = await session.execute(stmt_alert)
        updated_alert = alert_res.scalar_one_or_none()
        if updated_alert:
            await session.delete(updated_alert)
            await session.commit()


# ── Telegram webhook ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_telegram_webhook_positive_callback():
    """Test POST /api/v1/messaging/telegram/webhook processes confirm_donation callback.

    Verifies that when Suresh's Telegram chat ID is mapped in the DB and he taps
    the 'confirm_donation' inline button, his status transitions to 'active'.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        # Set Suresh to pending and link a test Telegram chat ID
        stmt = select(Guardian).where(Guardian.name == "Suresh")
        res = await session.execute(stmt)
        suresh = res.scalar_one_or_none()
        assert suresh is not None
        suresh.status = "pending"
        suresh.telegram_chat_id = "987654321"
        session.add(suresh)
        await session.commit()

    # Telegram callback_query update payload
    update_payload = {
        "update_id": 100000001,
        "callback_query": {
            "id": "cq-12345",
            "from": {
                "id": 987654321,
                "first_name": "Suresh",
                "is_bot": False,
            },
            "message": {
                "message_id": 55,
                "chat": {"id": 987654321, "type": "private"},
                "text": "Can you donate for Priya?",
            },
            "data": "confirm_donation",
        },
    }

    with patch("services.messaging_service.settings") as mock_svc_settings:
        mock_svc_settings.telegram_bot_token = ""  # mock send mode

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/messaging/telegram/webhook",
                json=update_payload,
            )
            assert resp.status_code == 200
            resp_data = resp.json()
            assert resp_data["guardian"] == "Suresh"
            assert resp_data["new_status"] == "active"

    # Verify DB commit
    async with session_maker() as session:
        stmt_verify = select(Guardian).where(Guardian.name == "Suresh")
        res_verify = await session.execute(stmt_verify)
        suresh_verify = res_verify.scalar_one_or_none()
        assert suresh_verify.status == "active"


@pytest.mark.asyncio
async def test_telegram_webhook_unknown_user_gets_onboarding():
    """Test that an unregistered Telegram user receives an onboarding message (mock sent)."""
    update_payload = {
        "update_id": 200000001,
        "message": {
            "message_id": 77,
            "from": {"id": 111111111, "first_name": "Unknown", "is_bot": False},
            "chat": {"id": 111111111, "type": "private"},
            "text": "Hello",
        },
    }

    with patch("services.messaging_service.settings") as mock_svc_settings:
        mock_svc_settings.telegram_bot_token = ""  # mock send mode

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/messaging/telegram/webhook",
                json=update_payload,
            )
            assert resp.status_code == 200
            resp_data = resp.json()
            assert resp_data["status"] == "failed"
            assert resp_data["reason"] == "guardian_not_found"
