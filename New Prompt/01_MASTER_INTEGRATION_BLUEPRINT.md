# RaktaSetu NOOR — Master Integration Blueprint v2.0
## Integrating 6 New Innovations into the Existing Architecture
### Single Source of Truth for Both Developers

> This document must be read before any code is written. It describes how the 6 new ideas integrate into the existing system without breaking anything. All existing features remain untouched. Everything new is additive.

---

## 1. What Already Exists (Locked — Do Not Break)

The following systems are complete and must remain working throughout all new development:

| System | Status | Owner |
|--------|--------|-------|
| NOOR Engine (Prophet Hb forecasting) | ✅ Complete | Person 2 |
| NOOR Engine (CUSUM alloimmunization detection) | ✅ Complete | Person 2 |
| NOOR Engine (Iron overload detector) | ✅ Complete | Person 2 |
| RaktaMitra (Guardian Circle scoring) | ✅ Complete | Person 2 |
| RaktaMitra (Mobilization state machine) | ✅ Complete | Person 2 |
| RaktaMitra (Telegram webhook + intent parser) | ✅ Complete | Person 2 |
| RaktaGrid (OR-Tools CP-SAT inventory optimizer) | ✅ Complete | Person 2 |
| RaktaGrid (OSM blood bank discovery) | ✅ Complete | Person 2 |
| RaktaGrid (WhatsApp stock parser) | ✅ Complete | Person 2 |
| FastAPI backend (all existing routers) | ✅ Complete | Person 2 |
| Next.js 14 frontend (NOOR dashboard) | ✅ Complete | Person 1 |
| Next.js 14 frontend (Guardian Constellation) | ✅ Complete | Person 1 |
| Next.js 14 frontend (RaktaGrid city map) | ✅ Complete | Person 1 |
| APScheduler background workers | ✅ Complete | Person 2 |
| PostgreSQL schema + Alembic migrations | ✅ Complete | Person 2 |
| Redis caching layer | ✅ Complete | Person 2 |
| Supabase JWT auth + RLS | ✅ Complete | Person 2 |
| GitHub Actions CI/CD | ✅ Complete | Both |

---

## 2. The AWS Migration (Critical Gap to Fix First)

Before any new features, the infrastructure must be migrated to AWS to satisfy the judging criteria. This is a deployment and configuration change — it does NOT change any business logic.

### 2.1 Target AWS Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AWS Cloud (ap-south-1)                        │
│                                                                       │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │  S3 +        │    │   App Runner     │    │   Amazon RDS     │   │
│  │  CloudFront  │    │   (FastAPI)      │    │   (PostgreSQL)   │   │
│  │  (Frontend   │───▶│                  │───▶│                  │   │
│  │   Static)    │    │   OR             │    │   + ElastiCache  │   │
│  │              │    │   Fargate (ECS)  │    │   (Redis)        │   │
│  └──────────────┘    └────────┬─────────┘    └──────────────────┘   │
│                               │                                       │
│         ┌─────────────────────┼─────────────────────┐                │
│         ▼                     ▼                     ▼                │
│  ┌─────────────┐   ┌──────────────────┐   ┌───────────────────┐     │
│  │  Amazon     │   │  AWS Lambda      │   │  Amazon Bedrock   │     │
│  │  EventBridge│──▶│  (Orchestration) │   │  (Claude Sonnet)  │     │
│  │             │   │                  │   │                   │     │
│  └─────────────┘   └──────────────────┘   └───────────────────┘     │
│                                                                       │
│  ┌─────────────┐   ┌──────────────────┐   ┌───────────────────┐     │
│  │  Amazon     │   │  AWS SageMaker   │   │  Amazon DynamoDB  │     │
│  │  SQS/SNS    │   │  (Donor Feature  │   │  (Behavioral      │     │
│  │             │   │   Store)         │   │   Fingerprints)   │     │
│  └─────────────┘   └──────────────────┘   └───────────────────┘     │
│                                                                       │
│  ┌─────────────┐   ┌──────────────────┐   ┌───────────────────┐     │
│  │  CloudWatch │   │  AWS Cognito     │   │  Secrets Manager  │     │
│  │  (Monitoring│   │  (Auth)          │   │  (API Keys)       │     │
│  │   + Alerts) │   │                  │   │                   │     │
│  └─────────────┘   └──────────────────┘   └───────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Replacement Map

| Previous | AWS Replacement | Migration Effort |
|----------|-----------------|------------------|
| Railway (backend) | AWS App Runner | Low — Docker image stays the same |
| Vercel (frontend) | S3 + CloudFront | Low — static export |
| Supabase PostgreSQL | Amazon RDS PostgreSQL (ap-south-1) | Medium — connection string change + Alembic |
| Upstash Redis | Amazon ElastiCache (Redis) | Low — connection string change |
| Supabase Auth | AWS Cognito | Medium — JWT validation change |
| APScheduler crons | Amazon EventBridge + Lambda | Medium — logic moves to Lambda handlers |
| Google Gemini | Amazon Bedrock (Claude Sonnet 3.5) | Medium — SDK swap |
| Google Cloud Speech | Amazon Transcribe | Low — SDK swap |
| Google TTS | Amazon Polly + Sarvam AI (Indian langs) | Low |
| No monitoring | Amazon CloudWatch | Low — add boto3 metric publishing |
| No secrets management | AWS Secrets Manager | Low — change env var reads |

### 2.3 What Does NOT Change

- All FastAPI route logic
- All ML algorithms (Prophet, CUSUM, OR-Tools)
- All database schema and migrations (PostgreSQL stays PostgreSQL)
- All frontend component logic
- All API contracts (TypeScript types, JSON schema)
- Telegram Bot integration (stays as-is)
- Sarvam AI (added for Indian language voice)

---

## 3. Six New Innovations — Integration Design

### 3.1 Idea 3: The Living Circle — Self-Healing Guardian Network with Churn Prediction

**What it adds:** Donor engagement CUSUM monitoring + automated circle repair + LLM-powered re-engagement.

**Integration point:** Extends `guardian_service.py` and `alloimmunization.py` (reuses the same CUSUM math). New background worker. New API endpoint. New frontend widget.

**New database tables:**
```sql
donor_engagement_signals
├── id (UUID PK)
├── guardian_id (FK → guardian_circles.guardian_id)
├── patient_id (FK → patients.id)
├── cycle_number (int)
├── contacted_at (timestamp)
├── responded_at (timestamp, nullable)
├── response_latency_hours (float, computed)
├── response_type (enum: confirmed/declined/no_response)
├── message_channel (enum: telegram/sms/voice)
└── created_at (timestamp)

donor_churn_scores
├── id (UUID PK)
├── guardian_id (FK)
├── cusum_score (float)        -- same CUSUM math as alloimmunization
├── engagement_trend (enum: stable/declining/critical)
├── predicted_churn_date (date, nullable)
├── reengagement_attempted (bool)
├── reengagement_sent_at (timestamp, nullable)
└── updated_at (timestamp)

circle_repair_log
├── id (UUID PK)
├── patient_id (FK)
├── departing_guardian_id (FK)
├── replacement_guardian_id (FK, nullable)
├── repair_initiated_at (timestamp)
├── repair_completed_at (timestamp, nullable)
├── transition_message_sent (bool)
└── status (enum: initiated/replacement_found/completed/failed)
```

**New API endpoints (Person 2):**
```
GET  /api/v1/guardians/{guardian_id}/churn-score
POST /api/v1/guardians/{guardian_id}/reengage
GET  /api/v1/patients/{patient_id}/circle-health-timeline
POST /api/v1/patients/{patient_id}/circle-repair
```

**New background worker:** `donor_churn_monitor` — runs every 6 hours, computes CUSUM on each guardian's engagement signals, flags at-risk donors, triggers reengagement messages via Bedrock.

**New frontend component (Person 1):** `ChurnRiskBadge` on each guardian node in the constellation. Pulsing amber indicator when `engagement_trend === 'declining'`. Red when `critical`. Clicking opens a `GuardianEngagementTimeline` drawer showing response latency history as a sparkline.

**The "aha" demo moment:** Show guardian node going from amber → the system automatically sends a re-engagement message → node stabilizes back to green. "The system fired and re-hired a donor without anyone touching it."

---

### 3.2 Idea 4: The Compatibility Graph — Cross-Patient Donor Intelligence

**What it adds:** City-wide compatibility graph. Donors routed across patients when their primary patient doesn't need blood. OR-Tools reformulated for multi-patient simultaneous optimization.

**Integration point:** Extends `inventory_matcher.py` and `guardian_service.py`. New DynamoDB table for graph edges. New Lambda function for graph recomputation.

**Architecture note:** The compatibility graph is stored in Amazon DynamoDB (not PostgreSQL) because it's a key-value access pattern: "give me all patients compatible with donor X." DynamoDB GSI on `blood_type` + `city_code` handles this efficiently.

**New DynamoDB table:**
```
DonorCompatibilityEdges
PK: donor_id
SK: patient_id
Attributes:
  - compatibility_score (number)
  - blood_type_match (bool)
  - extended_phenotype_match (bool)
  - distance_km (number)
  - city_code (string)
  - last_updated (ISO timestamp)
GSI: blood_type-city_code-index (for querying "all O+ donors in HYD")
```

**New API endpoints (Person 2):**
```
GET  /api/v1/graph/donor/{donor_id}/compatible-patients
GET  /api/v1/graph/patient/{patient_id}/compatible-donors
GET  /api/v1/graph/city/{city_code}/cross-patient-matches
POST /api/v1/graph/recompute (Lambda trigger)
```

**New Lambda function:** `compatibility_graph_builder` — triggered by EventBridge daily at 2 AM. Reads all donors and patients from RDS, computes compatibility scores, writes edges to DynamoDB. Separate from the main App Runner service.

**Extended OR-Tools formulation:** When `RaktaGrid` runs the city-wide optimizer, it now also includes the cross-patient donor routing layer. A donor who is available and compatible with 3 patients but whose primary patient doesn't need blood this cycle gets offered to the other patients. Hard constraint: primary patient always gets priority if both need blood simultaneously.

**New frontend component (Person 1):** On the RaktaGrid city map, clicking a blood bank node now shows not just inventory but also a "Cross-Patient Donor Pool" panel — number of donors available for cross-routing, how many patients could be served.

**The "aha" demo moment:** Show a patient whose circle has failed → the system finds 3 compatible donors from OTHER patients' circles in the city and routes them. "No patient falls through the cracks even when their own circle fails."

---

### 3.3 Idea 5: The Sentinel — Caregiver Micro-Check-Ins + Signal Fusion

**What it adds:** 5-day caregiver check-in WhatsApp/Telegram messages. Voice note processing via Sarvam AI. Symptom signal fusion with Hb trend data. Early warning escalation.

**Integration point:** New service `sentinel_service.py`. Extends NOOR Engine with a new signal input type. Sarvam AI SDK integrated for voice transcription (replaces Google Cloud Speech for Indian languages).

**New database tables:**
```sql
caregiver_checkins
├── id (UUID PK)
├── patient_id (FK)
├── caregiver_id (FK → a new caregivers table)
├── checkin_date (date)
├── channel (enum: telegram/whatsapp/voice)
├── raw_response (text)                 -- original text or transcript
├── language_detected (varchar)         -- ISO 639-1
├── symptom_score (float, 0-1)          -- 0=fine, 1=critical
├── fatigue_reported (bool)
├── appetite_normal (bool)
├── activity_level (enum: normal/reduced/very_low)
├── caregiver_concern_level (enum: none/mild/high)
├── sarvam_transcript (text, nullable)  -- if voice note
└── processed_at (timestamp)

sentinel_alerts
├── id (UUID PK)
├── patient_id (FK)
├── alert_type (enum: symptom_spike/trend_mismatch/early_warning)
├── triggering_checkin_id (FK)
├── hb_at_trigger (float)
├── predicted_hb_at_trigger (float)
├── symptom_score_at_trigger (float)
├── recommended_action (text)
├── coordinator_notified (bool)
└── created_at (timestamp)
```

**Sarvam AI integration:**
```python
# services/sarvam_service.py
import httpx

SARVAM_API_BASE = "https://api.sarvam.ai"

async def transcribe_voice_note(audio_bytes: bytes, language_hint: str = "hi-IN") -> dict:
    """
    Transcribes voice note using Sarvam Saaras ASR.
    Returns: {transcript: str, language: str, confidence: float}
    Supported: hi-IN, te-IN, ta-IN, mr-IN, kn-IN, ml-IN, gu-IN, bn-IN, or-IN, en-IN
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SARVAM_API_BASE}/speech-to-text",
            headers={"api-subscription-key": SARVAM_API_KEY},
            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            data={"language_code": language_hint, "model": "saaras:v1"}
        )
    return response.json()

async def synthesize_voice_message(text: str, language: str = "hi-IN") -> bytes:
    """
    Synthesizes voice message using Sarvam Bulbul TTS.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SARVAM_API_BASE}/text-to-speech",
            headers={"api-subscription-key": SARVAM_API_KEY},
            json={
                "inputs": [text],
                "target_language_code": language,
                "speaker": "meera",  # female voice, best for Indian healthcare context
                "model": "bulbul:v1"
            }
        )
    return response.content
```

**Signal fusion algorithm:**
```
SentinelScore(patient) = 
  0.4 × NormalizedSymptomScore(last_3_checkins) +
  0.35 × HbDecayDeviation(predicted_vs_actual) +
  0.25 × CaregiverConcernTrend(last_3_checkins)

If SentinelScore > 0.65 AND days_to_predicted_transfusion > 7:
  → Generate EarlyWarning alert
  → Bump mobilization timeline by (0.65 × SentinelScore × days_to_predicted) days
  → Notify coordinator via Bedrock-generated summary
```

**New API endpoints (Person 2):**
```
POST /api/v1/sentinel/{patient_id}/checkin          -- process incoming checkin
GET  /api/v1/sentinel/{patient_id}/history          -- checkin history + scores
GET  /api/v1/sentinel/{patient_id}/alerts           -- sentinel alerts
POST /api/v1/sentinel/voice                         -- receive Telegram voice note
```

**New frontend component (Person 1):** `SentinelPanel` on the NOOR dashboard. Shows last 3 caregiver check-ins as a timeline. SentinelScore displayed as a gauge (0–100). When score > 65, a pulsing amber border appears around the patient card.

**The "aha" demo moment:** Play a Telugu voice note from "Priya's mother" → show Sarvam transcribing it → "Very tired, not eating" → SentinelScore spikes → mobilization timeline bumps forward → "The system heard the mother before the lab heard the blood."

---

### 3.4 Idea 6: The Donor Fatigue Ceiling

**What it adds:** Per-donor safe annual donation limit tracking. Automatic rest-cycle scheduling. Rerouting when donor approaches ceiling. "Recovery timeline" messaging.

**Integration point:** Extends `guardian_service.py` and the mobilization state machine. New field on `guardian_circles`. New check in mobilization trigger logic.

**Database changes (additive only):**
```sql
-- Add to existing guardian_circles table via Alembic migration
ALTER TABLE guardian_circles ADD COLUMN annual_donation_count INT DEFAULT 0;
ALTER TABLE guardian_circles ADD COLUMN fatigue_ceiling INT DEFAULT 6;  -- max 6 donations/year (safe for whole blood)
ALTER TABLE guardian_circles ADD COLUMN fatigue_rest_until DATE;
ALTER TABLE guardian_circles ADD COLUMN fatigue_notified BOOL DEFAULT FALSE;
```

**Fatigue logic in mobilization service:**
```python
def is_donor_fatigue_safe(guardian: Guardian) -> tuple[bool, str]:
    """
    Returns (can_donate, reason).
    Whole blood: max 6 times/year, minimum 56 days between donations.
    Platelets: max 24 times/year, minimum 7 days.
    """
    if guardian.fatigue_rest_until and guardian.fatigue_rest_until > date.today():
        return False, f"rest_cycle_until_{guardian.fatigue_rest_until}"
    
    days_since_last = (date.today() - guardian.last_donation_date).days
    if days_since_last < 56:  # WHO guideline for whole blood
        return False, f"too_soon_{56 - days_since_last}_days_remaining"
    
    if guardian.annual_donation_count >= guardian.fatigue_ceiling:
        # Schedule rest until January 1st of next year
        guardian.fatigue_rest_until = date(date.today().year + 1, 1, 1)
        return False, "annual_ceiling_reached"
    
    return True, "eligible"
```

**New API endpoint (Person 2):**
```
GET  /api/v1/guardians/{guardian_id}/fatigue-status
POST /api/v1/guardians/{guardian_id}/schedule-rest
```

**New frontend component (Person 1):** `FatigueMeter` — small battery-style indicator on each guardian node. Green = safe. Yellow = 1–2 donations remaining this year. Red = at ceiling / in rest. Tooltip shows "Next eligible: March 15, 2026."

**The "aha" demo moment:** Show a guardian at their annual ceiling → the system puts them in rest → routes their patient to a cross-circle backup → sends the guardian a "Your body is preparing for the next save" message. "We are the only platform that deliberately protects the donor."

---

### 3.5 Idea 7: The Grief Protocol

**What it adds:** Patient status `deceased` handling. Personalized impact summaries for each guardian. Graceful circle transition to another patient with donor consent.

**Integration point:** New endpoint. New patient status field. New Bedrock-powered message template. New frontend admin action.

**Database changes:**
```sql
-- Add to existing patients table
ALTER TABLE patients ADD COLUMN status VARCHAR(20) DEFAULT 'active';
-- Values: active, inactive, deceased, transferred

-- New table
guardian_memorial_messages
├── id (UUID PK)
├── patient_id (FK)
├── guardian_id (FK)
├── total_donations (int)
├── total_days_supported (int)       -- days from first to last donation
├── message_text (text)              -- Bedrock-generated, personalized
├── sent_at (timestamp)
├── transition_consent_given (bool)
├── transition_patient_id (UUID FK, nullable)  -- if they agreed to continue
└── created_at (timestamp)
```

**Grief Protocol trigger:**
```python
async def trigger_grief_protocol(patient_id: UUID, db: AsyncSession):
    """
    Called when patient.status is set to 'deceased'.
    1. Fetches all guardians with at least 1 donation to this patient.
    2. For each guardian, generates personalized Bedrock message.
    3. Sends via Telegram/SMS.
    4. After 72 hours, sends transition offer.
    """
    patient = await get_patient(patient_id, db)
    guardians = await get_active_guardians(patient_id, db)
    
    for guardian in guardians:
        stats = await get_guardian_donation_stats(guardian.id, patient_id, db)
        message = await generate_memorial_message(patient, guardian, stats)  # Bedrock call
        await send_telegram_message(guardian.telegram_chat_id, message)
        
        # Log memorial message
        await save_memorial_record(patient_id, guardian.id, stats, message, db)
    
    # Schedule transition offer for 72 hours later via EventBridge
    await schedule_transition_offer(patient_id, delay_hours=72)
```

**New API endpoints (Person 2):**
```
POST /api/v1/patients/{patient_id}/status          -- set status (deceased/inactive)
GET  /api/v1/patients/{patient_id}/grief-protocol/status
POST /api/v1/guardians/{guardian_id}/transition-consent  -- guardian accepts transition
```

**New frontend component (Person 1):** On the patient detail page, admin sees a `PatientStatusPanel`. When status is changed to `deceased`, a confirmation modal appears with the text: "This will initiate the Grief Protocol for all guardians. This cannot be undone." After confirmation, the patient card in the list shows a memorial state (muted colors, ♾ icon).

**The "aha" demo moment:** Mark a demo patient as deceased → watch personalized messages generate in real-time in the admin panel → "Your blood kept Priya alive for 847 days" → transition offer appears. Judges who work in healthcare will be silent. This signals you understood the human system.

---

### 3.6 Idea 8: The Blood Weather Forecast

**What it adds:** City-level 30-day blood demand forecast aggregated from all patient NOOR forecasts. Supply/demand gap analysis per blood type per week. Published as a "Blood Weather Map" heatmap on RaktaGrid.

**Integration point:** New background worker reads all patient forecasts + current inventory, runs projection, publishes to new `blood_weather` table. New frontend heatmap on RaktaGrid view.

**New database table:**
```sql
blood_weather_forecasts
├── id (UUID PK)
├── city_code (varchar)
├── forecast_week_start (date)         -- Monday of each week
├── blood_type (varchar)               -- A+, A-, B+, etc.
├── predicted_demand_units (int)       -- from aggregated patient forecasts
├── current_supply_units (int)         -- from inventory snapshot
├── gap_units (int)                    -- demand - supply (negative = surplus)
├── gap_severity (enum: surplus/balanced/shortage/critical)
├── generated_at (timestamp)
└── model_confidence (float)
```

**Aggregation algorithm:**
```python
async def generate_blood_weather(city_code: str, db: AsyncSession):
    """
    For each of the next 4 weeks:
      1. Fetch all active patients in city
      2. Count those whose predicted_transfusion_date falls in that week
      3. Multiply by avg units needed per transfusion (2 units standard)
      4. Compare to current inventory per blood type
      5. Compute gap and severity
    """
    weeks = [date.today() + timedelta(weeks=i) for i in range(4)]
    patients = await get_city_patients(city_code, db)
    inventory = await get_city_inventory(city_code, db)
    
    forecasts = []
    for week_start in weeks:
        week_end = week_start + timedelta(days=7)
        for blood_type in ALL_BLOOD_TYPES:
            patients_needing = [
                p for p in patients
                if p.blood_type_full == blood_type
                and p.next_transfusion_predicted
                and week_start <= p.next_transfusion_predicted <= week_end
            ]
            demand = len(patients_needing) * 2  # avg 2 units per transfusion
            supply = inventory.get(blood_type, 0)
            gap = demand - supply
            severity = classify_gap(gap, demand)
            forecasts.append(BloodWeatherForecast(...))
    
    await save_weather_forecasts(forecasts, db)
    return forecasts
```

**New API endpoints (Person 2):**
```
GET /api/v1/weather/{city_code}             -- current 4-week forecast
GET /api/v1/weather/{city_code}/history     -- past forecast accuracy
GET /api/v1/weather/{city_code}/report      -- PDF-ready weekly report data
```

**New frontend component (Person 1):** On the RaktaGrid view, add a `BloodWeatherPanel` above the city map. A 4-week grid (rows = blood types, columns = weeks) with color coding: green = surplus, yellow = balanced, orange = shortage, red = critical. Clicking a cell shows "3 patients of type B+ expected this week, only 1 unit available."

**The "aha" demo moment:** Show the 4-week heatmap → "Week 3 shows a critical B+ shortage. No other platform in the world shows this. We predict blood shortages the way a weather service predicts rain — before they happen."

---

## 4. Complete New Technology Stack

### 4.1 Additions to the Stack

| New Tech | Purpose | Who Integrates |
|----------|---------|----------------|
| Amazon Bedrock (Claude Sonnet 3.5) | Replaces Gemini for all LLM calls | Person 2 |
| Amazon RDS PostgreSQL | Replaces Supabase | Person 2 |
| Amazon ElastiCache Redis | Replaces Upstash | Person 2 |
| Amazon App Runner | Replaces Railway | Person 2 |
| Amazon S3 + CloudFront | Replaces Vercel | Person 1 |
| Amazon Cognito | Replaces Supabase Auth | Person 2 |
| Amazon EventBridge | Replaces APScheduler crons | Person 2 |
| AWS Lambda | New orchestration layer | Person 2 |
| Amazon DynamoDB | Compatibility graph storage | Person 2 |
| Amazon CloudWatch | New — monitoring + alerts | Person 2 |
| AWS Secrets Manager | Replaces .env for prod secrets | Person 2 |
| Amazon Transcribe | Fallback for English ASR | Person 2 |
| Amazon Polly | English TTS fallback | Person 2 |
| Sarvam AI (Saaras + Bulbul) | Indian language STT/TTS | Person 2 |
| SageMaker Feature Store | Donor behavioral fingerprints | Person 2 |

### 4.2 What Stays the Same

- FastAPI (no change)
- Next.js 14 (build output changes to static export for S3)
- SQLAlchemy + Alembic (same, just new RDS connection string)
- Google OR-Tools (same)
- Facebook Prophet (same)
- Telegram Bot API (same)
- All existing API contracts (zero breaking changes)

---

## 5. Database Migration Strategy

All new tables are additive. No existing table is modified except via `ALTER TABLE ADD COLUMN` with defaults. Migration sequence:

```
Migration 001: (existing) — base schema
Migration 002: (new) — donor_engagement_signals
Migration 003: (new) — donor_churn_scores
Migration 004: (new) — circle_repair_log
Migration 005: (new) — caregiver_checkins
Migration 006: (new) — sentinel_alerts
Migration 007: (new) — guardian_memorial_messages
Migration 008: (new) — blood_weather_forecasts
Migration 009: (new) — ALTER guardian_circles ADD fatigue columns
Migration 010: (new) — ALTER patients ADD status column
```

---

## 6. Environment Variables (Complete List)

```env
# === AWS Core ===
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# === AWS Services ===
AWS_BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5
AWS_RDS_HOST=
AWS_RDS_PORT=5432
AWS_RDS_DATABASE=raktasetu
AWS_RDS_USER=
AWS_RDS_PASSWORD=  # pulled from Secrets Manager in prod
AWS_ELASTICACHE_HOST=
AWS_DYNAMODB_TABLE_COMPATIBILITY=DonorCompatibilityEdges
AWS_S3_BUCKET_FRONTEND=raktasetu-noor-frontend
AWS_CLOUDFRONT_DISTRIBUTION_ID=
AWS_COGNITO_USER_POOL_ID=
AWS_COGNITO_CLIENT_ID=
AWS_SAGEMAKER_FEATURE_GROUP=donor-behavioral-fingerprints

# === Sarvam AI ===
SARVAM_API_KEY=

# === Telegram (unchanged) ===
TELEGRAM_BOT_TOKEN=

# === App ===
APP_ENV=production
APP_SECRET_KEY=
DATABASE_URL=postgresql+asyncpg://${AWS_RDS_USER}:${AWS_RDS_PASSWORD}@${AWS_RDS_HOST}:5432/raktasetu
REDIS_URL=redis://${AWS_ELASTICACHE_HOST}:6379
FRONTEND_URL=https://${AWS_CLOUDFRONT_DISTRIBUTION_ID}.cloudfront.net
```

---

## 7. Integration Sequence (Order Matters)

Execute in this order to avoid breaking existing functionality:

```
Phase A: AWS Infrastructure (Person 2 leads, Person 1 updates NEXT_PUBLIC vars)
  A1. Provision RDS PostgreSQL → run existing Alembic migrations → verify data
  A2. Provision ElastiCache → update REDIS_URL → verify cache hits
  A3. Deploy FastAPI to App Runner → smoke test all existing endpoints
  A4. Set up Cognito → migrate auth → verify JWT validation works
  A5. Build frontend for S3 static export → deploy → verify all routes load
  A6. CloudWatch dashboard → /health publishing → verify metrics appear

Phase B: Bedrock + Sarvam (Person 2)
  B1. Swap Gemini SDK for Bedrock boto3 client
  B2. Verify all existing LLM calls work with Bedrock
  B3. Add Sarvam service → test transcription with a Hindi voice sample
  B4. Wire Sarvam into Telegram voice note handler

Phase C: New Ideas Backend (Person 2)
  C1. Alembic migrations 002–010
  C2. Living Circle: CUSUM on engagement signals + churn worker
  C3. Compatibility Graph: DynamoDB table + Lambda builder
  C4. Sentinel: caregiver checkin endpoints + signal fusion
  C5. Donor Fatigue: fatigue check in mobilization service
  C6. Grief Protocol: patient status + memorial message generator
  C7. Blood Weather: aggregation worker + forecast endpoints

Phase D: New Ideas Frontend (Person 1)
  D1. ChurnRiskBadge on Guardian Constellation nodes
  D2. FatigueMeter on guardian nodes
  D3. SentinelPanel on NOOR dashboard
  D4. BloodWeatherPanel on RaktaGrid view
  D5. PatientStatusPanel + grief protocol modal
  D6. Cross-Patient Donor Pool panel on RaktaGrid map

Phase E: Integration + Demo Polish (Both)
  E1. End-to-end test all new features with seed data
  E2. Demo narrative rehearsal
  E3. CloudWatch dashboard screenshot for presentation
```

---

## 8. API Contract Additions (Append to shared/contracts/)

All existing contracts remain unchanged. These are additions only.

```typescript
// New types to append to api.types.ts

interface DonorChurnScore {
  guardian_id: string
  cusum_score: number          // 0-∞, alert at > 0.4
  engagement_trend: 'stable' | 'declining' | 'critical'
  predicted_churn_date: string | null
  reengagement_attempted: boolean
}

interface CaregiverCheckin {
  id: string
  patient_id: string
  checkin_date: string
  symptom_score: number        // 0-1
  fatigue_reported: boolean
  activity_level: 'normal' | 'reduced' | 'very_low'
  caregiver_concern_level: 'none' | 'mild' | 'high'
  language_detected: string
}

interface SentinelStatus {
  patient_id: string
  sentinel_score: number       // 0-100
  last_checkin: CaregiverCheckin | null
  alert_active: boolean
  recommended_action: string | null
}

interface BloodWeatherForecast {
  city_code: string
  forecast_week_start: string
  blood_type: BloodGroup
  predicted_demand_units: number
  current_supply_units: number
  gap_units: number
  gap_severity: 'surplus' | 'balanced' | 'shortage' | 'critical'
}

interface DonorFatigueStatus {
  guardian_id: string
  annual_donation_count: number
  fatigue_ceiling: number
  donations_remaining: number
  fatigue_rest_until: string | null
  is_eligible: boolean
  ineligibility_reason: string | null
}

interface CompatibilityEdge {
  donor_id: string
  patient_id: string
  compatibility_score: number
  blood_type_match: boolean
  extended_phenotype_match: boolean
  distance_km: number
}

type PatientStatus = 'active' | 'inactive' | 'deceased' | 'transferred'
```

---

## 9. Demo Narrative (Updated — 10 Minutes)

```
0:00  Opening: "India has 2 lakh Thalassemia patients. Each needs blood every 21 days for life."
      Show patient list dashboard.

1:00  NOOR Engine: Open Priya's dashboard.
      Show the sawtooth Hb chart. "The system predicted November 3rd."
      Show SentinelPanel: "Her mother sent a voice note yesterday."
      Play the Sarvam-transcribed Telugu voice note: "bahut thak rahi hai."
      "The system heard the mother before the lab heard the blood."
      SentinelScore rises → mobilization timeline bumps forward.

2:30  Living Circle: Open Guardian Constellation.
      Point to amber node (Suresh): "Engagement CUSUM score is 0.38. He's drifting."
      Show the system sending a personalized re-engagement message.
      Suresh responds. Node goes green. "No human touched this."

3:30  Donor Fatigue: Point to red node (Raju): "Annual ceiling reached."
      FatigueMeter shows battery at 0. System has already rerouted.
      "We protect donors. That's why they stay."

4:00  Compatibility Graph: Priya's circle shows one confirmed donor.
      "That's not enough. Watch."
      RaktaGrid activates cross-patient routing.
      Two donors from OTHER patients' circles appear — compatible, available.
      "One donor, three patients. The system knows."

5:00  RaktaGrid + Blood Weather: Switch to city map.
      Show BloodWeatherPanel: Week 3 is red for B+.
      "Three patients need B+ in week 3. We have 1 unit. The system flagged this 3 weeks ago."
      Show the match card for Apollo Hospital.

6:30  Grief Protocol: Open Vikram's record.
      Change status to inactive (demo-safe version of deceased).
      Memorial messages generate in real-time.
      "Your blood kept Vikram alive for 847 days."
      Transition offer appears. "Would you like to carry what you gave forward?"
      Pause. Let judges feel it.

8:00  Blood Weather Report: Show the 4-week heatmap.
      "This is the blood weather forecast for Hyderabad."
      "We predict shortages the way a weather service predicts rain."
      "City health coordinators receive this every Monday."

9:00  Closing: "Most platforms find out a donor has churned when the blood isn't there.
      We find out two cycles in advance. Most platforms contact donors 14 days before.
      We contact them 45 days before, and we tell them what happened after.
      This is not a donation app. This is the infrastructure layer India's patients never had."

10:00 End.
```

---

*This document is the integration source of truth. Any new feature not described here requires agreement from both developers before implementation.*
