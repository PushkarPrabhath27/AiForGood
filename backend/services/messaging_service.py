from __future__ import annotations
import json
from typing import Dict, Any, Optional
import redis.asyncio as aioredis
from anthropic import AsyncAnthropic
from twilio.rest import Client as TwilioClient

from core.config import settings
from core.exceptions import MessagingError
from core.logging import logger
from models.patient import Patient
from models.guardian import Guardian

# Named Constants
CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"
MAX_TOKENS: int = 150
CLAUDE_TEMPERATURE: float = 0.7
REDIS_SOCKET_TIMEOUT: float = 2.0
MESSAGE_CACHE_TTL: int = 3600  # 1 hour in seconds

# Pre-defined fallbacks for localized templates
LOCALIZED_FALLBACKS: Dict[str, Dict[str, str]] = {
    "en": {
        "t10_soft_ask": "Dear {guardian_name}, {patient_name}'s scheduled blood transfusion is approaching on {date}. Are you available to support her by donating on this date?",
        "t7_logistics": "Confirmed! Please arrive at {hospital} at {time} on {date} for {patient_name}'s transfusion. Please remember to bring a valid photo ID. Thank you!",
        "post_donation_outcome": "Dear {guardian_name}, thanks to your support, {patient_name}'s hemoglobin rose from {pre_hb} g/dL to {post_hb} g/dL. She went back to school on {day} feeling strong and active!",
        "monthly_update": "Dear {guardian_name}, just wanted to let you know that {patient_name} scored {score} in her recent school test! Your ongoing commitment keeps her smiling.",
        "birthday_wish": "Happy Birthday {guardian_name} from {patient_name} and her family! We wish you a beautiful and healthy year ahead."
    },
    "te": {
        "t10_soft_ask": "నమస్తే {guardian_name} గారు, {patient_name} యొక్క రక్త మార్పిడి {date} తేదీన ఉన్నది. ఈ సారి రక్త దానం చేయడానికి మీరు అందుబాటులో ఉంటారా?",
        "t7_logistics": "ధృవీకరించబడింది! {patient_name} రక్త మార్పిడి కోసం దయచేసి {hospital} కు {date} నాడు {time} సమయానికి చేరుకోండి. మీ ఫోటో గుర్తింపు కార్డును తప్పక తీసుకురండి.",
        "post_donation_outcome": "ప్రియమైన {guardian_name} గారు, మీ రక్త దానం వల్ల {patient_name} యొక్క హీమోగ్లోబిన్ {pre_hb} నుండి {post_hb} కి పెరిగింది. ఆమె {day} రోజున బడికి చాలా బలంగా, ఉత్సాహంగా వెళ్లింది!",
        "monthly_update": "నమస్తే {guardian_name} గారు, {patient_name} తన పాఠశాల పరీక్షలలో {score} సాధించిందని తెలియజేయడానికి సంతోషిస్తున్నాము. మీ నిరంతర ఆశీస్సులకు మా ధన్యవాదాలు.",
        "birthday_wish": "{guardian_name} గారికి పుట్టినరోజు శుభాకాంక్షలు! {patient_name} మరియు వారి కుటుంబ సభ్యుల తరపున ప్రత్యేక అభినందనలు."
    }
}


async def generate_guardian_message(
    guardian: Guardian,
    patient: Patient,
    message_type: str,
    context: Dict[str, Any]
) -> str:
    """
    Generates a warm, highly personalized coordination or update message using Claude 3.5 Sonnet.
    Falls back gracefully to localized pre-written templates if external APIs are unavailable or fail.
    Caches results in Redis to avoid duplicate API calls and reduce costs.

    Args:
        guardian (Guardian): The guardian model instance to contact.
        patient (Patient): The child patient model instance.
        message_type (str): Type of message (t10_soft_ask, t7_logistics, etc.)
        context (Dict[str, Any]): Contextual variables like dates, scores, Hb levels, days.

    Returns:
        str: Fully composed, empathetic message.

    Raises:
        None: Handles all internal errors gracefully via logging and fallback templates.
    """
    lang = guardian.preferred_language or "en"
    if lang not in LOCALIZED_FALLBACKS:
        lang = "en"

    cache_key = f"message:{guardian.id}:{message_type}"

    # 1. Attempt Redis cache read
    redis_client = aioredis.from_url(settings.redis_url, socket_timeout=REDIS_SOCKET_TIMEOUT)
    try:
        cached_msg = await redis_client.get(cache_key)
        if cached_msg:
            logger.info("guardian_message_cache_hit", guardian_id=guardian.id, message_type=message_type)
            return cached_msg.decode("utf-8") if isinstance(cached_msg, bytes) else cached_msg
    except Exception as err:
        logger.warning("message_cache_read_failed", error=str(err))
    finally:
        await redis_client.aclose()

    # 2. Setup fallbacks in case Claude fails or settings are empty
    fallback_template = LOCALIZED_FALLBACKS[lang].get(message_type, LOCALIZED_FALLBACKS["en"][message_type])
    
    # Pre-populate variables for template rendering safely
    tpl_vars = {
        "guardian_name": guardian.name,
        "patient_name": patient.name,
        "date": context.get("date", "soon"),
        "hospital": patient.hospital_id,
        "time": context.get("time", "9:00 AM"),
        "pre_hb": str(context.get("pre_hb", "6.8")),
        "post_hb": str(context.get("post_hb", "10.4")),
        "day": context.get("day", "Tuesday"),
        "score": context.get("score", "94%")
    }
    
    rendered_fallback = fallback_template.format(**tpl_vars)

    # If Anthropic API key is not configured, immediately return the rendered fallback template
    if not settings.anthropic_api_key:
        logger.info("anthropic_key_missing_using_template_fallback", guardian_id=guardian.id, message_type=message_type)
        return rendered_fallback

    # 3. Generate personalized message via Claude
    system_prompt = (
        "You are a compassionate clinical coordinator for RaktaSetu NOOR, a Thalassemia care platform. "
        "Write brief, warm, personalized messages to blood donors who are guardians for specific children. "
        "Always reference the child by name. Include specific clinical outcomes when available. "
        "Write in the guardian's preferred language. Max 3 sentences for WhatsApp. Never use generic donor language."
    )

    prompt = (
        f"Generate a message of type '{message_type}' for donor {guardian.name} (preferred language: {lang}).\n"
        f"Patient details: Name: {patient.name}, Hospital: {patient.hospital_id}.\n"
        f"Provided context variables: {json.dumps(context)}.\n"
        f"Fallback/Target structure: '{rendered_fallback}'\n"
        "Draft the output to be warm, respectful, and short. Do not add conversational headers or wrappers, return only the message body."
    )

    try:
        # Initialize Anthropic Async Client
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        
        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            temperature=CLAUDE_TEMPERATURE,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}]
        )
        
        generated_text = response.content[0].text.strip()
        
        # Strip any accidental double-quotes around the response
        if generated_text.startswith('"') and generated_text.endswith('"'):
            generated_text = generated_text[1:-1].strip()

        # Cache the generated message
        redis_client = aioredis.from_url(settings.redis_url, socket_timeout=REDIS_SOCKET_TIMEOUT)
        try:
            await redis_client.setex(cache_key, MESSAGE_CACHE_TTL, generated_text)
            logger.info("guardian_message_cached_successfully", guardian_id=guardian.id)
        except Exception as redis_err:
            logger.warning("message_cache_write_failed", error=str(redis_err))
        finally:
            await redis_client.aclose()

        logger.info("guardian_message_generated_via_claude", guardian_id=guardian.id, message_type=message_type)
        return generated_text

    except Exception as err:
        logger.warning(
            "claude_generation_failed_falling_back_to_template",
            guardian_id=guardian.id,
            message_type=message_type,
            error=str(err)
        )
        return rendered_fallback


async def send_whatsapp_message(phone: str, message: str) -> Dict[str, Any]:
    """
    Dispatches a WhatsApp message using the Twilio Python SDK.
    Enforces a graceful mock fallback if Twilio credentials are missing in settings.

    Args:
        phone (str): Recipient phone number (e.g. +919876543210).
        message (str): Body of the message to send.

    Returns:
        Dict[str, Any]: Dict containing the delivery response metrics (sid, status).

    Raises:
        MessagingError: If credentials exist but Twilio API returns a delivery failure.
    """
    logger.info("initiating_whatsapp_message_dispatch", phone=phone)

    # 1. Enable mock dispatch mode if credentials are empty/placeholder
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("twilio_credentials_missing_running_in_mock_send_mode", phone=phone)
        return {
            "sid": "mock_sid_123456789abcdef",
            "status": "mock_sent",
            "message": message
        }

    # 2. Actual Twilio Carrier Dispatch
    try:
        # Normalize phone formatting
        clean_phone = phone.strip()
        if not clean_phone.startswith("+"):
            clean_phone = f"+{clean_phone}"

        # Initialize Twilio Client
        client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
        
        # Dispatch message asynchronously in executors if blocking is expected
        response = client.messages.create(
            from_=settings.twilio_whatsapp_from,
            to=f"whatsapp:{clean_phone}",
            body=message
        )

        logger.info("whatsapp_message_delivered", sid=response.sid, status=response.status)
        return {
            "sid": response.sid,
            "status": response.status,
            "message": message
        }

    except Exception as err:
        logger.error("twilio_api_delivery_failed", error=str(err))
        raise MessagingError(f"Twilio messaging delivery failed: {str(err)}")
