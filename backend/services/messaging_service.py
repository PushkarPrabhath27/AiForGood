from __future__ import annotations
import json
from typing import Dict, Any, Optional, List
import redis.asyncio as aioredis
import httpx
from google import genai
from google.genai import types

from core.config import settings
from core.exceptions import MessagingError
from core.logging import logger
from models.patient import Patient
from models.guardian import Guardian

# ── Named constants ────────────────────────────────────────────────────────────
GEMINI_TEMPERATURE: float = 0.7
MAX_TOKENS: int = 150
REDIS_SOCKET_TIMEOUT: float = 2.0
MESSAGE_CACHE_TTL: int = 3600          # 1 hour in seconds
TELEGRAM_API_BASE: str = "https://api.telegram.org/bot{token}"
TELEGRAM_TIMEOUT: float = 10.0

# ── Pre-defined localized fallback templates ───────────────────────────────────
LOCALIZED_FALLBACKS: Dict[str, Dict[str, str]] = {
    "en": {
        "t10_soft_ask": (
            "Dear {guardian_name}, {patient_name}'s scheduled blood transfusion is approaching "
            "on {date}. Are you available to support her by donating on this date?"
        ),
        "t7_logistics": (
            "Confirmed! Please arrive at {hospital} at {time} on {date} for {patient_name}'s "
            "transfusion. Please remember to bring a valid photo ID. Thank you!"
        ),
        "post_donation_outcome": (
            "Dear {guardian_name}, thanks to your support, {patient_name}'s hemoglobin rose "
            "from {pre_hb} g/dL to {post_hb} g/dL. She went back to school on {day} feeling "
            "strong and active!"
        ),
        "monthly_update": (
            "Dear {guardian_name}, just wanted to let you know that {patient_name} scored "
            "{score} in her recent school test! Your ongoing commitment keeps her smiling."
        ),
        "birthday_wish": (
            "Happy Birthday {guardian_name} from {patient_name} and her family! "
            "We wish you a beautiful and healthy year ahead."
        ),
    },
    "te": {
        "t10_soft_ask": (
            "నమస్తే {guardian_name} గారు, {patient_name} యొక్క రక్త మార్పిడి {date} తేదీన "
            "ఉన్నది. ఈ సారి రక్త దానం చేయడానికి మీరు అందుబాటులో ఉంటారా?"
        ),
        "t7_logistics": (
            "ధృవీకరించబడింది! {patient_name} రక్త మార్పిడి కోసం దయచేసి {hospital} కు "
            "{date} నాడు {time} సమయానికి చేరుకోండి. మీ ఫోటో గుర్తింపు కార్డును తప్పక "
            "తీసుకురండి."
        ),
        "post_donation_outcome": (
            "ప్రియమైన {guardian_name} గారు, మీ రక్త దానం వల్ల {patient_name} యొక్క "
            "హీమోగ్లోబిన్ {pre_hb} నుండి {post_hb} కి పెరిగింది. ఆమె {day} రోజున బడికి "
            "చాలా బలంగా, ఉత్సాహంగా వెళ్లింది!"
        ),
        "monthly_update": (
            "నమస్తే {guardian_name} గారు, {patient_name} తన పాఠశాల పరీక్షలలో {score} "
            "సాధించిందని తెలియజేయడానికి సంతోషిస్తున్నాము. మీ నిరంతర ఆశీస్సులకు మా "
            "ధన్యవాదాలు."
        ),
        "birthday_wish": (
            "{guardian_name} గారికి పుట్టినరోజు శుభాకాంక్షలు! {patient_name} మరియు వారి "
            "కుటుంబ సభ్యుల తరపున ప్రత్యేక అభినందనలు."
        ),
    },
}


async def generate_guardian_message(
    guardian: Guardian,
    patient: Patient,
    message_type: str,
    context: Dict[str, Any],
) -> str:
    """Generate a warm, personalised coordination message via Google Gemini.

    Falls back gracefully to localized pre-written templates when Gemini is
    unavailable or the API key is absent. Results are cached in Redis to avoid
    duplicate API calls across repeated worker runs.

    Args:
        guardian: The Guardian model instance to contact.
        patient: The child Patient model instance.
        message_type: One of ``t10_soft_ask``, ``t7_logistics``,
            ``post_donation_outcome``, ``monthly_update``, ``birthday_wish``.
        context: Contextual variables — dates, scores, Hb levels, etc.

    Returns:
        Fully composed, empathetic message string.
    """
    lang = guardian.preferred_language or "en"
    if lang not in LOCALIZED_FALLBACKS:
        lang = "en"

    cache_key = f"message:{guardian.id}:{message_type}"

    # 1. Attempt Redis cache read ───────────────────────────────────────────────
    redis_client = aioredis.from_url(settings.redis_url, socket_timeout=REDIS_SOCKET_TIMEOUT)
    try:
        cached_msg = await redis_client.get(cache_key)
        if cached_msg:
            logger.info(
                "guardian_message_cache_hit",
                guardian_id=guardian.id,
                message_type=message_type,
            )
            return cached_msg.decode("utf-8") if isinstance(cached_msg, bytes) else cached_msg
    except Exception as err:
        logger.warning("message_cache_read_failed", error=str(err))
    finally:
        await redis_client.aclose()

    # 2. Build localized fallback ───────────────────────────────────────────────
    fallback_template = LOCALIZED_FALLBACKS[lang].get(
        message_type, LOCALIZED_FALLBACKS["en"][message_type]
    )
    tpl_vars = {
        "guardian_name": guardian.name,
        "patient_name": patient.name,
        "date": context.get("date", "soon"),
        "hospital": patient.hospital_id,
        "time": context.get("time", "9:00 AM"),
        "pre_hb": str(context.get("pre_hb", "6.8")),
        "post_hb": str(context.get("post_hb", "10.4")),
        "day": context.get("day", "Tuesday"),
        "score": context.get("score", "94%"),
    }
    rendered_fallback = fallback_template.format(**tpl_vars)

    if not settings.gemini_api_key:
        logger.info(
            "gemini_key_missing_using_template_fallback",
            guardian_id=guardian.id,
            message_type=message_type,
        )
        return rendered_fallback

    # 3. Generate via Google Gemini SDK ────────────────────────────────────────
    system_prompt = (
        "You are a compassionate clinical coordinator for RaktaSetu NOOR, a Thalassemia care "
        "platform. Write brief, warm, personalised messages to blood donors who are guardians "
        "for specific children. Always reference the child by name. Include specific clinical "
        "outcomes when available. Write in the guardian's preferred language. "
        "Max 3 sentences for WhatsApp. Never use generic donor language."
    )
    prompt = (
        f"Generate a message of type '{message_type}' for donor {guardian.name} "
        f"(preferred language: {lang}).\n"
        f"Patient details: Name: {patient.name}, Hospital: {patient.hospital_id}.\n"
        f"Provided context variables: {json.dumps(context)}.\n"
        f"Fallback/Target structure: '{rendered_fallback}'\n"
        "Draft the output to be warm, respectful, and short. "
        "Do not add conversational headers or wrappers — return only the message body."
    )

    try:
        async with genai.Client(api_key=settings.gemini_api_key) as client:
            response = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=GEMINI_TEMPERATURE,
                    max_output_tokens=MAX_TOKENS,
                ),
            )
            generated_text = (response.text or "").strip()
            if not generated_text:
                raise ValueError("Empty response text returned from Gemini API")

            # Strip accidental surrounding double-quotes
            if generated_text.startswith('"') and generated_text.endswith('"'):
                generated_text = generated_text[1:-1].strip()

            # Cache the result
            redis_client2 = aioredis.from_url(
                settings.redis_url, socket_timeout=REDIS_SOCKET_TIMEOUT
            )
            try:
                await redis_client2.setex(cache_key, MESSAGE_CACHE_TTL, generated_text)
                logger.info("guardian_message_cached_successfully", guardian_id=guardian.id)
            except Exception as redis_err:
                logger.warning("message_cache_write_failed", error=str(redis_err))
            finally:
                await redis_client2.aclose()

            logger.info(
                "guardian_message_generated_via_gemini",
                guardian_id=guardian.id,
                message_type=message_type,
            )
            return generated_text

    except Exception as err:
        logger.warning(
            "gemini_generation_failed_falling_back_to_template",
            guardian_id=guardian.id,
            message_type=message_type,
            error=str(err),
        )
        return rendered_fallback


async def send_telegram_message(
    chat_id: str,
    message: str,
    buttons: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Dispatch a message to a Telegram chat via the Telegram Bot API.

    Supports plain text messages and inline-keyboard button messages. Falls back
    to a mock response when ``TELEGRAM_BOT_TOKEN`` is absent, so the codebase
    runs without credentials during unit tests.

    Args:
        chat_id: Telegram chat ID of the recipient (numeric string, e.g. ``"123456789"``).
        message: Text body to send.
        buttons: Optional list of inline button dicts each containing ``id`` (callback_data)
            and ``title`` (display label), e.g.
            ``[{"id": "confirm_donation", "title": "Yes, I will donate"}]``.
            A maximum of 3 buttons per row is enforced.

    Returns:
        Dict with keys ``message_id``, ``status``, and ``message``.

    Raises:
        MessagingError: When credentials exist but the Telegram API returns an error.
    """
    logger.info(
        "initiating_telegram_message_dispatch",
        chat_id=chat_id,
        has_buttons=buttons is not None,
    )

    # Mock mode when token or chat_id is absent ────────────────────────────────
    if not settings.telegram_bot_token:
        logger.warning("telegram_token_missing_running_in_mock_send_mode", chat_id=chat_id)
        return {
            "message_id": "mock_msg_id_123456",
            "status": "mock_sent",
            "message": message,
            "buttons": buttons,
        }

    if not chat_id or not chat_id.strip():
        logger.warning(
            "telegram_chat_id_empty_running_in_mock_send_mode",
            detail="Guardian has no telegram_chat_id configured. Message logged but not dispatched.",
        )
        return {
            "message_id": "mock_msg_id_no_chat_id",
            "status": "mock_sent",
            "message": message,
            "buttons": buttons,
        }

    base_url = TELEGRAM_API_BASE.format(token=settings.telegram_bot_token)
    url = f"{base_url}/sendMessage"

    payload: Dict[str, Any] = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
    }

    if buttons:
        # Build inline keyboard — one row of up to 3 buttons
        inline_keyboard = [
            [{"text": btn["title"], "callback_data": btn["id"]} for btn in buttons[:3]]
        ]
        payload["reply_markup"] = {"inline_keyboard": inline_keyboard}

    try:
        async with httpx.AsyncClient(timeout=TELEGRAM_TIMEOUT) as http_client:
            response = await http_client.post(url, json=payload)
            response_json = response.json()

            if not response_json.get("ok"):
                err_desc = response_json.get("description", "Unknown Telegram error")
                logger.error(
                    "telegram_api_returned_error",
                    status_code=response.status_code,
                    description=err_desc,
                )
                raise MessagingError(
                    f"Telegram API error (HTTP {response.status_code}): {err_desc}"
                )

            msg_id = str(response_json.get("result", {}).get("message_id", "sent"))
            logger.info("telegram_message_delivered", message_id=msg_id, chat_id=chat_id)
            return {
                "message_id": msg_id,
                "status": "sent",
                "message": message,
            }

    except MessagingError:
        raise
    except Exception as err:
        logger.error("telegram_message_delivery_failed", error=str(err))
        raise MessagingError(f"Telegram message delivery failed: {str(err)}")
