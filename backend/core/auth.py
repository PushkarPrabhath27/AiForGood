import os
from functools import lru_cache
from fastapi import Header, HTTPException
import httpx
from jose import jwt, JWTError
from core.config import settings
from core.logging import logger

COGNITO_REGION = "us-east-1"
# Ensure pool ID is retrieved safely from configuration or env
COGNITO_USER_POOL_ID = os.environ.get("AWS_COGNITO_USER_POOL_ID") or settings.model_extra.get("aws_cognito_user_pool_id", "")
COGNITO_KEYS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json" if COGNITO_USER_POOL_ID else ""

@lru_cache(maxsize=1)
def get_cognito_public_keys() -> dict:
    """
    Cached fetch of Cognito Json Web Key Sets (JWKS).
    Retrieved synchronously once and cached.
    """
    if not COGNITO_KEYS_URL:
        logger.warning("cognito_user_pool_id_missing_jwks_lookup_disabled")
        return {}
    try:
        resp = httpx.get(COGNITO_KEYS_URL, timeout=5.0)
        resp.raise_for_status()
        return {key["kid"]: key for key in resp.json()["keys"]}
    except Exception as e:
        logger.error("failed_to_fetch_cognito_jwks", error=str(e))
        return {}

async def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Dependency injection handler to authenticate requests via Cognito JWTs.
    Decodes and validates token algorithms and signatures.
    
    Args:
        authorization: Bearer token header.
        
    Returns:
        dict: The decoded token payload claims.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    # In development/test mode, allow a bypass test token for validation checks
    if settings.app_env == "development" and token == "TEST_TOKEN":
        return {"sub": "test-user-uuid", "email": "test@raktasetu.org", "username": "test_coordinator"}
        
    try:
        header = jwt.get_unverified_header(token)
        keys = get_cognito_public_keys()
        
        # If JWKS cache is empty, try one active refetch
        if not keys and COGNITO_KEYS_URL:
            # Clear lru_cache to retry fetch
            get_cognito_public_keys.cache_clear()
            keys = get_cognito_public_keys()
            
        key = keys.get(header.get("kid"))
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key ID reference")
        
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False}  # Cognito doesn't require aud claim verification
        )
        return payload
    except JWTError as e:
        logger.warning("jwt_verification_failed", error=str(e))
        raise HTTPException(status_code=401, detail=f"Invalid authorization token: {str(e)}")
