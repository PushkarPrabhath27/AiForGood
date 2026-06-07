from __future__ import annotations

import asyncio
from typing import Any
import boto3
from core.config import settings
from core.logging import logger

# Named constants
DEFAULT_BEDROCK_MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
DEFAULT_BEDROCK_REGION = "us-east-1"
DEFAULT_MAX_TOKENS = 150
DEFAULT_TEMPERATURE = 0.7


async def invoke_bedrock_converse(
    prompt: str,
    system_prompt: Optional[str] = None,
    model_id: Optional[str] = None,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    temperature: float = DEFAULT_TEMPERATURE,
) -> str:
    """Invokes AWS Bedrock model via the unified Converse API.

    Args:
        prompt: User prompt content.
        system_prompt: Optional system instruction prompt.
        model_id: Bedrock model ID or system inference profile ID.
        max_tokens: Maximum tokens to generate.
        temperature: Temperature for generation.

    Returns:
        Generated response text string.

    Raises:
        ValueError: If prompt is empty.
    """
    if not prompt or not prompt.strip():
        raise ValueError("Prompt must not be empty")

    active_model = model_id or DEFAULT_BEDROCK_MODEL_ID
    logger.info("invoking_bedrock_model", model_id=active_model)

    client = boto3.client(
        "bedrock-runtime",
        region_name=DEFAULT_BEDROCK_REGION
    )

    messages = [
        {
            "role": "user",
            "content": [{"text": prompt}]
        }
    ]

    kwargs: dict[str, Any] = {
        "modelId": active_model,
        "messages": messages,
        "inferenceConfig": {
            "maxTokens": max_tokens,
            "temperature": temperature
        }
    }

    if system_prompt:
        kwargs["system"] = [{"text": system_prompt}]

    try:
        # Run blocking boto3 client call in asyncio threadpool to prevent blocking the event loop
        response = await asyncio.to_thread(client.converse, **kwargs)
        result_text = response["output"]["message"]["content"][0]["text"]
        logger.info("bedrock_model_invocation_success", model_id=active_model)
        return result_text
    except Exception as e:
        logger.error("bedrock_model_invocation_failed", model_id=active_model, error=str(e))
        raise e


# Convenience alias used by services that generate free-text messages
generate_message = invoke_bedrock_converse
