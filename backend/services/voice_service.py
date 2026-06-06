from __future__ import annotations
import base64
import httpx
from typing import Dict, Any

from core.config import settings
from core.logging import logger

# Named Constants
DEFAULT_SAMPLE_RATE: int = 16000
DEFAULT_TRANSLATION_FALLBACK: str = "Thank you Suresh uncle. Because of you I feel strong again. — Priya"


async def translate_voice_note(
    audio_bytes: bytes,
    source_lang: str,
    target_lang: str
) -> str:
    """
    Transcribes and translates raw audio voice notes to the target language
    using Google Cloud Speech-to-Text and Translation REST APIs.
    Falls back to a warm, default message if credentials are not configured or the API fails.

    Args:
        audio_bytes (bytes): Raw binary audio data.
        source_lang (str): Source language locale (e.g. "te-IN").
        target_lang (str): Target language locale (e.g. "en-IN").

    Returns:
        str: Translated English text string.
    """
    logger.info(
        "voice_note_translation_triggered",
        source_lang=source_lang,
        target_lang=target_lang,
        size_bytes=len(audio_bytes)
    )

    if not settings.google_api_key:
        logger.warning("google_api_key_missing_using_translation_fallback")
        return DEFAULT_TRANSLATION_FALLBACK

    base64_audio = base64.b64encode(audio_bytes).decode("utf-8")

    # 1. Google Speech-to-Text (ASR)
    stt_url = f"https://speech.googleapis.com/v1/speech:recognize?key={settings.google_api_key}"
    stt_payload = {
        "config": {
            "encoding": "LINEAR16",
            "sampleRateHertz": DEFAULT_SAMPLE_RATE,
            "languageCode": source_lang,
            "alternativeLanguageCodes": ["en-IN", "hi-IN"]
        },
        "audio": {
            "content": base64_audio
        }
    }

    transcript = ""
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            stt_resp = await http_client.post(stt_url, json=stt_payload)
            stt_resp.raise_for_status()
            stt_data = stt_resp.json()
            
            results = stt_data.get("results", [])
            if results:
                transcript = results[0].get("alternatives", [{}])[0].get("transcript", "").strip()
                logger.info("google_speech_to_text_completed", transcript_preview=transcript[:60])
            else:
                logger.warning("google_speech_to_text_returned_no_results")
                return DEFAULT_TRANSLATION_FALLBACK
    except Exception as err:
        logger.error("google_speech_to_text_failed", error=str(err))
        return DEFAULT_TRANSLATION_FALLBACK

    if not transcript:
        return DEFAULT_TRANSLATION_FALLBACK

    # 2. Google Cloud Translation
    translate_url = f"https://translation.googleapis.com/language/translate/v2?key={settings.google_api_key}"
    target_code = target_lang.split("-")[0]  # E.g. convert "en-IN" to "en"
    
    translate_payload = {
        "q": [transcript],
        "target": target_code
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            trans_resp = await http_client.post(translate_url, json=translate_payload)
            trans_resp.raise_for_status()
            trans_data = trans_resp.json()
            
            translations = trans_data.get("data", {}).get("translations", [])
            if translations:
                translated_text = translations[0].get("translatedText", "").strip()
                logger.info("google_translation_completed", translated_preview=translated_text[:60])
                return translated_text
            else:
                logger.warning("google_translation_returned_no_results")
                return transcript
    except Exception as err:
        logger.error("google_translation_failed", error=str(err))
        return transcript


async def text_to_speech(
    text: str,
    language: str
) -> bytes:
    """
    Converts plain text into spoken audio bytes using Google Cloud Text-to-Speech.
    Leverages high-fidelity Wavenet regional neural voices.

    Args:
        text (str): Input text string to synthesize.
        language (str): Destination language code (e.g. "te-IN" or "en-IN").

    Returns:
        bytes: Raw synthesized audio file bytes (MP3 format).
    """
    logger.info("text_to_speech_conversion_triggered", language=language, text_length=len(text))

    if not settings.google_api_key:
        logger.warning("google_api_key_missing_skipping_tts_conversion")
        return b""

    # Map language code to Wavenet name
    voice_name = f"{language}-Wavenet-A"
    
    # Simple checks/overrides for supported voice structures
    if language not in ("te-IN", "en-IN", "hi-IN"):
        voice_name = "en-IN-Wavenet-A"

    tts_url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={settings.google_api_key}"
    tts_payload = {
        "input": {
            "text": text
        },
        "voice": {
            "languageCode": language,
            "name": voice_name
        },
        "audioConfig": {
            "audioEncoding": "MP3"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            tts_resp = await http_client.post(tts_url, json=tts_payload)
            tts_resp.raise_for_status()
            tts_data = tts_resp.json()
            
            audio_content_b64 = tts_data.get("audioContent", "")
            if audio_content_b64:
                logger.info("google_text_to_speech_completed_successfully")
                return base64.b64decode(audio_content_b64)
            else:
                logger.warning("google_text_to_speech_returned_empty_content")
                return b""
    except Exception as err:
        logger.error("google_text_to_speech_failed", error=str(err))
        return b""
