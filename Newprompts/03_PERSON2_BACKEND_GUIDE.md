# RaktaSetu NOOR — Person 2 (Backend + ML + Infrastructure) Implementation Guide
## AI Agent Instructions: Cursor / Claude Code
### READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE

---

## PRIME DIRECTIVE

You are implementing the backend, ML pipeline, AWS infrastructure, and all new AI features for a production-grade clinical platform. Every system you build must meet FAANG engineering standards. No shortcuts. No toy implementations. Every algorithm must be mathematically correct, every API must be typed, every failure must be handled.

**Your domain:** Everything in `/backend/`, AWS infrastructure configuration, and `/shared/contracts/` (schema side). You do NOT touch `/frontend/` under any circumstances.

**Your stack:** FastAPI 0.111, Python 3.11, SQLAlchemy 2.0 async, Alembic, Redis, Amazon Bedrock, Amazon RDS, Amazon DynamoDB, AWS Lambda, Amazon EventBridge, Sarvam AI, Telegram Bot API, Google OR-Tools, Facebook Prophet.

**Rule:** After completing each phase below, STOP. Print a summary of what was built, what was tested, and the implementation plan for the next phase. Do NOT proceed to the next phase until the user explicitly says "proceed" or "go to Phase X."

---

## PHASE 0: AWS Infrastructure Provisioning

This is the most critical phase. Nothing else works without this. Do this first, get it stable, then build features.

### 0.1 Prerequisites

Confirm the following CLI tools are installed:
```bash
aws --version          # >= 2.15.0
python --version       # 3.11.x
alembic --version      # >= 1.13.0
docker --version       # >= 24.0.0
```

### 0.2 Amazon RDS PostgreSQL

**Provision via AWS CLI:**
```bash
# Create subnet group first (use default VPC subnets)
aws rds create-db-subnet-group \
  --db-subnet-group-name raktasetu-subnet-group \
  --db-subnet-group-description "RaktaSetu NOOR subnet group" \
  --subnet-ids subnet-XXXX subnet-YYYY \
  --region ap-south-1

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier raktasetu-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username raktasetu_admin \
  --master-user-password "$(openssl rand -base64 32)" \
  --allocated-storage 20 \
  --db-name raktasetu \
  --publicly-accessible \
  --backup-retention-period 1 \
  --region ap-south-1

# Get endpoint after instance is available (~5 min)
aws rds describe-db-instances \
  --db-instance-identifier raktasetu-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

Store the password in AWS Secrets Manager immediately:
```bash
aws secretsmanager create-secret \
  --name raktasetu/db-password \
  --description "RaktaSetu RDS password" \
  --secret-string '{"password":"YOUR_GENERATED_PASSWORD"}' \
  --region ap-south-1
```

Update `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql+asyncpg://raktasetu_admin:PASSWORD@RDS_ENDPOINT:5432/raktasetu
DATABASE_URL_SYNC=postgresql://raktasetu_admin:PASSWORD@RDS_ENDPOINT:5432/raktasetu
```

Run existing Alembic migrations:
```bash
cd backend
alembic upgrade head
python db/seed_demo_data.py
```

Verify:
```bash
python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine('postgresql+asyncpg://...')
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT count(*) FROM patients'))
        print('Patients:', result.scalar())

asyncio.run(check())
"
```

### 0.3 Amazon ElastiCache (Redis)

```bash
# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id raktasetu-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0.7 \
  --num-cache-nodes 1 \
  --region ap-south-1

# Get endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id raktasetu-cache \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text
```

### 0.4 Amazon DynamoDB (Compatibility Graph)

```bash
# Create DonorCompatibilityEdges table
aws dynamodb create-table \
  --table-name DonorCompatibilityEdges \
  --attribute-definitions \
    AttributeName=donor_id,AttributeType=S \
    AttributeName=patient_id,AttributeType=S \
    AttributeName=blood_type,AttributeType=S \
    AttributeName=city_code,AttributeType=S \
  --key-schema \
    AttributeName=donor_id,KeyType=HASH \
    AttributeName=patient_id,KeyType=RANGE \
  --global-secondary-indexes '[
    {
      "IndexName": "blood_type-city_code-index",
      "KeySchema": [
        {"AttributeName": "blood_type", "KeyType": "HASH"},
        {"AttributeName": "city_code", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "BillingMode": "PAY_PER_REQUEST"
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### 0.5 AWS Cognito

```bash
# Create User Pool
aws cognito-idp create-user-pool \
  --pool-name raktasetu-users \
  --policies PasswordPolicy='{MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}' \
  --auto-verified-attributes email \
  --username-attributes email \
  --region ap-south-1

# Create App Client (note the ClientId)
aws cognito-idp create-user-pool-client \
  --user-pool-id YOUR_POOL_ID \
  --client-name raktasetu-frontend \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region ap-south-1
```

### 0.6 Update Auth Validation in FastAPI

Replace Supabase JWT validation with Cognito JWT validation:

```python
# backend/core/auth.py
import httpx
from jose import jwt, JWTError
from functools import lru_cache
import json

COGNITO_REGION = "ap-south-1"
COGNITO_USER_POOL_ID = os.environ["AWS_COGNITO_USER_POOL_ID"]
COGNITO_KEYS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"

@lru_cache(maxsize=1)
def get_cognito_public_keys() -> dict:
    """Cached fetch of Cognito JWKS. Cache is cleared on cold start."""
    resp = httpx.get(COGNITO_KEYS_URL, timeout=5)
    resp.raise_for_status()
    return {key["kid"]: key for key in resp.json()["keys"]}

async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    try:
        header = jwt.get_unverified_header(token)
        keys = get_cognito_public_keys()
        key = keys.get(header["kid"])
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key ID")
        
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False}  # Cognito doesn't use aud claim
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
```

Add `python-jose[cryptography]` to `requirements.txt`.

### 0.7 AWS App Runner Deployment

Create `/backend/apprunner.yaml`:
```yaml
version: 1.0
runtime: python311
build:
  commands:
    build:
      - pip install -r requirements.txt
      - alembic upgrade head
run:
  runtime-version: 3.11
  command: uvicorn api.main:app --host 0.0.0.0 --port 8080
  network:
    port: 8080
    env: PORT
  env:
    - name: APP_ENV
      value: production
    - name: AWS_REGION
      value: ap-south-1
```

Deploy:
```bash
aws apprunner create-service \
  --service-name raktasetu-api \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/YOUR_ORG/raktasetu-noor",
      "SourceCodeVersion": {"Type": "BRANCH", "Value": "main"},
      "CodeConfiguration": {
        "ConfigurationSource": "REPOSITORY"
      }
    }
  }' \
  --region ap-south-1
```

### 0.8 Amazon Bedrock — Verify Access

```python
# Verify Bedrock access from ap-south-1 (or us-east-1 if not available in ap-south-1)
import boto3

bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
response = bedrock.invoke_model(
    modelId='anthropic.claude-sonnet-4-5',
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 100,
        "messages": [{"role": "user", "content": "Say hello."}]
    }),
    contentType='application/json',
    accept='application/json'
)
print(json.loads(response['body'].read()))
```

**Important:** If `anthropic.claude-sonnet-4-5` is not available in `ap-south-1`, use `us-east-1` as the Bedrock region. Add `AWS_BEDROCK_REGION=us-east-1` to env vars and use a separate boto3 client for Bedrock calls.

### 0.9 Amazon CloudWatch — Health Metric Publishing

Add to `api/main.py` lifespan:
```python
import boto3
from datetime import datetime

cloudwatch = boto3.client('cloudwatch', region_name=os.environ.get('AWS_REGION', 'ap-south-1'))

async def publish_health_metric(metric_name: str, value: float, unit: str = 'Count'):
    """Publish a single metric to CloudWatch. Fire and forget."""
    try:
        cloudwatch.put_metric_data(
            Namespace='RaktaSetu/NOOR',
            MetricData=[{
                'MetricName': metric_name,
                'Timestamp': datetime.utcnow(),
                'Value': value,
                'Unit': unit,
                'Dimensions': [{'Name': 'Environment', 'Value': os.environ.get('APP_ENV', 'dev')}]
            }]
        )
    except Exception:
        pass  # Never fail the main request for a metric
```

Publish key metrics:
- `ForecastGenerated` (count) — in `forecasts.py`
- `MobilizationTriggered` (count) — in `guardians.py`
- `SentinelAlertFired` (count) — in new sentinel service
- `GridMatchCreated` (count) — in `grid.py`
- `APILatencyMs` (milliseconds) — middleware

### 0.10 Phase 0 Completion Checkpoint

Run the full verification suite:
```bash
# Test database connection
curl http://localhost:8000/health
# Expected: {"status":"ok","database":"connected","redis":"connected"}

# Test Bedrock
python -c "from services.bedrock_service import generate_message; print(asyncio.run(generate_message('test')))"

# Test all existing endpoints still work
curl -H "Authorization: Bearer TEST_TOKEN" http://localhost:8000/api/v1/patients
curl -H "Authorization: Bearer TEST_TOKEN" http://localhost:8000/api/v1/grid/city/HYD
```

**STOP HERE. Print Phase 0 summary. Wait for user approval before Phase 1.**

---

## PHASE 1: Bedrock + Sarvam Integration (Replace Gemini)

### 1.1 Create Bedrock Service

Create `/backend/services/bedrock_service.py`:

```python
# backend/services/bedrock_service.py
import boto3
import json
import os
from typing import Optional
import structlog

logger = structlog.get_logger()

BEDROCK_REGION = os.environ.get("AWS_BEDROCK_REGION", "ap-south-1")
MODEL_ID = os.environ.get("AWS_BEDROCK_MODEL_ID", "anthropic.claude-sonnet-4-5")

_bedrock_client = None

def get_bedrock_client():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
    return _bedrock_client

async def generate_message(
    prompt: str,
    system: Optional[str] = None,
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> str:
    """
    Call Amazon Bedrock with Claude Sonnet. Returns generated text.
    Raises RuntimeError if the call fails after 2 retries.
    """
    client = get_bedrock_client()
    
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        body["system"] = system

    for attempt in range(3):
        try:
            response = client.invoke_model(
                modelId=MODEL_ID,
                body=json.dumps(body),
                contentType='application/json',
                accept='application/json'
            )
            result = json.loads(response['body'].read())
            return result['content'][0]['text']
        except Exception as e:
            logger.warning("bedrock_call_failed", attempt=attempt, error=str(e))
            if attempt == 2:
                raise RuntimeError(f"Bedrock call failed after 3 attempts: {e}")
    
    raise RuntimeError("Bedrock unreachable")


async def generate_mobilization_message(
    guardian_name: str,
    patient_name: str,
    patient_age: int,
    blood_type: str,
    days_to_transfusion: int,
    language: str = "en",
    tone: str = "urgent",  # urgent | grateful | informational
) -> str:
    """
    Generate a personalized mobilization message for a donor.
    Tone is selected based on donor behavioral fingerprint.
    """
    tone_instructions = {
        "urgent": "Write with warmth and urgency. The patient needs blood soon.",
        "grateful": "Lead with gratitude for past donations. Make them feel valued.",
        "informational": "Be factual and clear. Give all the details they need to decide.",
    }
    
    system = """You are a compassionate healthcare coordinator for Blood Warriors India, 
    a foundation supporting Thalassemia patients. Write donor messages that are warm, 
    specific, and respectful. Never use guilt. Always be brief — under 120 words.
    Write in the specified language."""
    
    prompt = f"""Write a donor mobilization message with this context:
    - Donor name: {guardian_name}
    - Patient name: {patient_name}, age {patient_age}
    - Blood type needed: {blood_type}
    - Days until transfusion: {days_to_transfusion}
    - Language: {language}
    - Tone instruction: {tone_instructions[tone]}
    
    The message should be sent via Telegram/WhatsApp. Include a call to action."""
    
    return await generate_message(prompt, system=system, max_tokens=200)


async def generate_memorial_message(
    guardian_name: str,
    patient_name: str,
    total_donations: int,
    total_days_supported: int,
    language: str = "en",
) -> str:
    """
    Generate the Grief Protocol memorial message for a guardian.
    This is the most emotionally sensitive message in the system.
    """
    system = """You are writing on behalf of Blood Warriors India to thank a blood donor 
    whose patient has passed away. This message must acknowledge their contribution 
    with deep respect and gratitude. It must never feel like a form letter. 
    It must feel like it was written for them specifically. Keep it under 150 words.
    Do not mention death directly — use 'has left us' or 'is no longer with us'.
    End with a gentle, optional offer to continue their legacy with another patient."""
    
    prompt = f"""Write a memorial message with this context:
    - Guardian (donor) name: {guardian_name}
    - Patient name: {patient_name}
    - Total donations: {total_donations}
    - Days supported: {total_days_supported}
    - Language: {language}
    
    Calculate approximate years if days > 365. Be specific about numbers.
    The message is sent via WhatsApp/Telegram."""
    
    return await generate_message(prompt, system=system, max_tokens=300, temperature=0.8)


async def generate_reengagement_message(
    guardian_name: str,
    patient_name: str,
    last_donation_date: str,
    donation_count: int,
    language: str = "en",
) -> str:
    """Generate a re-engagement message for a drifting donor."""
    system = """You are a care coordinator writing to a donor who has become less responsive.
    Do NOT guilt them. Acknowledge life gets busy. Remind them of their specific impact.
    Make it easy to say yes. Under 100 words."""
    
    prompt = f"""Write a re-engagement message:
    - Guardian: {guardian_name}
    - Patient: {patient_name}
    - Their last donation: {last_donation_date}
    - Their total donation count: {donation_count}
    - Language: {language}"""
    
    return await generate_message(prompt, system=system, max_tokens=150)
```

### 1.2 Replace Gemini Calls

Find all usages of `google.generativeai` or `gemini` in `/backend/services/messaging_service.py` and replace them with calls to `bedrock_service.py`. The function signatures must remain identical — only the implementation changes.

```python
# BEFORE (messaging_service.py)
import google.generativeai as genai
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
response = model.generate_content(prompt)
text = response.text

# AFTER
from services.bedrock_service import generate_mobilization_message
text = await generate_mobilization_message(...)
```

### 1.3 Create Sarvam Service

Create `/backend/services/sarvam_service.py`:

```python
# backend/services/sarvam_service.py
import httpx
import os
import base64
from typing import Optional
import structlog

logger = structlog.get_logger()

SARVAM_API_KEY = os.environ["SARVAM_API_KEY"]
SARVAM_BASE = "https://api.sarvam.ai"

# Language code mapping: ISO 639-1 → Sarvam BCP-47
LANGUAGE_MAP = {
    "hi": "hi-IN", "te": "te-IN", "ta": "ta-IN",
    "mr": "mr-IN", "kn": "kn-IN", "ml": "ml-IN",
    "gu": "gu-IN", "bn": "bn-IN", "or": "or-IN", "en": "en-IN"
}

async def transcribe_voice_note(
    audio_bytes: bytes,
    language_hint: str = "hi",
    with_timestamps: bool = False,
) -> dict:
    """
    Transcribe audio using Sarvam Saaras ASR.
    
    Returns:
        {
            "transcript": str,
            "language_code": str,
            "confidence": float,
            "words": list (if with_timestamps=True)
        }
    
    Falls back to Amazon Transcribe for languages not supported by Sarvam.
    """
    lang_code = LANGUAGE_MAP.get(language_hint, "hi-IN")
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                f"{SARVAM_BASE}/speech-to-text",
                headers={"api-subscription-key": SARVAM_API_KEY},
                files={"file": ("audio.wav", audio_bytes, "audio/wav")},
                data={
                    "language_code": lang_code,
                    "model": "saaras:v1",
                    "with_timestamps": str(with_timestamps).lower(),
                }
            )
            response.raise_for_status()
            data = response.json()
            return {
                "transcript": data.get("transcript", ""),
                "language_code": lang_code,
                "confidence": data.get("confidence", 0.0),
            }
        except httpx.HTTPStatusError as e:
            logger.error("sarvam_asr_failed", status=e.response.status_code, lang=lang_code)
            # Fallback to Amazon Transcribe
            return await _fallback_transcribe(audio_bytes)


async def synthesize_message(
    text: str,
    language: str = "hi",
    speaker: str = "meera",  # meera (F), arvind (M)
    pace: float = 1.0,
) -> bytes:
    """
    Synthesize audio using Sarvam Bulbul TTS.
    Returns WAV audio bytes.
    Falls back to Amazon Polly for English.
    """
    if language == "en":
        return await _polly_synthesize(text)
    
    lang_code = LANGUAGE_MAP.get(language, "hi-IN")
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                f"{SARVAM_BASE}/text-to-speech",
                headers={"api-subscription-key": SARVAM_API_KEY},
                json={
                    "inputs": [text],
                    "target_language_code": lang_code,
                    "speaker": speaker,
                    "model": "bulbul:v1",
                    "pace": pace,
                    "enable_preprocessing": True,
                }
            )
            response.raise_for_status()
            data = response.json()
            # Sarvam returns base64-encoded audio
            audio_b64 = data["audios"][0]
            return base64.b64decode(audio_b64)
        except Exception as e:
            logger.error("sarvam_tts_failed", error=str(e))
            return await _polly_synthesize(text)


async def _fallback_transcribe(audio_bytes: bytes) -> dict:
    """Amazon Transcribe fallback for English audio."""
    import boto3
    # Start transcription job
    # Returns transcript text
    return {"transcript": "", "language_code": "en-IN", "confidence": 0.0}


async def _polly_synthesize(text: str) -> bytes:
    """Amazon Polly fallback for English TTS."""
    import boto3
    polly = boto3.client('polly', region_name='ap-south-1')
    response = polly.synthesize_speech(
        Text=text,
        OutputFormat='mp3',
        VoiceId='Aditi',  # Indian English female voice
        Engine='neural'
    )
    return response['AudioStream'].read()
```

### 1.4 Wire Sarvam into Telegram Voice Note Handler

In `/backend/api/routers/messaging.py`, add handling for Telegram `voice` message type:

```python
@router.post("/telegram/webhook")
async def telegram_webhook(update: dict, db: AsyncSession = Depends(get_db)):
    message = update.get("message", {})
    
    # Existing text handling
    if "text" in message:
        await handle_text_message(message, db)
    
    # NEW: Voice note handling
    elif "voice" in message:
        await handle_voice_message(message, db)
    
    return {"ok": True}


async def handle_voice_message(message: dict, db: AsyncSession):
    """
    1. Download voice note from Telegram
    2. Transcribe via Sarvam
    3. Run through intent parser
    4. Update guardian state machine
    """
    file_id = message["voice"]["file_id"]
    chat_id = message["chat"]["id"]
    
    # Download from Telegram
    audio_bytes = await download_telegram_file(file_id)
    
    # Find guardian by chat_id
    guardian = await get_guardian_by_telegram_chat_id(chat_id, db)
    if not guardian:
        return
    
    # Transcribe — use guardian's preferred language
    transcript_data = await sarvam_service.transcribe_voice_note(
        audio_bytes,
        language_hint=guardian.preferred_language or "hi"
    )
    transcript = transcript_data["transcript"]
    
    # Run through existing valence intent parser
    intent = parse_valence_intent(transcript)
    
    # Update state machine (existing logic)
    await process_guardian_response(guardian, intent, db)
    
    # Send back a synthesized confirmation in their language
    if intent == "positive":
        reply_text = get_confirmation_text(guardian.preferred_language)
        audio_reply = await sarvam_service.synthesize_message(reply_text, language=guardian.preferred_language)
        await send_telegram_voice(chat_id, audio_reply)
    
    logger.info("voice_note_processed",
        guardian_id=str(guardian.id),
        language=transcript_data["language_code"],
        intent=intent,
        transcript_length=len(transcript)
    )
```

### 1.5 Phase 1 Completion Checkpoint

```bash
# Test Bedrock
python -c "
import asyncio
from services.bedrock_service import generate_mobilization_message
result = asyncio.run(generate_mobilization_message('Suresh', 'Priya', 8, 'B+', 14, 'hi'))
print(result)
"

# Test Sarvam TTS
python -c "
import asyncio
from services.sarvam_service import synthesize_message
audio = asyncio.run(synthesize_message('Namaste Suresh ji', language='hi'))
with open('/tmp/test.wav', 'wb') as f: f.write(audio)
print('Audio size:', len(audio), 'bytes')
"

# Test existing endpoints still work
curl -H "Auth..." http://localhost:8000/api/v1/patients/PRIYA_ID/forecast
```

**STOP. Print Phase 1 summary and Phase 2 plan. Wait for user approval.**

---

## PHASE 2: New Database Migrations (All 6 New Ideas)

Run these in sequence. Each migration must be reversible (has `upgrade` and `downgrade`).

### 2.1 Create All Migration Files

```bash
cd backend
alembic revision --autogenerate -m "add_donor_engagement_signals"
alembic revision --autogenerate -m "add_donor_churn_scores"
alembic revision --autogenerate -m "add_circle_repair_log"
alembic revision --autogenerate -m "add_caregiver_checkins"
alembic revision --autogenerate -m "add_sentinel_alerts"
alembic revision --autogenerate -m "add_guardian_memorial_messages"
alembic revision --autogenerate -m "add_blood_weather_forecasts"
alembic revision --autogenerate -m "alter_guardian_circles_add_fatigue"
alembic revision --autogenerate -m "alter_patients_add_status"
```

### 2.2 SQLAlchemy Models

Create `/backend/models/engagement.py`:
```python
from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, Date, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional
import uuid
import enum
from .base import Base

class ResponseType(enum.Enum):
    confirmed = "confirmed"
    declined = "declined"
    no_response = "no_response"

class EngagementTrend(enum.Enum):
    stable = "stable"
    declining = "declining"
    critical = "critical"

class DonorEngagementSignal(Base):
    __tablename__ = "donor_engagement_signals"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guardian_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("guardian_circles.guardian_id"))
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"))
    cycle_number: Mapped[int] = mapped_column(Integer)
    contacted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    response_latency_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    response_type: Mapped[ResponseType] = mapped_column(Enum(ResponseType), default=ResponseType.no_response)
    message_channel: Mapped[str] = mapped_column(String(20), default="telegram")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class DonorChurnScore(Base):
    __tablename__ = "donor_churn_scores"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guardian_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("guardian_circles.guardian_id"), unique=True)
    cusum_score: Mapped[float] = mapped_column(Float, default=0.0)
    engagement_trend: Mapped[EngagementTrend] = mapped_column(Enum(EngagementTrend), default=EngagementTrend.stable)
    predicted_churn_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reengagement_attempted: Mapped[bool] = mapped_column(Boolean, default=False)
    reengagement_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Create `/backend/models/sentinel.py`:
```python
class ActivityLevel(enum.Enum):
    normal = "normal"
    reduced = "reduced"
    very_low = "very_low"

class ConcernLevel(enum.Enum):
    none = "none"
    mild = "mild"
    high = "high"

class CaregiverCheckin(Base):
    __tablename__ = "caregiver_checkins"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"))
    checkin_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    channel: Mapped[str] = mapped_column(String(20), default="telegram")
    raw_response: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    language_detected: Mapped[str] = mapped_column(String(10), default="en")
    symptom_score: Mapped[float] = mapped_column(Float, default=0.0)
    fatigue_reported: Mapped[bool] = mapped_column(Boolean, default=False)
    appetite_normal: Mapped[bool] = mapped_column(Boolean, default=True)
    activity_level: Mapped[ActivityLevel] = mapped_column(Enum(ActivityLevel), default=ActivityLevel.normal)
    caregiver_concern_level: Mapped[ConcernLevel] = mapped_column(Enum(ConcernLevel), default=ConcernLevel.none)
    sarvam_transcript: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class SentinelAlert(Base):
    __tablename__ = "sentinel_alerts"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"))
    alert_type: Mapped[str] = mapped_column(String(50))
    triggering_checkin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("caregiver_checkins.id"))
    hb_at_trigger: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    predicted_hb_at_trigger: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    symptom_score_at_trigger: Mapped[float] = mapped_column(Float)
    recommended_action: Mapped[str] = mapped_column(String(500))
    coordinator_notified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

Run migrations:
```bash
alembic upgrade head
```

### 2.3 Phase 2 Completion Checkpoint

```bash
# Verify all new tables exist
python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text, inspect

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text(\"\"\"
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        \"\"\"))
        for row in result:
            print(row[0])

asyncio.run(check())
"
```

**STOP. Print Phase 2 summary and Phase 3 plan. Wait for user approval.**

---

## PHASE 3: Living Circle — Churn Detection System

### 3.1 Engagement CUSUM Algorithm

Create `/backend/ml/noor_engine/donor_churn_detector.py`:

```python
"""
Donor Engagement CUSUM Anomaly Detector.
Mirrors the alloimmunization CUSUM logic but applied to donor response latency.

Mathematical formulation:
  μ = mean response latency over first 3 cycles (baseline)
  K = 0.5 * sigma (reference value / slack)
  S_t = max(0, S_{t-1} + (X_t - μ) - K)
  Alert when S_t > H (threshold = 24 hours)

We track INCREASING latency (donor becoming less responsive).
"""

from dataclasses import dataclass
from typing import Optional
import statistics

CUSUM_K = 12.0   # slack: 12 hours
CUSUM_H = 0.4    # alert threshold (normalized)
MIN_CYCLES = 3   # minimum cycles before CUSUM is meaningful
BASELINE_CYCLES = 3  # cycles used to establish baseline

@dataclass
class EngagementSignal:
    cycle_number: int
    response_latency_hours: Optional[float]  # None = no response (treated as 72h)
    response_type: str  # confirmed / declined / no_response

@dataclass
class ChurnDetectionResult:
    cusum_score: float
    engagement_trend: str  # stable / declining / critical
    predicted_churn_in_cycles: Optional[int]
    alert: bool
    baseline_latency_hours: float

def detect_donor_churn(signals: list[EngagementSignal]) -> ChurnDetectionResult:
    """
    Run CUSUM anomaly detection on a donor's engagement history.
    
    Args:
        signals: List of engagement signals ordered by cycle_number ascending.
    
    Returns:
        ChurnDetectionResult with current CUSUM score and trend classification.
    """
    if len(signals) < MIN_CYCLES:
        return ChurnDetectionResult(
            cusum_score=0.0,
            engagement_trend="stable",
            predicted_churn_in_cycles=None,
            alert=False,
            baseline_latency_hours=0.0
        )
    
    # Normalize: no_response → 72 hours (our maximum wait time)
    latencies = [
        s.response_latency_hours if s.response_latency_hours is not None else 72.0
        for s in signals
    ]
    
    # Establish baseline from first BASELINE_CYCLES
    baseline_values = latencies[:BASELINE_CYCLES]
    mu = statistics.mean(baseline_values)
    sigma = statistics.stdev(baseline_values) if len(baseline_values) > 1 else 6.0
    
    # Normalize CUSUM parameters
    k = CUSUM_K / max(sigma, 1.0)
    h = CUSUM_H
    
    # Run CUSUM from cycle 4 onwards
    S = 0.0
    cusum_history = []
    for i, latency in enumerate(latencies[BASELINE_CYCLES:], start=BASELINE_CYCLES):
        normalized = (latency - mu) / max(sigma, 1.0)
        S = max(0, S + normalized - k)
        cusum_history.append(S)
    
    current_score = cusum_history[-1] if cusum_history else 0.0
    alert = current_score > h
    
    # Classify trend
    if current_score <= h * 0.4:
        trend = "stable"
    elif current_score <= h:
        trend = "declining"
    else:
        trend = "critical"
    
    # Predict cycles until churn (simple linear extrapolation)
    predicted_churn = None
    if len(cusum_history) >= 2 and cusum_history[-1] > cusum_history[-2]:
        rate = cusum_history[-1] - cusum_history[-2]
        if rate > 0:
            cycles_remaining = (h - current_score) / rate
            predicted_churn = max(0, int(cycles_remaining))
    
    return ChurnDetectionResult(
        cusum_score=round(current_score, 4),
        engagement_trend=trend,
        predicted_churn_in_cycles=predicted_churn,
        alert=alert,
        baseline_latency_hours=round(mu, 1)
    )
```

### 3.2 Churn Monitor Background Worker

Add to `/backend/workers/scheduler.py`:

```python
# Add to existing APScheduler setup
scheduler.add_job(
    run_donor_churn_monitor,
    trigger='interval',
    hours=6,
    id='donor_churn_monitor',
    replace_existing=True,
    max_instances=1,
)
```

Create `/backend/workers/donor_churn_worker.py`:

```python
async def run_donor_churn_monitor():
    """
    For every active guardian:
    1. Load their last 8 engagement signals
    2. Run CUSUM detection
    3. Update donor_churn_scores
    4. If critical: trigger reengagement message
    5. If critical and reengagement failed: initiate circle repair
    """
    async with AsyncSessionLocal() as db:
        guardians = await get_all_active_guardians(db)
        
        for guardian in guardians:
            signals = await get_guardian_engagement_signals(guardian.id, db, limit=8)
            if not signals:
                continue
            
            result = detect_donor_churn([
                EngagementSignal(
                    cycle_number=s.cycle_number,
                    response_latency_hours=s.response_latency_hours,
                    response_type=s.response_type.value
                ) for s in signals
            ])
            
            # Upsert churn score
            await upsert_churn_score(guardian.id, result, db)
            
            if result.alert and result.engagement_trend == "critical":
                churn_score = await get_churn_score(guardian.id, db)
                if not churn_score.reengagement_attempted:
                    patient = await get_patient_for_guardian(guardian.id, db)
                    message = await generate_reengagement_message(
                        guardian_name=guardian.name,
                        patient_name=patient.name,
                        last_donation_date=str(guardian.last_donation_date),
                        donation_count=guardian.donation_count,
                        language=guardian.preferred_language or "en"
                    )
                    await send_telegram_message(guardian.telegram_chat_id, message)
                    await mark_reengagement_sent(guardian.id, db)
                    
                    logger.info("reengagement_sent",
                        guardian_id=str(guardian.id),
                        cusum_score=result.cusum_score,
                        patient_id=str(patient.id)
                    )
                    await publish_health_metric("DonorReengagementSent", 1.0)
```

### 3.3 New API Endpoints

Add to `/backend/api/routers/guardians.py`:

```python
@router.get("/{guardian_id}/churn-score", response_model=ApiResponse[DonorChurnScoreSchema])
async def get_churn_score(
    guardian_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user = Depends(get_current_user)
):
    score = await guardian_service.get_churn_score(guardian_id, db)
    if not score:
        raise HTTPException(404, "No churn score found for guardian")
    return ApiResponse(success=True, data=DonorChurnScoreSchema.from_orm(score))


@router.post("/{guardian_id}/reengage", response_model=ApiResponse[dict])
async def trigger_reengagement(
    guardian_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user = Depends(get_current_user)
):
    guardian = await guardian_service.get_guardian(guardian_id, db)
    patient = await guardian_service.get_patient_for_guardian(guardian_id, db)
    
    message = await generate_reengagement_message(
        guardian_name=guardian.name,
        patient_name=patient.name,
        last_donation_date=str(guardian.last_donation_date),
        donation_count=guardian.donation_count,
        language=guardian.preferred_language or "en"
    )
    await send_telegram_message(guardian.telegram_chat_id, message)
    await mark_reengagement_sent(guardian_id, db)
    await publish_health_metric("ManualReengagementSent", 1.0)
    
    return ApiResponse(success=True, data={"message_sent": True, "preview": message[:100]})
```

### 3.4 Phase 3 Completion Checkpoint

```bash
# Test churn detector
python -c "
from ml.noor_engine.donor_churn_detector import detect_donor_churn, EngagementSignal
signals = [
    EngagementSignal(1, 2.0, 'confirmed'),
    EngagementSignal(2, 3.0, 'confirmed'),
    EngagementSignal(3, 2.5, 'confirmed'),
    EngagementSignal(4, 12.0, 'confirmed'),
    EngagementSignal(5, 24.0, 'declined'),
    EngagementSignal(6, None, 'no_response'),
]
result = detect_donor_churn(signals)
print(result)
assert result.engagement_trend in ['declining', 'critical']
print('PASS: Churn detection working')
"

# Test API
curl -H "Auth..." http://localhost:8000/api/v1/guardians/GUARDIAN_ID/churn-score
```

**STOP. Print Phase 3 summary and Phase 4 plan. Wait for user approval.**

---

## PHASE 4: Sentinel — Caregiver Check-In System

### 4.1 Sentinel Signal Fusion Algorithm

Create `/backend/ml/noor_engine/sentinel_engine.py`:

```python
"""
Sentinel Score computation — fuses caregiver behavioral signals with Hb trend data.

SentinelScore(patient) =
  0.40 × NormalizedSymptomScore(last_3_checkins)
  + 0.35 × HbDecayDeviation(predicted_vs_current_slope)
  + 0.25 × CaregiverConcernTrend(last_3_checkins)

Threshold: > 65 → EarlyWarning alert
"""

from dataclasses import dataclass
from typing import Optional
from datetime import date

ACTIVITY_SCORES = {"normal": 0.0, "reduced": 0.5, "very_low": 1.0}
CONCERN_SCORES = {"none": 0.0, "mild": 0.4, "high": 1.0}
SENTINEL_ALERT_THRESHOLD = 65.0

@dataclass
class CheckinData:
    symptom_score: float
    activity_level: str
    caregiver_concern_level: str
    fatigue_reported: bool
    appetite_normal: bool

@dataclass
class HbTrendData:
    current_hb: float
    predicted_hb: float  # what NOOR forecasted for today
    days_to_transfusion: int

@dataclass
class SentinelResult:
    sentinel_score: float           # 0-100
    alert_active: bool
    component_symptom: float        # 0-100
    component_hb_deviation: float   # 0-100
    component_concern: float        # 0-100
    recommended_action: Optional[str]
    days_to_bump: int               # how many days to advance mobilization

def compute_sentinel_score(
    checkins: list[CheckinData],  # most recent first, max 3
    hb_trend: Optional[HbTrendData],
) -> SentinelResult:
    
    if not checkins:
        return SentinelResult(0.0, False, 0.0, 0.0, 0.0, None, 0)
    
    recent = checkins[:3]
    
    # Component 1: Symptom Score (0-100)
    symptom_scores = []
    for c in recent:
        s = c.symptom_score * 40
        s += ACTIVITY_SCORES.get(c.activity_level, 0) * 30
        s += (0 if c.appetite_normal else 20)
        s += (10 if c.fatigue_reported else 0)
        symptom_scores.append(min(s, 100))
    
    # Weight recent more heavily: [0.6, 0.3, 0.1]
    weights = [0.6, 0.3, 0.1][:len(recent)]
    component_symptom = sum(s * w for s, w in zip(symptom_scores, weights)) / sum(weights)
    
    # Component 2: Hb Deviation (0-100)
    component_hb = 0.0
    if hb_trend and hb_trend.predicted_hb > 0:
        deviation_pct = abs(hb_trend.current_hb - hb_trend.predicted_hb) / hb_trend.predicted_hb
        # Normalize: 0% deviation = 0, 30%+ deviation = 100
        component_hb = min(deviation_pct / 0.30 * 100, 100)
    
    # Component 3: Caregiver Concern Trend (0-100)
    concern_scores = [CONCERN_SCORES.get(c.caregiver_concern_level, 0) * 100 for c in recent]
    component_concern = sum(concern_scores) / len(concern_scores)
    
    # Final score
    sentinel_score = (
        0.40 * component_symptom +
        0.35 * component_hb +
        0.25 * component_concern
    )
    
    alert_active = sentinel_score > SENTINEL_ALERT_THRESHOLD
    
    # Determine recommended action
    recommended_action = None
    days_to_bump = 0
    if alert_active:
        if sentinel_score > 85:
            recommended_action = "Consider emergency pre-transfusion assessment. Contact patient's hematologist."
            days_to_bump = min(hb_trend.days_to_transfusion - 2, 7) if hb_trend else 5
        else:
            recommended_action = "Advance guardian mobilization by 3-5 days. Monitor closely."
            days_to_bump = 3
    
    return SentinelResult(
        sentinel_score=round(sentinel_score, 1),
        alert_active=alert_active,
        component_symptom=round(component_symptom, 1),
        component_hb_deviation=round(component_hb, 1),
        component_concern=round(component_concern, 1),
        recommended_action=recommended_action,
        days_to_bump=days_to_bump
    )
```

### 4.2 Sentinel Router

Create `/backend/api/routers/sentinel.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from api.dependencies import get_db, get_current_user
from services.sentinel_service import process_checkin, get_sentinel_status
from core.response import ApiResponse

router = APIRouter(prefix="/api/v1/sentinel", tags=["sentinel"])

@router.post("/{patient_id}/checkin", response_model=ApiResponse[SentinelStatusSchema])
async def submit_checkin(
    patient_id: UUID,
    checkin: CaregiverCheckinCreate,
    db: AsyncSession = Depends(get_db),
    _user = Depends(get_current_user)
):
    """Process a caregiver check-in and recompute sentinel score."""
    result = await process_checkin(patient_id, checkin, db)
    await publish_health_metric("SentinelCheckinProcessed", 1.0)
    if result.alert_active:
        await publish_health_metric("SentinelAlertFired", 1.0)
    return ApiResponse(success=True, data=SentinelStatusSchema.from_orm(result))


@router.get("/{patient_id}", response_model=ApiResponse[SentinelStatusSchema])
async def get_patient_sentinel(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user = Depends(get_current_user)
):
    status = await get_sentinel_status(patient_id, db)
    return ApiResponse(success=True, data=status)


@router.post("/voice", response_model=ApiResponse[dict])
async def process_voice_checkin(
    patient_id: UUID,
    audio_file: bytes = Body(...),
    language_hint: str = "hi",
    db: AsyncSession = Depends(get_db),
):
    """Process a Telegram voice note as a caregiver check-in."""
    transcript_data = await sarvam_service.transcribe_voice_note(audio_file, language_hint)
    checkin_data = await parse_voice_to_checkin(transcript_data["transcript"])
    result = await process_checkin(patient_id, checkin_data, db)
    return ApiResponse(success=True, data={
        "transcript": transcript_data["transcript"],
        "sentinel_score": result.sentinel_score,
        "alert_active": result.alert_active
    })
```

Register in `main.py`: `app.include_router(sentinel_router)`

### 4.3 Phase 4 Completion Checkpoint

```bash
# Test sentinel algorithm
python -c "
from ml.noor_engine.sentinel_engine import compute_sentinel_score, CheckinData, HbTrendData
checkins = [
    CheckinData(0.8, 'very_low', 'high', True, False),
    CheckinData(0.5, 'reduced', 'mild', True, True),
    CheckinData(0.2, 'normal', 'none', False, True),
]
hb = HbTrendData(current_hb=6.5, predicted_hb=7.8, days_to_transfusion=12)
result = compute_sentinel_score(checkins, hb)
print(result)
assert result.alert_active, 'Should alert for this pattern'
print('PASS: Sentinel score correct')
"
```

**STOP. Print Phase 4 summary and Phase 5 plan. Wait for user approval.**

---

## PHASE 5: Donor Fatigue + Grief Protocol + Blood Weather + Compatibility Graph

### 5.1 Donor Fatigue Service

Add to `/backend/services/guardian_service.py`:

```python
from datetime import date, timedelta
from typing import Optional

WHOLE_BLOOD_MIN_DAYS = 56      # WHO: 56 days between whole blood donations
PLATELET_MIN_DAYS = 7          # 7 days for platelet donations
DEFAULT_ANNUAL_CEILING = 6     # max 6 whole blood donations per year

async def check_donor_fatigue(
    guardian_id: UUID,
    db: AsyncSession
) -> dict:
    """
    Checks if a donor is safe to donate.
    Returns eligibility + reason.
    """
    guardian = await get_guardian_circle_entry(guardian_id, db)
    if not guardian:
        raise ValueError(f"Guardian {guardian_id} not found")
    
    today = date.today()
    
    # Check rest cycle
    if guardian.fatigue_rest_until and guardian.fatigue_rest_until > today:
        days_remaining = (guardian.fatigue_rest_until - today).days
        return {
            "is_eligible": False,
            "reason": f"rest_cycle",
            "days_remaining": days_remaining,
            "fatigue_rest_until": guardian.fatigue_rest_until.isoformat()
        }
    
    # Check minimum gap since last donation
    if guardian.last_donation_date:
        days_since = (today - guardian.last_donation_date).days
        if days_since < WHOLE_BLOOD_MIN_DAYS:
            return {
                "is_eligible": False,
                "reason": "minimum_gap",
                "days_remaining": WHOLE_BLOOD_MIN_DAYS - days_since,
            }
    
    # Check annual ceiling
    ceiling = guardian.fatigue_ceiling or DEFAULT_ANNUAL_CEILING
    if guardian.annual_donation_count >= ceiling:
        rest_until = date(today.year + 1, 1, 1)
        await set_guardian_rest_until(guardian_id, rest_until, db)
        return {
            "is_eligible": False,
            "reason": "annual_ceiling_reached",
            "fatigue_rest_until": rest_until.isoformat(),
            "donations_this_year": guardian.annual_donation_count
        }
    
    return {
        "is_eligible": True,
        "reason": "eligible",
        "donations_remaining": ceiling - guardian.annual_donation_count,
        "annual_donation_count": guardian.annual_donation_count,
        "fatigue_ceiling": ceiling,
    }
```

Integrate into mobilization trigger: before sending any mobilization message, call `check_donor_fatigue`. If not eligible, skip this guardian and log `FATIGUE_SKIP` alert.

### 5.2 Grief Protocol Service

Create `/backend/services/grief_service.py`:

```python
from datetime import datetime, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from services.bedrock_service import generate_memorial_message
from services.telegram_service import send_telegram_message

async def trigger_grief_protocol(patient_id: UUID, db: AsyncSession):
    """
    Called when patient.status is set to 'deceased'.
    Sends personalized memorial messages to all active guardians.
    Schedules transition offer for 72 hours later via EventBridge.
    """
    patient = await get_patient(patient_id, db)
    guardians = await get_patient_guardians_with_donations(patient_id, db)
    
    if not guardians:
        logger.warning("grief_protocol_no_guardians", patient_id=str(patient_id))
        return
    
    logger.info("grief_protocol_initiated",
        patient_id=str(patient_id),
        guardian_count=len(guardians)
    )
    
    for guardian in guardians:
        stats = await get_guardian_donation_stats(guardian.id, patient_id, db)
        total_days = (stats.last_donation_date - stats.first_donation_date).days if stats else 0
        
        message = await generate_memorial_message(
            guardian_name=guardian.name,
            patient_name=patient.name,
            total_donations=stats.total_donations if stats else guardian.donation_count,
            total_days_supported=total_days,
            language=guardian.preferred_language or "en"
        )
        
        # Send via Telegram
        await send_telegram_message(guardian.telegram_chat_id, message)
        
        # Save memorial record
        await save_memorial_record(
            patient_id=patient_id,
            guardian_id=guardian.id,
            total_donations=stats.total_donations if stats else 0,
            total_days_supported=total_days,
            message_text=message,
            db=db
        )
        
        logger.info("memorial_message_sent",
            guardian_id=str(guardian.id),
            message_length=len(message)
        )
    
    # Schedule transition offer via EventBridge (72 hours later)
    await schedule_transition_offer_eventbridge(patient_id, delay_hours=72)
    await publish_health_metric("GriefProtocolInitiated", 1.0)
```

Add to patients router:
```python
@router.post("/{patient_id}/status")
async def update_patient_status(
    patient_id: UUID,
    body: PatientStatusUpdate,  # {status: PatientStatus}
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    await patient_service.update_status(patient_id, body.status, db)
    
    if body.status == PatientStatus.deceased:
        # Fire and don't wait — grief protocol runs in background
        asyncio.create_task(grief_service.trigger_grief_protocol(patient_id, db))
    
    return ApiResponse(success=True, data={"status": body.status})
```

### 5.3 Blood Weather Forecast Service

Create `/backend/services/weather_service.py`:

```python
from datetime import date, timedelta
from dataclasses import dataclass
from typing import Optional

ALL_BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
AVG_UNITS_PER_TRANSFUSION = 2

def classify_gap_severity(gap: int, demand: int) -> str:
    if gap <= 0:
        surplus_pct = abs(gap) / max(demand, 1)
        return "surplus" if surplus_pct > 0.3 else "balanced"
    shortage_pct = gap / max(demand, 1)
    return "critical" if shortage_pct > 0.5 else "shortage"

async def generate_blood_weather(city_code: str, db: AsyncSession) -> list:
    """
    Aggregate patient forecasts → 4-week supply/demand projection per blood type.
    """
    patients = await get_city_patients(city_code, db)
    inventory_snapshot = await get_city_inventory_by_type(city_code, db)
    
    results = []
    for week_offset in range(4):
        week_start = date.today() + timedelta(weeks=week_offset)
        week_end = week_start + timedelta(days=7)
        
        for blood_type in ALL_BLOOD_TYPES:
            patients_needing = [
                p for p in patients
                if f"{p.blood_type}{p.rh_factor}" == blood_type
                and p.next_transfusion_predicted
                and week_start <= p.next_transfusion_predicted.date() <= week_end
            ]
            demand = len(patients_needing) * AVG_UNITS_PER_TRANSFUSION
            supply = inventory_snapshot.get(blood_type, 0)
            gap = demand - supply
            severity = classify_gap_severity(gap, demand)
            
            results.append({
                "city_code": city_code,
                "forecast_week_start": week_start.isoformat(),
                "blood_type": blood_type,
                "predicted_demand_units": demand,
                "current_supply_units": supply,
                "gap_units": gap,
                "gap_severity": severity,
            })
    
    # Persist to database
    await save_weather_forecasts(results, db)
    return results
```

Add EventBridge rule to run `generate_blood_weather` every Monday at 6 AM IST (00:30 UTC):
```python
# In Lambda handler for scheduled blood weather generation
async def lambda_handler(event, context):
    async with AsyncSessionLocal() as db:
        result = await generate_blood_weather("HYD", db)
    return {"forecasts_generated": len(result)}
```

### 5.4 Compatibility Graph Builder (DynamoDB Lambda)

Create `/backend/lambda/compatibility_graph_builder/handler.py`:

```python
import boto3
import asyncio
from decimal import Decimal
import math

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
table = dynamodb.Table('DonorCompatibilityEdges')

BLOOD_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],  # universal donor
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
}

def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def compute_compatibility_score(donor, patient) -> float:
    donor_type = f"{donor['blood_type']}{donor['rh_factor']}"
    patient_type = f"{patient['blood_type']}{patient['rh_factor']}"
    
    compatible_recipients = BLOOD_COMPATIBILITY.get(donor_type, [])
    if patient_type not in compatible_recipients:
        return 0.0
    
    score = 60.0  # base compatibility
    
    # Extended phenotype bonus
    phenotype_match = True
    if patient.get('kell_negative') and not donor.get('kell_negative'):
        phenotype_match = False
    if patient.get('duffy_negative') and not donor.get('duffy_negative'):
        phenotype_match = False
    if patient.get('kidd_negative') and not donor.get('kidd_negative'):
        phenotype_match = False
    
    if phenotype_match:
        score += 30.0
    
    # Exact type match bonus
    if donor_type == patient_type:
        score += 10.0
    
    return min(score, 100.0)

def lambda_handler(event, context):
    # Fetch all donors and patients from RDS (via direct connection or API call)
    donors = fetch_all_donors()
    patients = fetch_all_patients()
    
    with table.batch_writer() as batch:
        for donor in donors:
            for patient in patients:
                score = compute_compatibility_score(donor, patient)
                if score <= 0:
                    continue
                
                distance = haversine(
                    donor.get('lat', 17.38), donor.get('lng', 78.49),
                    patient.get('hospital_lat', 17.38), patient.get('hospital_lng', 78.49)
                )
                
                batch.put_item(Item={
                    'donor_id': donor['id'],
                    'patient_id': patient['id'],
                    'compatibility_score': Decimal(str(round(score, 2))),
                    'blood_type': f"{donor['blood_type']}{donor['rh_factor']}",
                    'city_code': donor.get('city_code', 'HYD'),
                    'distance_km': Decimal(str(round(distance, 2))),
                    'blood_type_match': True,
                    'extended_phenotype_match': score >= 90,
                    'last_updated': datetime.utcnow().isoformat(),
                })
    
    return {"edges_written": len(donors) * len(patients)}
```

Deploy this Lambda with EventBridge trigger (daily at 2 AM IST = 20:30 UTC previous day):
```bash
aws lambda create-function \
  --function-name raktasetu-compatibility-graph-builder \
  --runtime python3.11 \
  --handler handler.lambda_handler \
  --role arn:aws:iam::ACCOUNT:role/raktasetu-lambda-role \
  --zip-file fileb://lambda/compatibility_graph_builder.zip \
  --timeout 300 \
  --region ap-south-1
```

### 5.5 Phase 5 Completion Checkpoint

```bash
# Test blood weather
curl -H "Auth..." http://localhost:8000/api/v1/weather/HYD
# Should return 32 records (8 blood types × 4 weeks)

# Test grief protocol (use inactive patient for safety)
curl -X POST -H "Auth..." -H "Content-Type: application/json" \
  -d '{"status": "inactive"}' \
  http://localhost:8000/api/v1/patients/VIKRAM_ID/status

# Test fatigue check
curl -H "Auth..." http://localhost:8000/api/v1/guardians/GUARDIAN_ID/fatigue-status
```

**STOP. Print Phase 5 summary and Phase 6 plan. Wait for user approval.**

---

## PHASE 6: Transfusion Shadow Protocol + Demo Polish

### 6.1 Transfusion Shadow Scheduler

This implements Idea 2's pre-emptive circle warming. Add new background jobs:

```python
# workers/scheduler.py — add these jobs
scheduler.add_job(
    run_transfusion_shadow_protocol,
    trigger='cron', hour=9, minute=0,  # 9 AM daily IST
    id='transfusion_shadow', replace_existing=True
)

async def run_transfusion_shadow_protocol():
    """
    For each patient:
    - T-45: Send "life update" to guardian circle (no ask)
    - T-30: Send "preparation nudge"  
    - T+7 after transfusion: Send "your blood saved her" impact message
    """
    async with AsyncSessionLocal() as db:
        patients = await get_all_active_patients(db)
        today = date.today()
        
        for patient in patients:
            if not patient.next_transfusion_predicted:
                continue
            
            pred_date = patient.next_transfusion_predicted.date()
            days_to_transfusion = (pred_date - today).days
            
            if days_to_transfusion == 45:
                await send_life_update_to_circle(patient, db)
            elif days_to_transfusion == 30:
                await send_preparation_nudge_to_circle(patient, db)
            
            # Check for post-transfusion impact messages
            # If last transfusion was 7 days ago, send impact message
            last_transfusion = await get_last_transfusion(patient.id, db)
            if last_transfusion:
                days_since = (today - last_transfusion.reading_date).days
                if days_since == 7:
                    await send_impact_message_to_donors(patient, last_transfusion, db)
```

### 6.2 Update Demo Seed Data

Update `/backend/db/seed_demo_data.py` to include:
- Priya: 14-month Hb history (unchanged)
- One guardian with `engagement_trend: 'declining'` (CUSUM score 0.38)
- One guardian with `annual_donation_count >= fatigue_ceiling`
- One guardian with `fatigue_rest_until` in the future
- 3 caregiver check-ins for Priya (most recent: activity_level = 'reduced')
- Blood weather with at least one `critical` cell for B+ in Week 3
- Vikram: `status = 'active'` (switch to inactive during demo)
- Apollo bank: 2 Kell-negative B+ units expiring in 6 days

### 6.3 Final CloudWatch Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name RaktaSetu-NOOR \
  --dashboard-body '{
    "widgets": [
      {"type": "metric", "properties": {"title": "Forecasts Generated", "metrics": [["RaktaSetu/NOOR", "ForecastGenerated"]]}},
      {"type": "metric", "properties": {"title": "Sentinel Alerts", "metrics": [["RaktaSetu/NOOR", "SentinelAlertFired"]]}},
      {"type": "metric", "properties": {"title": "Donor Reengagements", "metrics": [["RaktaSetu/NOOR", "DonorReengagementSent"]]}},
      {"type": "metric", "properties": {"title": "Grid Matches Created", "metrics": [["RaktaSetu/NOOR", "GridMatchCreated"]]}},
      {"type": "metric", "properties": {"title": "API Latency P95", "metrics": [["RaktaSetu/NOOR", "APILatencyMs", {"stat": "p95"}]]}}
    ]
  }' \
  --region ap-south-1
```

### 6.4 Requirements.txt — Final

```txt
# Existing (unchanged)
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
aiosqlite==0.20.0
alembic==1.13.1
pydantic==2.7.1
prophet==1.1.5
ortools==9.10.4067
redis[hiredis]==5.0.6
apscheduler==3.10.4
structlog==24.2.0
httpx==0.27.1
python-telegram-bot==21.3
python-multipart==0.0.9
python-jose[cryptography]==3.3.0

# New AWS
boto3==1.34.130
botocore==1.34.130

# New Sarvam (no dedicated SDK — using httpx directly, already included)
# (Sarvam is accessed via REST API with httpx)
```

### 6.5 Phase 6 Completion Checkpoint — Full System Verification

```bash
# 1. Health check
curl https://YOUR_APP_RUNNER_URL/health
# Expected: all systems green

# 2. Full API smoke test
./scripts/smoke_test.sh  # script that hits every endpoint

# 3. CloudWatch dashboard shows data
aws cloudwatch get-metric-statistics \
  --namespace RaktaSetu/NOOR \
  --metric-name ForecastGenerated \
  --period 86400 --statistics Sum \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --region ap-south-1

# 4. Demo narrative test — simulate full 10-minute demo programmatically
python scripts/demo_dry_run.py
```

**Person 2's work is complete when all Phase 6 checks pass.**

---

## Appendix A: File Tree (New Files Only)

```
backend/
├── api/routers/
│   ├── sentinel.py                         ← NEW
│   └── weather.py                          ← NEW
├── ml/noor_engine/
│   ├── donor_churn_detector.py             ← NEW
│   └── sentinel_engine.py                  ← NEW
├── models/
│   ├── engagement.py                       ← NEW
│   ├── sentinel.py                         ← NEW
│   ├── memorial.py                         ← NEW
│   └── weather.py                          ← NEW
├── services/
│   ├── bedrock_service.py                  ← NEW (replaces Gemini)
│   ├── sarvam_service.py                   ← NEW (replaces Google Cloud Speech)
│   ├── grief_service.py                    ← NEW
│   ├── sentinel_service.py                 ← NEW
│   ├── weather_service.py                  ← NEW
│   └── compatibility_graph_service.py      ← NEW (DynamoDB interface)
├── workers/
│   └── donor_churn_worker.py               ← NEW
├── lambda/
│   └── compatibility_graph_builder/
│       └── handler.py                      ← NEW (deployed separately)
├── core/
│   └── auth.py                             ← MODIFIED (Supabase → Cognito)
└── apprunner.yaml                          ← NEW
```

---

## Appendix B: Non-Negotiable Rules

1. Every database operation must be async. No `sync` SQLAlchemy sessions in API routes.
2. Every ML function must have a fallback. Prophet fails → linear decay. Sarvam fails → Transcribe. Bedrock fails → logged error + graceful 500.
3. Every background worker catches all exceptions and logs them. Workers must NEVER crash the entire scheduler.
4. All secrets are read from `os.environ` — never hardcoded. In production, use AWS Secrets Manager.
5. All Pydantic models have explicit field types. No `Optional` without a `None` default.
6. Every new API endpoint has a corresponding Pydantic response schema registered in the OpenAPI docs.
7. Alembic migrations must have both `upgrade()` and `downgrade()` implemented.
8. The `/health` endpoint must reflect the actual state of every connected service.
9. CloudWatch metrics must be published for every significant business event.
10. CUSUM and OR-Tools are mathematical implementations — do NOT simplify them. The math must be correct.
