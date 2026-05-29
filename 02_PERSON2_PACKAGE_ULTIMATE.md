# Person 2 Implementation Package — Backend + ML + AI Pipeline
## RaktaSetu NOOR | AI-for-Good Hackathon Execution Manual

> **Owner:** Person 2 (Backend Engineer + ML Architect + DevOps)  
> **Scope:** `/backend` directory + `shared/contracts/api.schema.json`  
> **Runtime Target:** Cursor / Claude / Windsurf — paste-ready phase prompts  
> **Demo Anchor:** NOOR forecast endpoint → Guardian mobilization → RaktaGrid optimization

---

## 1. Responsibilities & Boundaries

### What Person 2 OWNS (Absolute Authority)
| Path | Ownership |
|------|-----------|
| `/backend/**` | All Python code: FastAPI app, routers, services, ML, workers |
| `/backend/api/` | FastAPI application factory, middleware, dependencies, all routers |
| `/backend/ml/` | Prophet forecaster, CUSUM alloimmunization detector, OR-Tools optimizer |
| `/backend/services/` | Guardian circle builder, mobilization logic, messaging (Claude+Twilio), voice (Sarvam), bank sync |
| `/backend/workers/` | APScheduler background jobs: forecast refresh, anomaly detection, circle health, inventory matching |
| `/backend/models/` | SQLAlchemy 2.0 declarative models (Patient, HbReading, Forecast, Guardian, BloodBank, Inventory, Alert) |
| `/backend/schemas/` | Pydantic v2 request/response models — source of truth for API contracts |
| `/backend/db/` | Alembic migrations, async session factory, seed scripts |
| `/backend/core/` | Config (Pydantic-Settings), structured logging (structlog), exceptions, constants |
| `/backend/tests/` | pytest + pytest-asyncio test suite |
| `shared/contracts/api.schema.json` | JSON Schema source of truth (Person 1 generates TS types from this) |
| `docker-compose.yml` (backend service block) | Dev container config |
| `.github/workflows/backend.yml` | CI/CD pipeline |
| `railway.json` + `Dockerfile` | Production deployment config |

### What Person 2 MUST NOT TOUCH (Zero Exceptions)
- `/frontend/**` — any React component, Next.js config, Tailwind config, package.json
- `shared/contracts/api.types.ts` — owned by Person 1; Person 2 reads only
- Vercel deployment configuration
- Browser-specific concerns (SSR, hydration, responsive design)

### APIs Person 2 EXPOSES
Person 2 is the **sole API provider**. All endpoints prefixed `/api/v1`. Person 1 consumes these exclusively.

---

## 2. Technical Scope

| Area | Technology | Owner | Why |
|------|-----------|-------|-----|
| API Framework | FastAPI 0.111 (Python 3.11) | P2 | Async native, auto OpenAPI/Swagger, Python ML ecosystem |
| ORM | SQLAlchemy 2.0 + Alembic | P2 | Async PostgreSQL support, type-safe queries |
| Database Driver | asyncpg 0.29 + psycopg2-binary | P2 | Async + sync (for Alembic) |
| Database | PostgreSQL 16 (Supabase) | P2 | Managed, RLS, free tier 500MB |
| Cache | Redis 7 (Upstash) | P2 | 10k commands/day free tier; forecast + circle caching |
| ML Forecasting | Prophet 1.1.5 | P2 | Probabilistic time-series, medically appropriate |
| Anomaly Detection | statsmodels 0.14.2 (CUSUM) | P2 | Rigorous statistical process control |
| Optimization | OR-Tools 9.10 (CP-SAT) | P2 | Google's combinatorial solver; free, production-grade |
| AI Messaging | Anthropic Claude 3.5 Sonnet | P2 | Personalized guardian messages; empathetic tone |
| Voice AI | Sarvam AI | P2 | Indian language STT/TTS (10 languages) |
| Messaging Delivery | Twilio (WhatsApp + IVR) | P2 | One SDK, both channels, $15 trial credit |
| Task Scheduling | APScheduler 3.10 | P2 | In-process scheduler for hackathon scope |
| Auth Validation | python-jose + Supabase JWT | P2 | Validate Supabase JWT on every endpoint |
| Testing | pytest 8.2 + pytest-asyncio + pytest-cov | P2 | Async test support, coverage reporting |
| Observability | structlog 24.2 + Sentry SDK | P2 | Structured JSON logging, error tracking |
| Deploy | Railway (Docker) | P2 | 500 hours/month free tier; one-click from GitHub |

---

## 3. Exact Folder Structure

```
raktasetu-noor/
├── backend/                           ← PERSON 2 OWNS ENTIRELY
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app factory with lifespan
│   │   ├── dependencies.py            # Auth (Supabase JWT), DB session injection
│   │   ├── middleware.py              # CORS, request ID, timing logging
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── patients.py            # GET /patients, POST /patients, GET /patients/:id
│   │       ├── forecasts.py           # GET /patients/:id/forecast (triggers Prophet)
│   │       ├── hb_readings.py         # POST /patients/:id/hb-reading
│   │       ├── guardians.py           # GET /patients/:id/guardian-circle, POST /:id/mobilize
│   │       ├── grid.py                # GET /grid/city/:code, POST /grid/matches/:id/approve
│   │       └── health.py              # GET /health (system status)
│   │
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── noor_engine/
│   │   │   ├── __init__.py
│   │   │   ├── hb_forecaster.py       # Prophet per-patient time-series model
│   │   │   ├── iron_overload_detector.py # Ferritin trend analysis (simplified for demo)
│   │   │   └── alloimmunization.py    # CUSUM on Hb-rise-per-unit
│   │   └── raktagrid/
│   │       ├── __init__.py
│   │       ├── inventory_matcher.py     # OR-Tools CP-SAT multi-objective solver
│   │       └── phenotype_matcher.py     # Extended antigen compatibility matrix
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── guardian_service.py          # Circle construction + health scoring algorithm
│   │   ├── mobilization_service.py      # T-14 through T-0 state machine + trigger logic
│   │   ├── messaging_service.py         # Claude API prompt engineering + message generation
│   │   ├── voice_service.py             # Sarvam AI STT/TTS wrapper
│   │   └── bank_sync_service.py         # Blood bank inventory ingestion (API + WhatsApp parser stub)
│   │
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── scheduler.py                 # APScheduler setup + job registration
│   │   ├── hb_forecast_worker.py        # Daily: regenerate all patient forecasts
│   │   ├── alloimmunization_worker.py   # Post-transfusion: run CUSUM check
│   │   ├── circle_health_worker.py      # Hourly: recalculate circle scores, repair degraded circles
│   │   └── inventory_match_worker.py    # Every 6 hours: run OR-Tools optimization for all cities
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                      # SQLAlchemy 2.0 declarative base + common columns
│   │   ├── patient.py                   # Patient model (all phenotype fields)
│   │   ├── hb_reading.py                # HbReading model (post-transfusion flag, computed rise)
│   │   ├── forecast.py                  # Forecast cache model (predicted date, confidence, model version)
│   │   ├── guardian.py                  # Guardian model (role, status, scores, eligibility)
│   │   ├── blood_bank.py                # BloodBank model (city, lat/lng, sync status)
│   │   ├── inventory.py                 # Inventory model (blood type, phenotype flags, expiry)
│   │   └── alert.py                     # Alert model (type, severity, message, resolved_at)
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── patient.py                   # Pydantic: PatientCreate, PatientDetail, PatientListResponse
│   │   ├── forecast.py                  # Pydantic: ForecastResponse, ForecastPoint, AlertFlag
│   │   ├── guardian.py                  # Pydantic: GuardianCircleResponse, GuardianSchema
│   │   ├── grid.py                      # Pydantic: CityInventoryResponse, InventoryMatchSchema, BloodBankNodeSchema
│   │   ├── hb_reading.py                # Pydantic: HbReadingCreate, HbReadingResponse
│   │   └── common.py                    # Pydantic: ApiResponse envelope, ApiError, ResponseMeta
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py                   # Async SQLAlchemy session factory + engine
│   │   └── migrations/
│   │       ├── env.py
│   │       ├── script.py.mako
│   │       └── versions/
│   │           └── 001_initial_schema.py # Initial Alembic migration
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                    # Pydantic-Settings from environment variables
│   │   ├── logging.py                   # structlog JSON configuration
│   │   ├── exceptions.py                # Custom exception hierarchy
│   │   └── constants.py                 # All clinical thresholds, scoring weights, CUSUM params
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                  # pytest fixtures: test DB, async client, mock external APIs
│   │   ├── test_noor_engine.py          # Prophet + CUSUM unit tests
│   │   ├── test_guardian_service.py     # Circle builder + health scoring tests
│   │   ├── test_inventory_matcher.py     # OR-Tools optimization tests
│   │   ├── test_api_patients.py         # FastAPI endpoint integration tests
│   │   └── test_messaging_service.py    # Claude message generation tests (mocked)
│   │
│   ├── .env.example
│   ├── requirements.txt
│   ├── pyproject.toml                   # pytest config, black/isort settings
│   ├── Dockerfile                       # Multi-stage or slim build with Prophet deps
│   └── railway.json                     # Railway deployment config
│
├── shared/                            ← BOTH READ; PERSON 2 OWNS api.schema.json
│   ├── contracts/
│   │   ├── api.schema.json              # (Person 2 writes; Person 1 generates TS from it)
│   │   └── api.types.ts                 # (Person 1 generates; Person 2 reads only)
│   └── constants/
│       └── index.ts                     # (Both agree; Person 2 writes Python equivalent in core/constants.py)
│
└── .github/
    └── workflows/
        └── backend.yml                  # CI: lint (ruff), type-check (mypy), test (pytest), deploy (Railway)
```

---

## 4. Phase-Wise AI Execution Prompts

> **INSTRUCTION:** Paste each phase prompt into a NEW Cursor chat (Composer mode, Agent context).  
> **RULE:** Do NOT proceed to Phase N+1 until Phase N passes its Acceptance Criteria.  
> **CONTEXT:** Each prompt assumes all previous phases are complete and committed to git.

---

### PHASE 0 — Environment, Tooling & FastAPI Scaffold
**Estimated Time:** 45 minutes  
**Goal:** Initialize Python project, install all dependencies, verify FastAPI runs with `/health` endpoint.

```text
You are initializing the RaktaSetu NOOR backend — a clinical AI platform for Thalassemia blood management. This is Phase 0 of 6 for the backend engineer.

OBJECTIVE:
Create the complete Python 3.11 project scaffold with FastAPI, SQLAlchemy 2.0 async, Alembic, and all ML/AI dependencies. The output must be production-grade from the first commit.

STEP 1 — PROJECT INITIALIZATION:
In /backend directory, create a Python virtual environment:
  python3.11 -m venv venv
  source venv/bin/activate  (or venv\Scripts\activate on Windows)

Create requirements.txt with EXACT versions:
fastapi==0.111.0
uvicorn[standard]==0.30.0
python-multipart==0.0.9
sqlalchemy[asyncio]==2.0.30
alembic==1.13.1
asyncpg==0.29.0
psycopg2-binary==2.9.9
redis==5.0.4
prophet==1.1.5
statsmodels==0.14.2
numpy==1.26.4
pandas==2.2.2
scikit-learn==1.5.0
ortools==9.10.4067
anthropic==0.29.0
twilio==9.1.0
requests==2.32.3
pydantic==2.7.1
pydantic-settings==2.3.0
python-jose[cryptography]==3.3.0
supabase==2.5.0
apscheduler==3.10.4
pytest==8.2.2
pytest-asyncio==0.23.7
pytest-cov==5.0.0
httpx==0.27.0
structlog==24.2.0
sentry-sdk[fastapi]==2.5.1
python-dotenv==1.0.1
arrow==1.3.0

Run: pip install -r requirements.txt

STEP 2 — CORE CONFIGURATION:
Create /backend/core/config.py using pydantic-settings:
  from pydantic_settings import BaseSettings
  class Settings(BaseSettings):
      app_env: str = "development"
      app_secret_key: str = "dev-secret-change-me"
      app_host: str = "0.0.0.0"
      app_port: int = 8000
      database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/raktasetu"
      database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/raktasetu"
      redis_url: str = "redis://localhost:6379"
      supabase_url: str = ""
      supabase_service_key: str = ""
      anthropic_api_key: str = ""
      twilio_account_sid: str = ""
      twilio_auth_token: str = ""
      twilio_whatsapp_from: str = "whatsapp:+14155238886"
      sarvam_api_key: str = ""
      frontend_url: str = "http://localhost:3000"
      class Config: env_file = ".env"
  settings = Settings()

Create /backend/core/exceptions.py:
  class RaktaSetuException(Exception): pass
  class PatientNotFoundError(RaktaSetuException): status_code = 404
  class InsufficientDataError(RaktaSetuException): status_code = 422
  class ForecastError(RaktaSetuException): status_code = 500
  class GuardianCircleError(RaktaSetuException): status_code = 422
  class InventoryMatchError(RaktaSetuException): status_code = 422
  class MessagingError(RaktaSetuException): status_code = 503

Create /backend/core/logging.py:
  import structlog
  structlog.configure(
      processors=[
          structlog.processors.TimeStamper(fmt="iso"),
          structlog.processors.add_log_level,
          structlog.processors.JSONRenderer(),
      ]
  )
  logger = structlog.get_logger()

Create /backend/core/constants.py with ALL clinical constants:
  COMPATIBILITY_MATRIX = { ... }  # full ABO/Rh matrix
  HB_TRANSFUSION_THRESHOLD = 7.0
  HB_THRESHOLD_PEDIATRIC = 7.5
  FERRITIN_OVERLOAD_THRESHOLD = 2500
  FERRITIN_TREND_THRESHOLD = 300
  GUARDIAN_WEIGHT_COMPATIBILITY = 40
  GUARDIAN_WEIGHT_RELIABILITY = 20
  GUARDIAN_WEIGHT_GEOGRAPHY = 20
  GUARDIAN_WEIGHT_PHENOTYPE = 20
  MIN_READINGS_FOR_FORECAST = 3
  FORECAST_HORIZON_DAYS = 60
  FORECAST_CONFIDENCE_LEVEL = 0.80
  CUSUM_ALLOIMMUNIZATION_K = 0.5
  CUSUM_ALLOIMMUNIZATION_H = -3.0
  MIN_READINGS_FOR_CUSUM = 4
  MOBILIZATION_T10 = 10
  MOBILIZATION_T7 = 7
  MOBILIZATION_T3 = 3
  MOBILIZATION_T0 = 0
  INVENTORY_MATCH_EXPIRY_BUFFER_DAYS = 2
  ORTOOLS_SOLVE_TIMEOUT_SECONDS = 30

STEP 3 — FASTAPI APP FACTORY:
Create /backend/api/main.py:
  from contextlib import asynccontextmanager
  from fastapi import FastAPI
  from api.routers import health, patients, forecasts, guardians, grid, hb_readings
  from core.config import settings
  from core.logging import logger

  @asynccontextmanager
  async def lifespan(app: FastAPI):
      logger.info("app_startup")
      # Initialize ML models, Redis connection here
      yield
      logger.info("app_shutdown")

  app = FastAPI(title="RaktaSetu NOOR", version="1.0.0", lifespan=lifespan)
  app.include_router(health.router, prefix="/health", tags=["health"])
  # Include other routers with /api/v1 prefix

  # CORS middleware
  from fastapi.middleware.cors import CORSMiddleware
  app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

Create /backend/api/routers/health.py:
  from fastapi import APIRouter
  router = APIRouter()
  @router.get("")
  async def health_check(): return {"status": "ok", "version": "1.0.0"}

STEP 4 — DATABASE SESSION:
Create /backend/db/session.py:
  from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
  from sqlalchemy.orm import declarative_base
  from core.config import settings
  engine = create_async_engine(settings.database_url, echo=settings.app_env == "development")
  AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
  Base = declarative_base()

STEP 5 — ENVIRONMENT FILE:
Create /backend/.env.example with all variables listed in Step 2 (empty values).

STEP 6 — VERIFICATION:
Run: uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
Confirm: http://localhost:8000/health returns {"status":"ok","version":"1.0.0"}
Confirm: http://localhost:8000/docs shows Swagger UI with no errors.

ACCEPTANCE CRITERIA:
- [ ] `uvicorn` serves on :8000 without import errors
- [ ] `/health` returns 200 with correct JSON
- [ ] `/docs` (Swagger) loads with auto-generated schema
- [ ] `.env.example` is committed to git
- [ ] `requirements.txt` is committed to git
- [ ] Branch: feat/p2-phase0-scaffold
```

---

### PHASE 1 — Database Models, Alembic Migrations & Seed Data
**Estimated Time:** 75 minutes  
**Goal:** Define all SQLAlchemy models, create initial migration, build seed script for demo data (Priya, Vikram, 5 blood banks, 8 guardians).

```text
You are building Phase 1 of 6 for RaktaSetu NOOR backend. Phase 0 (scaffold) is complete.

OBJECTIVE:
Define the complete PostgreSQL schema via SQLAlchemy 2.0 models, generate the initial Alembic migration, and create a seed script that populates the exact demo data needed for the hackathon presentation.

RULES:
1. All models use SQLAlchemy 2.0 style: type-annotated Mapped columns.
2. All tables use snake_case, plural names.
3. All primary keys are UUID (generate_uuid function using uuid4).
4. All models have __tablename__, __repr__, and created_at/updated_at timestamps.
5. Foreign keys have proper ondelete behavior.
6. Seed data MUST support the demo narrative exactly.

STEP 1 — BASE MODEL:
Update /backend/models/base.py:
  from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
  from sqlalchemy import String, DateTime, func
  from db.session import Base
  import uuid
  class BaseModel(Base):
      __abstract__ = True
      id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
      created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
      updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

STEP 2 — PATIENT MODEL:
Create /backend/models/patient.py:
  class Patient(BaseModel):
      __tablename__ = "patients"
      name: Mapped[str]
      age: Mapped[int]
      blood_type: Mapped[str]  # A, B, AB, O
      rh_factor: Mapped[str]   # +, -
      kell_negative: Mapped[bool] = mapped_column(default=False)
      duffy_negative: Mapped[bool] = mapped_column(default=False)
      kidd_negative: Mapped[bool] = mapped_column(default=False)
      alloimmunization_flag: Mapped[bool] = mapped_column(default=False)
      hospital_id: Mapped[str]
      enrolled_at: Mapped[DateTime]
      next_transfusion_predicted: Mapped[DateTime | None]
      hb_current: Mapped[float | None]
      # Relationships:
      hb_readings: Mapped[list["HbReading"]] = relationship(back_populates="patient", lazy="selectin")
      forecasts: Mapped[list["Forecast"]] = relationship(back_populates="patient", lazy="selectin")
      guardians: Mapped[list["Guardian"]] = relationship(back_populates="patient", lazy="selectin")

STEP 3 — HB READING MODEL:
Create /backend/models/hb_reading.py:
  class HbReading(BaseModel):
      __tablename__ = "hb_readings"
      patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
      hb_value: Mapped[float]
      reading_date: Mapped[DateTime]
      post_transfusion: Mapped[bool] = mapped_column(default=False)
      units_transfused: Mapped[int | None]
      hb_rise_per_unit: Mapped[float | None]  # computed
      patient: Mapped["Patient"] = relationship(back_populates="hb_readings")

STEP 4 — FORECAST MODEL:
Create /backend/models/forecast.py:
  class Forecast(BaseModel):
      __tablename__ = "forecasts"
      patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
      predicted_transfusion_date: Mapped[DateTime]
      confidence_lower: Mapped[DateTime]
      confidence_upper: Mapped[DateTime]
      confidence_pct: Mapped[float]
      model_version: Mapped[str]
      generated_at: Mapped[DateTime]
      status: Mapped[str]  # success, insufficient_data, model_error, cached
      patient: Mapped["Patient"] = relationship(back_populates="forecasts")

STEP 5 — GUARDIAN MODEL:
Create /backend/models/guardian.py:
  class Guardian(BaseModel):
      __tablename__ = "guardians"
      patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
      name: Mapped[str]
      phone: Mapped[str]  # full phone, masked in schema
      role: Mapped[str]   # primary, secondary, rare_specialist
      status: Mapped[str] # active, cooldown, pending, unavailable, empty
      last_donation_date: Mapped[DateTime | None]
      next_eligible_date: Mapped[DateTime | None]
      donation_count: Mapped[int] = mapped_column(default=0)
      response_latency_avg_hours: Mapped[float] = mapped_column(default=72.0)
      preferred_language: Mapped[str] = mapped_column(default="en")
      compatibility_score: Mapped[int] = mapped_column(default=0)
      reliability_score: Mapped[int] = mapped_column(default=0)
      geography_score: Mapped[int] = mapped_column(default=0)
      patient: Mapped["Patient"] = relationship(back_populates="guardians")

STEP 6 — BLOOD BANK & INVENTORY MODELS:
Create /backend/models/blood_bank.py:
  class BloodBank(BaseModel):
      __tablename__ = "blood_banks"
      name: Mapped[str]
      city: Mapped[str]
      lat: Mapped[float]
      lng: Mapped[float]
      api_endpoint: Mapped[str | None]
      last_sync_at: Mapped[DateTime | None]
      inventory: Mapped[list["Inventory"]] = relationship(back_populates="bank", lazy="selectin")

Create /backend/models/inventory.py:
  class Inventory(BaseModel):
      __tablename__ = "inventory"
      bank_id: Mapped[str] = mapped_column(ForeignKey("blood_banks.id", ondelete="CASCADE"))
      blood_type: Mapped[str]
      rh_factor: Mapped[str]
      kell: Mapped[bool] = mapped_column(default=False)
      duffy: Mapped[bool] = mapped_column(default=False)
      kidd: Mapped[bool] = mapped_column(default=False)
      units_available: Mapped[int]
      collection_date: Mapped[DateTime]
      expiry_date: Mapped[DateTime]
      bank: Mapped["BloodBank"] = relationship(back_populates="inventory")

STEP 7 — ALERT MODEL:
Create /backend/models/alert.py:
  class Alert(BaseModel):
      __tablename__ = "alerts"
      patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
      alert_type: Mapped[str]
      severity: Mapped[str]  # info, warning, critical
      message: Mapped[str]
      recommended_action: Mapped[str]
      sent_at: Mapped[DateTime | None]
      resolved_at: Mapped[DateTime | None]

STEP 8 — ALEMBIC INITIALIZATION:
Run:
  alembic init db/migrations
  alembic revision --autogenerate -m "initial_schema"
  alembic upgrade head

STEP 9 — SEED SCRIPT:
Create /backend/db/seed_demo_data.py. This script MUST create:

A) Patient "Priya" (ID: 550e8400-e29b-41d4-a716-446655440001):
   - B+, age 9, kell_negative=False, alloimmunization_flag=False
   - hospital_id: "hospital-001"
   - enrolled_at: 2023-01-01
   - next_transfusion_predicted: 2024-11-03
   - hb_current: 7.2

B) Patient "Vikram" (ID: 550e8400-e29b-41d4-a716-446655440002):
   - B+, age 12, kell_negative=True, alloimmunization_flag=True
   - hospital_id: "hospital-001"
   - next_transfusion_predicted: 2024-11-07
   - hb_current: 6.8

C) 14-month Hb history for Priya (24+ readings):
   - Generate synthetic sawtooth: starting 2023-09-01
   - Pattern: post-transfusion Hb ~10.2-10.8, then linear decay to ~6.8-7.2 over 21 days
   - Add slight random variance (±0.3 g/dL)
   - Add seasonal dips: lower readings during July-Aug (monsoon)
   - Include post_transfusion=True readings with units_transfused=1 or 2
   - Compute hb_rise_per_unit for post-transfusion readings
   - CRITICAL: Last 4 readings should show gradual decline in Hb rise per unit: 2.1, 1.9, 1.7, 0.9 (this seeds the alloimmunization demo for Vikram, but make sure Priya's are normal)
   - Actually: Priya's readings should be NORMAL (consistent ~2.0 rise per unit). Vikram's should show the decline.

D) 8 Guardians for Priya:
   - Raju (primary): status=cooldown, last_donation=2024-09-10, next_eligible=2024-11-10, donation_count=12
   - Suresh (primary): status=pending, last_donation=2024-08-15, next_eligible=2024-10-15, donation_count=8
   - Anita (secondary): status=active, last_donation=2024-10-01, next_eligible=2024-11-01, donation_count=15
   - Mani (secondary): status=active
   - Preet (secondary): status=active
   - Kavya (rare_specialist): status=active
   - Ravi (rare_specialist): status=active
   - Divya (primary): status=active
   - All have compatibility_score, reliability_score, geography_score populated.

E) 5 Blood Banks in Hyderabad:
   - Apollo Blood Bank (lat 17.4065, lng 78.4772): last_sync=2024-10-19
   - Yashoda Hospital (lat 17.3984, lng 78.4857): last_sync=2024-10-20
   - KIMS Hospital (lat 17.3688, lng 78.5243): last_sync=2024-10-18
   - Care Hospital (lat 17.4420, lng 78.4956): last_sync=2024-10-19
   - Rainbow Children's (lat 17.4156, lng 78.4502): last_sync=2024-10-20

F) Inventory for Apollo (critical for demo):
   - B+ Kell-negative: 2 units, collected 2024-10-05, expiring 2024-11-05
   - A+ : 5 units, expiring 2024-11-10
   - O+ : 8 units, expiring 2024-11-08

G) Inventory for Yashoda:
   - B+ : 3 units, expiring 2024-11-12
   - O- : 2 units, expiring 2024-11-15

H) Pre-computed Forecast for Priya:
   - predicted_date: 2024-11-03
   - confidence_lower: 2024-11-01
   - confidence_upper: 2024-11-05
   - confidence_pct: 89.0
   - model_version: "prophet-v1"
   - status: "success"

STEP 10 — VERIFICATION:
Run seed script: python -m db.seed_demo_data
Verify in psql or pgAdmin:
  SELECT COUNT(*) FROM patients;  -- should be 2
  SELECT COUNT(*) FROM hb_readings WHERE patient_id = 'PRIYA_ID';  -- should be 24+
  SELECT COUNT(*) FROM guardians WHERE patient_id = 'PRIYA_ID';  -- should be 8
  SELECT COUNT(*) FROM blood_banks;  -- should be 5

ACCEPTANCE CRITERIA:
- [ ] Alembic migration applies cleanly to fresh database
- [ ] All 7 tables exist with correct columns and types
- [ ] Seed script creates exactly 2 patients, 24+ readings for Priya, 8 guardians, 5 banks, inventory at Apollo
- [ ] Priya's Hb readings form a realistic sawtooth pattern
- [ ] Vikram's recent post-transfusion readings show declining Hb rise per unit (2.1→1.9→1.7→0.9)
- [ ] All UUIDs match the DEMO constants shared with Person 1
- [ ] Commit to branch: feat/p2-phase1-database
```

---

### PHASE 2 — NOOR Engine: Prophet Forecasting & CUSUM Alloimmunization Detection
**Estimated Time:** 90 minutes  
**Goal:** Build the clinical brain — Hb forecaster, iron overload detector, and alloimmunization CUSUM. This is the most technically impressive layer.

```text
You are building Phase 2 of 6 for RaktaSetu NOOR backend. Phases 0-1 are complete. Database is seeded.

OBJECTIVE:
Build the NOOR Engine ML layer: Prophet-based Hb decay forecasting, and CUSUM-based alloimmunization detection. These must be medically credible and demo-ready.

DEMO NARRATIVE CONTEXT:
- Priya's Hb history has 24+ readings. Prophet must train on this and predict threshold crossing on Nov 3rd.
- Vikram's post-transfusion Hb rise per unit has dropped from 2.1 to 0.9 over 4 cycles. CUSUM must flag this.
- The /patients/:id/forecast endpoint must return the complete chart data in < 5 seconds.

COMPONENTS TO BUILD:

1. /backend/ml/noor_engine/hb_forecaster.py
Requirements:
  - Function signature: async def generate_forecast(patient_id: str, readings: list[HbReading]) -> ForecastResult | None
  - Use Facebook Prophet. Input: DataFrame with 'ds' (datetime) and 'y' (hb_value).
  - Model config: yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False
  - Add custom regressor for 'post_transfusion' (binary) to account for immediate spikes
  - If patient.age < 12, add custom regressor for growth_spurt (simplified: False for demo)
  - Forecast horizon: 60 days
  - Threshold: 7.0 g/dL (or 7.5 if pediatric)
  - Find the first forecast day where yhat crosses threshold. Return that as predicted_transfusion_date.
  - Confidence interval: use Prophet's yhat_lower and yhat_upper at the crossing date.
  - Confidence percentage: calculate based on how narrow the CI is (simplified: 89% for demo if >20 readings).
  - If < 3 readings: return None, reason="insufficient_data"
  - CRITICAL: Run Prophet in a thread pool to avoid blocking the event loop:
      loop = asyncio.get_event_loop()
      result = await loop.run_in_executor(None, _run_prophet, df)
  - Cache result in Redis with key "forecast:{patient_id}" and TTL 24h.
  - Return ForecastResult with historical_readings, forecast_points (next 60 days), predicted_date, confidence bounds, model_version="prophet-v1".

2. /backend/ml/noor_engine/alloimmunization.py
Requirements:
  - Function signature: def detect_alloimmunization(readings: list[HbReading]) -> AlloimmunizationResult
  - Input: Only post-transfusion readings, ordered by date.
  - Compute Hb rise per unit for each: (post_hb - pre_hb) / units_transfused
    - pre_hb is the most recent non-post-transfusion reading before this post-transfusion reading.
  - Baseline: average Hb-rise-per-unit from first 3 post-transfusion readings.
  - CUSUM calculation:
      - For each subsequent reading (starting from 4th), compute deviation = baseline - actual_rise
      - cumulative_sum += deviation - CUSUM_K (where K=0.5)
      - If cumulative_sum < CUSUM_H (where H=-3.0), flag as positive
  - Require minimum 4 post-transfusion readings to trigger.
  - False positive guard: if the reading_date falls within a known illness period (simplified: skip if no pre-reading exists within 7 days), skip.
  - Return: flag (bool), confidence (float 0-1), evidence (list of strings like "Cycle 4: expected 2.1, actual 0.9, deviation -1.2").

3. /backend/ml/noor_engine/iron_overload_detector.py (Simplified for demo)
Requirements:
  - Function signature: def detect_iron_overload(ferritin_readings: list[tuple[str, float]]) -> dict
  - For demo, this is a stub that returns a warning if the trend of last 3 ferritin values increases by >300 ng/mL total.
  - Actual ferritin data can be mocked in seed data.

4. /backend/api/routers/forecasts.py
Requirements:
  - GET /api/v1/patients/{patient_id}/forecast
  - Dependency inject: current_user (validate Supabase JWT), db_session
  - Query patient and their Hb readings from DB.
  - Check Redis cache first. If fresh (<24h), return cached forecast.
  - If not cached: call generate_forecast(patient_id, readings).
  - If result is None (insufficient data): return ApiResponse with success=True, data=None, error={code:"INSUFFICIENT_DATA", message:"At least 3 Hb readings required for forecasting."}
  - If result exists: run alloimmunization detection on the readings. If flagged, add alert_flags to response.
  - Run iron overload detection (if ferritin data exists). Add alert_flags.
  - Store result in DB (forecasts table) and Redis.
  - Return ApiResponse<ForecastResponse>.
  - Target latency: cached < 100ms, fresh < 5s.

5. /backend/schemas/forecast.py
Define Pydantic models exactly matching the shared API contracts:
  - ForecastResponse, ForecastPoint, AlertFlag, HbReadingSchema
  - All fields typed. Use datetime for ISO dates. Use float for Hb values.

6. /backend/tests/test_noor_engine.py
Write tests with fixture data:
  - test_prophet_forecast_sufficient_data: assert predicted_date is not None, confidence > 80
  - test_prophet_forecast_insufficient_data: assert returns None with reason
  - test_cusum_normal_patient: assert flag is False (use Priya's normal rise pattern)
  - test_cusum_alloimmunized_patient: assert flag is True (use Vikram's declining pattern)
  - test_cusum_early_stage: assert flag is False with only 3 readings (below MIN_READINGS_FOR_CUSUM)

ACCEPTANCE CRITERIA:
- [ ] Prophet model trains on Priya's 24 readings and predicts Nov 3rd crossing
- [ ] CUSUM flags Vikram's declining Hb rise pattern as alloimmunization=True
- [ ] CUSUM does NOT flag Priya's normal pattern
- [ ] /patients/:id/forecast endpoint returns complete response in < 5s (fresh) or < 100ms (cached)
- [ ] Redis caching works: second identical request is instant
- [ ] All 5 unit tests pass
- [ ] Swagger docs at /docs show ForecastResponse schema correctly
- [ ] Commit to branch: feat/p2-phase2-noor-engine
```

---

### PHASE 3 — Guardian Service: Circle Builder, Health Scoring & Mobilization
**Estimated Time:** 75 minutes  
**Goal:** Build the permanent guardian circle logic, health scoring algorithm, and T-14 mobilization state machine.

```text
You are building Phase 3 of 6 for RaktaSetu NOOR backend. Phases 0-2 are complete.

OBJECTIVE:
Build the RaktaMitra guardian network layer: circle construction algorithm, continuous health monitoring, and the T-14 mobilization sequence.

DEMO NARRATIVE CONTEXT:
- Priya has 8 guardians. The system must show coverage_score=100, engagement_score=94, resilience_score=87.
- Raju is in cooldown (last donation 40 days ago). Suresh is pending (messaged 4 days ago, replied this morning).
- Mobilization status is "active" with days_to_transfusion=14.
- When Suresh confirms, his status changes to "active" and the circle is fully confirmed.

COMPONENTS TO BUILD:

1. /backend/services/guardian_service.py
Requirements:
  - Function: build_circle(patient: Patient, candidate_donors: list[dict]) -> list[Guardian]
    - Scoring algorithm (exact weights from constants):
      - compatibility: 40 points (exact blood type match = 40, extended phenotype match = +20)
      - reliability: 20 points (past donations: up to 20, response latency: up to 20, average = reliability)
      - geography: 20 points (same city = 20, <50km = 10, >50km = 0)
      - phenotype: 20 points (for rare specialists only: Kell/Duffy/Kidd match)
    - Selection: top 3 primary, top 3 secondary, top 2 rare_specialist
    - If insufficient candidates, fill remaining slots with "empty" status guardians.
    - Return exactly 8 guardians.

  - Function: calculate_circle_health(guardians: list[Guardian]) -> dict
    - coverage_score: (non-empty guardians / 8) * 100
    - engagement_score: 100 - (avg_response_latency_hours / 72 * 100), clamped 0-100
    - resilience_score: probability circle survives 2 simultaneous unavailabilities.
      - Simplified: count how many pairs of guardians can be removed while still having ≥1 primary available. Resilience = (valid_pairs / total_pairs) * 100.
    - Return dict with all three scores.

  - Function: repair_circle(patient_id: str, db: AsyncSession) -> None
    - If coverage_score < 100 or resilience_score < 50, find replacement candidates.
    - For demo, this can be a stub that logs "Circle repair needed" and sets a flag.

2. /backend/services/mobilization_service.py
Requirements:
  - Function: trigger_mobilization(patient_id: str, predicted_date: date, db: AsyncSession) -> None
    - Calculate T-minus days = (predicted_date - today).days
    - If T == 10: send "soft ask" to primary guardians via messaging_service
    - If T == 7: if primary confirmed → notify hospital, reserve blood bank. If not → escalate to secondary.
    - If T == 3: final logistics confirmation to all confirmed guardians.
    - If T == 0: transfusion day reminder.
    - If T < 3 and < 3 guardians confirmed: status = "failed", trigger RaktaGrid search.
    - Store mobilization state in Redis with key "mobilization:{patient_id}".

  - Function: get_mobilization_status(patient_id: str) -> dict
    - Read from Redis or compute from guardian statuses.
    - Return: status, days_to_transfusion, confirmed_count, total_count.

3. /backend/api/routers/guardians.py
Requirements:
  - GET /api/v1/patients/{patient_id}/guardian-circle
    - Query patient + guardians from DB.
    - Compute circle health scores via guardian_service.
    - Get mobilization status via mobilization_service.
    - Return ApiResponse<GuardianCircleResponse>.
    - Target latency: < 200ms (use Redis cache for circle health if available).

  - POST /api/v1/patients/{patient_id}/guardian-circle/mobilize
    - Trigger mobilization sequence manually (for demo purposes).
    - Idempotent: if already active, return current status.
    - Return ApiResponse with updated mobilization status.

4. /backend/schemas/guardian.py
Define Pydantic models:
  - GuardianCircleResponse (coverage_score, engagement_score, resilience_score, mobilization_status, days_to_transfusion, guardians[])
  - GuardianSchema (all fields from model, phone masked as "****{last4}")
  - MobilizationStatus enum

5. /backend/tests/test_guardian_service.py
Tests:
  - test_circle_builder_selects_top_8: assert len(guardians) == 8
  - test_circle_health_perfect: all active → coverage=100, engagement>90, resilience>80
  - test_circle_health_degraded: 2 unavailable → coverage drops, resilience drops
  - test_mobilization_trigger_at_t10: assert messages queued for primary guardians

ACCEPTANCE CRITERIA:
- [ ] GET /patients/:id/guardian-circle returns 8 guardians with correct statuses
- [ ] Circle health scores calculate correctly (coverage=100 for Priya)
- [ ] Mobilization status shows "active" with days_to_transfusion=14
- [ ] POST /mobilize is idempotent
- [ ] Phone numbers are masked in API response (****1234)
- [ ] All guardian unit tests pass
- [ ] Commit to branch: feat/p2-phase3-guardian-service
```

---

### PHASE 4 — RaktaGrid: OR-Tools Inventory Optimization & Matching
**Estimated Time:** 90 minutes  
**Goal:** Build the city-wide blood inventory intelligence layer with expiry-aware matching using Google OR-Tools.

```text
You are building Phase 4 of 6 for RaktaSetu NOOR backend. Phases 0-3 are complete.

OBJECTIVE:
Build RaktaGrid — the most technically ambitious layer. Use Google OR-Tools CP-SAT to solve a multi-objective optimization problem: match predicted patient needs to available blood bank inventory while minimizing waste, wait time, and distance.

DEMO NARRATIVE CONTEXT:
- Vikram (B+, Kell-negative, alloimmunization) needs blood on Nov 7.
- His guardian circle is fully in cooldown.
- Apollo Blood Bank has 2 B+ Kell-negative units expiring Nov 5.
- OR-Tools must find this match and recommend transfer.
- City health score for Hyderabad should be 72/100 (yellow-green).

COMPONENTS TO BUILD:

1. /backend/ml/raktagrid/phenotype_matcher.py
Requirements:
  - Function: is_compatible(blood_group: str, phenotype: dict, patient: Patient) -> bool
  - Standard ABO/Rh compatibility matrix (from constants).
  - If patient.alloimmunization_flag is True: require extended phenotype match.
    - Check patient.kell_negative → donor must be kell_negative
    - Check patient.duffy_negative → donor must be duffy_negative
    - Check patient.kidd_negative → donor must be kidd_negative
  - Return True only if all constraints satisfied.

2. /backend/ml/raktagrid/inventory_matcher.py (THE OPTIMIZER)
Requirements:
  - Function signature: def optimize_matches(city_code: str, patients: list[Patient], inventory: list[Inventory], banks: list[BloodBank]) -> list[InventoryMatch]
  - Use OR-Tools CP-SAT solver (from ortools.sat.python import cp_model).
  - Variables: for each (patient, inventory_item) pair, create a boolean x[p,i].
  - Constraints:
    1. Each patient assigned at most one inventory item (or up to their needed units).
    2. Each inventory item assigned to at most one patient.
    3. Compatibility: x[p,i] = 0 if blood types incompatible OR phenotype mismatch OR expiry < predicted_transfusion_date - 2 days buffer.
    4. If patient has alloimmunization_flag, enforce extended phenotype matching.
  - Objective (multi-objective, weighted sum):
    - Maximize: sum(x[p,i]) * 1000  (maximize matches)
    - Minimize: sum(x[p,i] * days_until_expiry) * 10  (prefer units expiring sooner)
    - Minimize: sum(x[p,i] * distance_km) * 1  (prefer closer banks)
    - Combine into single objective: maximize(1000*matches - 10*expiry_urgency - 1*distance)
  - Solver settings: max_time_in_seconds=30, num_search_workers=4.
  - If solver.Status.OPTIMAL or Status.FEASIBLE: extract assignments.
  - If timeout: return partial matches found so far.
  - Output: list of InventoryMatch objects with status="pending".

3. /backend/services/bank_sync_service.py
Requirements:
  - Function: async def sync_bank_inventory(bank_id: str, db: AsyncSession) -> None
    - For demo: reads from DB and updates last_sync_at.
    - Stub for future API ingestion.
  - Function: async def parse_whatsapp_inventory(message: str) -> list[dict]
    - Stub using regex to parse simple WhatsApp messages like "Apollo: B+ 3 units, O- 2 units".
    - For demo, return hardcoded parsed data.

4. /backend/api/routers/grid.py
Requirements:
  - GET /api/v1/grid/city/{city_code}
    - Query all blood banks in city + their inventory + all patients in city with upcoming transfusions.
    - Run inventory_matcher.optimize_matches().
    - Compute city_health_score: weighted average of coverage_by_type scores.
    - Cache result in Redis with TTL 6h, key "grid:{city_code}".
    - Return ApiResponse<CityInventoryResponse>.
    - Target latency: cached < 200ms, fresh < 30s.

  - POST /api/v1/grid/matches/{match_id}/approve
    - Update match status to "approved" in DB (or mock for demo).
    - Trigger notification to bank coordinator (stub for demo).
    - Return ApiResponse<InventoryMatch>.

  - POST /api/v1/grid/banks/{bank_id}/inventory
    - Bulk upsert inventory items (for demo data loading).
    - Return ApiResponse with count of items updated.

5. /backend/schemas/grid.py
Define Pydantic models:
  - CityInventoryResponse, BloodBankNodeSchema, InventoryMatchSchema, TypeCoverageSchema
  - All fields typed, using datetime for dates, float for lat/lng.

6. /backend/tests/test_inventory_matcher.py
Tests:
  - test_simple_match: 1 patient, 1 compatible unit → 1 match
  - test_no_match_incompatible: patient A+, unit O- → 0 matches
  - test_expired_unit_excluded: unit expires before transfusion date → 0 matches
  - test_rare_type_shortage: Kell-negative patient, no Kell-negative units → 0 matches, critical alert
  - test_ortools_timeout: large problem, verify returns within 30s

ACCEPTANCE CRITERIA:
- [ ] OR-Tools finds the Apollo→Vikram match for 2 Kell-negative units
- [ ] Incompatible units are excluded by constraint
- [ ] Expired units (expiry < transfusion_date - 2 days) are excluded
- [ ] GET /grid/city/HYD returns 5 banks + 1 active match for Vikram
- [ ] City health score computes to ~72/100
- [ ] POST /matches/:id/approve updates status and returns success
- [ ] All inventory matcher tests pass
- [ ] Commit to branch: feat/p2-phase4-raktagrid-optimizer
```

---

### PHASE 5 — AI Messaging: Claude, Twilio, Sarvam & Saathi Chatbot
**Estimated Time:** 60 minutes  
**Goal:** Integrate Claude for personalized messages, Twilio for WhatsApp delivery, Sarvam for voice. Build Saathi chatbot stub.

```text
You are building Phase 5 of 6 for RaktaSetu NOOR backend. Phases 0-4 are complete.

OBJECTIVE:
Build the AI messaging pipeline that makes guardians feel like they're in a relationship, not a transaction. This is the emotional intelligence layer.

DEMO NARRATIVE CONTEXT:
- Suresh receives a WhatsApp message in Telugu: "Suresh garu, Priya's transfusion is on November 3rd. Last time you donated, her Hb went from 6.8 to 10.4. She went back to school on Tuesday. Can you confirm your slot?"
- After transfusion, Priya's mother records a voice note. Sarvam translates it to Telugu. Twilio sends it to Suresh.
- Saathi chatbot answers guardian questions: "When is my next eligible donation date?"

COMPONENTS TO BUILD:

1. /backend/services/messaging_service.py
Requirements:
  - Function: async def generate_guardian_message(guardian: Guardian, patient: Patient, message_type: str, context: dict) -> str
    - Use Anthropic Claude 3.5 Sonnet (model="claude-3-5-sonnet-20241022").
    - System prompt: "You are a compassionate clinical coordinator for RaktaSetu NOOR, a Thalassemia care platform. Write brief, warm, personalized messages to blood donors who are guardians for specific children. Always reference the child by name. Include specific clinical outcomes when available. Write in the guardian's preferred language. Max 3 sentences for WhatsApp. Never use generic donor language."
    - Message types:
      - "t10_soft_ask": "Priya's transfusion is on {date}. Are you available?"
      - "t7_logistics": "Confirmed! Please arrive at {hospital} at {time}. Bring ID."
      - "post_donation_outcome": "Because of you, {patient}'s Hb went from {pre} to {post}. She went back to school on {day}."
      - "monthly_update": "{patient} got {score} in her math test. Just wanted you to know."
      - "birthday_wish": "Happy birthday from {patient}'s family!"
    - Call Claude API with max_tokens=150, temperature=0.7.
    - Cache generated messages in Redis to avoid duplicate API calls (TTL 1h).
    - If Claude API fails (rate limit, timeout): fallback to template messages (pre-written in the function).

  - Function: async def send_whatsapp_message(phone: str, message: str) -> dict
    - Use Twilio Python SDK.
    - from_ = settings.twilio_whatsapp_from
    - to = f"whatsapp:{phone}"
    - Log delivery attempt with structlog.
    - For demo: if Twilio credentials are missing or trial credit exhausted, log "MOCK_SEND" and return success.

2. /backend/services/voice_service.py
Requirements:
  - Function: async def translate_voice_note(audio_bytes: bytes, source_lang: str, target_lang: str) -> str
    - Stub for Sarvam AI integration.
    - For demo: return a hardcoded translated message: "Thank you Suresh uncle. Because of you I feel strong again. — Priya"
    - Include comments showing exact Sarvam API endpoint and payload structure for post-hackathon implementation.

  - Function: async def text_to_speech(text: str, language: str) -> bytes
    - Stub returning empty bytes with TODO comment for Sarvam TTS.

3. /backend/api/routers/alerts.py (or add to patients.py)
Requirements:
  - POST /api/v1/patients/{patient_id}/alerts/{alert_id}/notify
    - Trigger notification for a specific alert.
    - Route to appropriate service based on alert type and guardian preference.
    - Return ApiResponse with delivery status.

4. SAATHI CHATBOT STUB:
Create /backend/api/routers/chatbot.py:
  - POST /api/v1/chatbot/message
    - Request: { message: string, patient_id?: string, guardian_id?: string, language: string }
    - Hardcoded intent matching:
      - If message contains "next eligible" or "donation date": return calculated next eligible date from guardian record.
      - If message contains "alloimmunization": return simplified explanation from constants.
      - If message contains "Hb" or "hemoglobin": return patient's current Hb.
      - Default: "I'm Saathi, your RaktaSetu assistant. I can help with donation dates, patient updates, and general questions."
    - For demo, this proves the concept without a full LLM integration.

5. /backend/tests/test_messaging_service.py
Tests (mock external APIs using unittest.mock.patch):
  - test_generate_message_uses_claude: verify Claude API called with correct system prompt
  - test_generate_message_fallback_on_claude_failure: verify template fallback
  - test_send_whatsapp_uses_twilio: verify Twilio client called

ACCEPTANCE CRITERIA:
- [ ] Claude message generation returns personalized text referencing Priya by name
- [ ] Message fallback works when ANTHROPIC_API_KEY is missing
- [ ] Twilio WhatsApp send logs delivery attempt (mock mode acceptable)
- [ ] Saathi chatbot answers "next eligible date" correctly for Raju
- [ ] Saathi chatbot answers "what is alloimmunization" with plain-language explanation
- [ ] All messaging tests pass with mocked external APIs
- [ ] Commit to branch: feat/p2-phase5-ai-messaging
```

---

### PHASE 6 — Background Workers, Deployment & Final Integration
**Estimated Time:** 60 minutes  
**Goal:** Wire up APScheduler workers, create Dockerfile, configure Railway, run full integration tests.

```text
You are building Phase 6 of 6 for RaktaSetu NOOR backend. All previous phases are complete.

OBJECTIVE:
Finalize the backend with background workers, production deployment config, and integration verification. This phase ensures the demo runs reliably on production infrastructure.

TASKS:

1. BACKGROUND WORKERS:
Create /backend/workers/scheduler.py:
  - Initialize APScheduler with AsyncIOScheduler.
  - Register jobs:
    - hb_forecast_worker: daily at 02:00, calls generate_forecast for all patients
    - alloimmunization_worker: runs immediately after any post-transfusion Hb reading is logged
    - circle_health_worker: hourly, recalculates all circle health scores
    - inventory_match_worker: every 6 hours, runs optimize_matches for all cities
  - For demo: workers can be triggered manually via API endpoints or run once at startup.

Create /backend/workers/hb_forecast_worker.py:
  - Query all patients with ≥3 Hb readings.
  - For each: call generate_forecast, store in DB + Redis.
  - Log: job_name, patient_count, success_count, failure_count, duration_ms.

Create /backend/workers/alloimmunization_worker.py:
  - Triggered by event (post-transfusion reading logged) or manual.
  - Run CUSUM on patient's last 6 post-transfusion readings.
  - If flagged: create Alert record, notify doctor (stub), update patient.alloimmunization_flag.

Create /backend/workers/circle_health_worker.py:
  - Query all guardian circles.
  - Recalculate coverage, engagement, resilience scores.
  - If any score < threshold: log repair needed, trigger silent repair (stub).

Create /backend/workers/inventory_match_worker.py:
  - Query all cities with registered blood banks.
  - For each city: run optimize_matches, cache results in Redis (TTL 6h).
  - Update city_health_score in Redis.

2. DOCKERFILE:
Create /backend/Dockerfile:
  FROM python:3.11-slim
  WORKDIR /app
  RUN apt-get update && apt-get install -y gcc g++ python3-dev libpq-dev && rm -rf /var/lib/apt/lists/*
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  CMD alembic upgrade head && uvicorn api.main:app --host 0.0.0.0 --port $PORT

3. RAILWAY CONFIG:
Create /backend/railway.json:
  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": { "builder": "DOCKERFILE", "dockerfilePath": "backend/Dockerfile" },
    "deploy": {
      "startCommand": "alembic upgrade head && uvicorn api.main:app --host 0.0.0.0 --port $PORT",
      "healthcheckPath": "/health",
      "healthcheckTimeout": 30,
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3
    }
  }

4. CI/CD PIPELINE:
Create /.github/workflows/backend.yml:
  - Trigger on push to main or dev/person2-backend, when backend/** or shared/** changes.
  - Jobs:
    1. test: runs on ubuntu-latest with postgres:16 and redis:7 services.
       - Install Python 3.11, pip install -r requirements.txt
       - Run: alembic upgrade head && pytest tests/ -v --cov=. --cov-report=xml
       - Env: DATABASE_URL, DATABASE_URL_SYNC, REDIS_URL, APP_ENV=test
    2. deploy: depends on test, runs only on main.
       - Install Railway CLI, run railway up --service backend

5. PRODUCTION ENVIRONMENT VARIABLES:
Document all required Railway variables (copy from .env.example, fill with production values):
  - DATABASE_URL (from Supabase connection string)
  - REDIS_URL (from Upstash)
  - SUPABASE_URL, SUPABASE_SERVICE_KEY
  - ANTHROPIC_API_KEY
  - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
  - SARVAM_API_KEY
  - FRONTEND_URL (Vercel production URL)
  - APP_SECRET_KEY (generate with secrets.token_hex(32))

6. INTEGRATION VERIFICATION:
Run these exact commands and verify outputs:
  curl https://your-railway-app.railway.app/health
  curl -H "Authorization: Bearer $TOKEN" https://your-railway-app.railway.app/api/v1/patients
  curl -H "Authorization: Bearer $TOKEN" https://your-railway-app.railway.app/api/v1/patients/PRIYA_ID/forecast
  curl -H "Authorization: Bearer $TOKEN" https://your-railway-app.railway.app/api/v1/patients/PRIYA_ID/guardian-circle
  curl -H "Authorization: Bearer $TOKEN" https://your-railway-app.railway.app/api/v1/grid/city/HYD

7. DEMO-SPECIFIC PREPARATION:
  - Ensure seed data is loaded in production Supabase.
  - Ensure Priya's forecast shows Nov 3rd.
  - Ensure Suresh's guardian status is "pending" (for live confirmation demo).
  - Ensure Vikram's alloimmunization_flag is True.
  - Ensure Apollo Bank has 2 Kell-negative units expiring Nov 5.
  - Ensure city health score is 72/100.
  - Create a "demo reset" endpoint or script that restores all data to initial state.

8. DOCUMENTATION:
Update /backend/README.md with:
  - Local setup instructions
  - Environment variable table
  - API endpoint summary
  - Testing instructions
  - Deployment instructions

ACCEPTANCE CRITERIA:
- [ ] All 4 background workers run without errors (test via manual trigger)
- [ ] Dockerfile builds successfully: docker build -t raktasetu-backend ./backend
- [ ] Railway deployment succeeds and /health returns 200
- [ ] Production API responds to all 5 integration curl commands above
- [ ] Seed data is present in production database
- [ ] Demo state is pre-configured (Suresh=pending, Vikram=alloimmunization, Apollo=2 Kell-neg units)
- [ ] CI/CD pipeline passes on GitHub Actions
- [ ] Backend tests pass in CI with coverage > 70%
- [ ] Commit to branch: feat/p2-phase6-deployment
- [ ] Merge all p2 branches to dev/person2-backend, then PR to main
```

---

## 5. API Contracts (Exposed by Person 2)

> **Prefix:** `/api/v1`  
> **Envelope:** All responses follow `ApiResponse<T>`  
> **Auth:** `Authorization: Bearer <supabase_access_token>` (validated via `python-jose`)

### Standard Envelope (Python)
```python
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar("T")

class ApiError(BaseModel):
    code: str
    message: str
    detail: Optional[str] = None

class ResponseMeta(BaseModel):
    page: Optional[int] = None
    per_page: Optional[int] = None
    total: Optional[int] = None
    request_id: Optional[str] = None
    generated_at: Optional[str] = None

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ApiError] = None
    meta: Optional[ResponseMeta] = None
```

### POST /patients
```python
class PatientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    age: int = Field(ge=0, le=120)
    blood_type: Literal["A", "B", "AB", "O"]
    rh_factor: Literal["+", "-"]
    kell_negative: bool = False
    duffy_negative: bool = False
    kidd_negative: bool = False
    hospital_id: str

# Response: ApiResponse[PatientDetail]
```

### GET /patients/:id/forecast
```python
class ForecastResponse(BaseModel):
    patient_id: str
    historical_readings: list[HbReadingSchema]
    forecast_points: list[ForecastPoint]
    predicted_transfusion_date: date
    confidence_lower: date
    confidence_upper: date
    confidence_pct: float = Field(ge=0, le=100)
    alert_flags: list[AlertFlag]
    model_version: str
    generated_at: datetime
    status: Literal["success", "insufficient_data", "model_error", "cached"]

# Triggers Prophet model run. Returns cached result if < 24h old.
```

### POST /patients/:id/hb-reading
```python
class HbReadingCreate(BaseModel):
    hb_value: float = Field(ge=0.0, le=20.0)
    reading_date: date
    post_transfusion: bool
    units_transfused: Optional[int] = Field(None, ge=1, le=10)

# Stores reading, triggers background alloimmunization check.
# Response: ApiResponse[HbReadingSchema]
```

### GET /patients/:id/guardian-circle
```python
class GuardianCircleResponse(BaseModel):
    patient_id: str
    coverage_score: float = Field(ge=0, le=100)
    engagement_score: float = Field(ge=0, le=100)
    resilience_score: float = Field(ge=0, le=100)
    mobilization_status: Literal["idle", "active", "confirmed", "failed", "not_needed"]
    days_to_transfusion: Optional[int]
    guardians: list[GuardianSchema]

# Returns circle with real-time status from Redis + DB.
```

### POST /patients/:id/guardian-circle/mobilize
```python
# Triggers T-14 mobilization sequence. Idempotent.
# Response: ApiResponse[GuardianCircleResponse]
```

### GET /grid/city/:city_code
```python
class CityInventoryResponse(BaseModel):
    city_code: str
    city_health_score: float = Field(ge=0, le=100)
    health_status: Literal["green", "yellow", "red"]
    last_optimized_at: datetime
    blood_banks: list[BloodBankNodeSchema]
    active_matches: list[InventoryMatchSchema]
    coverage_by_type: dict[str, TypeCoverageSchema]

# Runs OR-Tools optimization for all patients in city. Cached 6h.
```

### POST /grid/matches/:match_id/approve
```python
# Approves recommended transfer. Triggers notification.
# Response: ApiResponse[InventoryMatchSchema]
```

### POST /grid/banks/:bank_id/inventory
```python
class InventoryBulkUpsert(BaseModel):
    items: list[InventoryItemCreate]

# Bulk upsert inventory from blood bank (for simulation/demo).
# Response: ApiResponse[int] — count of items updated
```

### GET /health
```python
# Returns 200 with system status:
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected",
  "workers": {
    "hb_forecaster": "running",
    "circle_health": "running",
    "inventory_matcher": "running"
  },
  "uptime_seconds": 3600
}
```

---

## 6. Integration Instructions

### What Person 2 Delivers to Person 1
1. Running API server at `http://localhost:8000`
2. Swagger docs at `http://localhost:8000/docs`
3. Updated `shared/contracts/api.schema.json` after any endpoint change
4. Seeded database with demo patient data (Priya, Vikram, 5 banks)

### Seed Data Verification Commands
```bash
# Person 2 runs these before declaring "Hour 4 integration ready":
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"1.0.0"}

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/patients
# Expected: 2 patients (Priya, Vikram)

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/patients/$PRIYA_ID/forecast
# Expected: Forecast with 14-month history, predicted_date "2024-11-03", confidence 89%

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/patients/$PRIYA_ID/guardian-circle
# Expected: 8 guardians, Raju=cooldown, Suresh=pending

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/grid/city/HYD
# Expected: 5 blood banks, 1 active match for Vikram at Apollo
```

### Integration Checkpoint Protocol
| Hour | Trigger | Person 2 Action | Person 1 Action |
|------|---------|-----------------|-----------------|
| 2 | Contracts frozen | Commit api.schema.json | Generate api.types.ts from schema |
| 4 | `/patients` + `/forecast` working | Push to dev branch, merge to main | Switch MSW→real API for patients |
| 6 | `/guardian-circle` working | Push guardian endpoints | Integrate GuardianConstellation |
| 8 | `/grid/city/:code` working | Push grid endpoints | Integrate CityBloodMap |
| 10 | Full E2E | Verify all endpoints + seed data | Full demo flow rehearsal |

### Shared Environment Variables
Both persons need these in their respective `.env` files:
```bash
# Shared (agree on values at hackathon start)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=xxxx
DATABASE_URL=postgresql://...

# Person 1 only
NEXT_PUBLIC_API_URL=http://localhost:8000   # dev
NEXT_PUBLIC_API_URL=https://api.railway.app # prod
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Person 2 only
DATABASE_URL=postgresql+asyncpg://...       # async for SQLAlchemy
DATABASE_URL_SYNC=postgresql://...          # sync for Alembic
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6380
SUPABASE_SERVICE_KEY=xxx                    # NEVER expose to frontend
ANTHROPIC_API_KEY=sk-ant-xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
SARVAM_API_KEY=xxx
FRONTEND_URL=http://localhost:3000          # dev
FRONTEND_URL=https://raktasetu-noor.vercel.app # prod
APP_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_hex(32))">
```

---

## 7. Software Requirements Specification (Person 2)

### Functional Requirements
- **FR-1 (NOOR Engine):** Maintain per-patient Prophet time-series model. Regenerate forecasts daily via worker. Detect iron overload from ferritin trends. Detect potential alloimmunization using CUSUM on Hb-rise-per-unit. Generate clinical alert objects with severity and recommended action. Cache forecasts in Redis (TTL 24h).
- **FR-2 (Guardian Management):** Score and rank guardian candidates on compatibility (40%), reliability (20%), geography (20%), phenotype (20%). Construct circles of exactly 8 guardians (3 primary, 3 secondary, 2 rare). Compute coverage, engagement, resilience scores continuously. Detect degraded circles and repair silently. Execute T-10/T-7/T-3/T-0 mobilization sequence automatically.
- **FR-3 (AI Messaging):** Generate personalized WhatsApp messages via Claude API. Translate messages via Sarvam AI to guardian's preferred language. Record all message delivery attempts and outcomes. Fallback to template messages if Claude API unavailable.
- **FR-4 (RaktaGrid):** Ingest blood bank inventory via API or WhatsApp submission. Run expiry-aware matching optimization every 6 hours. Switch to extended phenotype matching for alloimmunized patients. Generate City Blood Health Score updated daily. Support coordinator approval workflow for recommended transfers.
- **FR-5 (Saathi Chatbot):** Answer guardian questions about donation eligibility, patient status, and medical terms. Hardcoded intent matching for demo; LLM integration for post-hackathon.

### Non-Functional Requirements
- **NFR-1 (Performance):** All API endpoints: P95 < 500ms (excluding ML inference). Forecast generation: < 5s per patient. OR-Tools optimization: < 30s for 100 banks × 50 patients.
- **NFR-2 (Reliability):** Background workers must not crash on individual patient failures. All external API calls wrapped in retry with exponential backoff (max 3 retries). DB connection pool: min 5, max 20 connections.
- **NFR-3 (Observability):** All requests logged with: request_id, patient_id, endpoint, latency_ms, status. All ML jobs logged with: job_name, patient_count, duration, success_count, failure_count. All messaging events logged with: guardian_id, message_type, delivery_status.
- **NFR-4 (Security):** Validate Supabase JWT on all endpoints except /health. Service key never exposed — only used server-side. All DB queries parameterized via SQLAlchemy ORM. Patient Hb values encrypted at rest via Supabase column encryption (demo: document as planned). CORS whitelist: only frontend domain + localhost in dev.

### Edge Cases
- Patient with < 3 Hb readings: return forecast=None, reason="insufficient_data". Log warning.
- Prophet fails to converge: return last cached forecast, log error, alert admin.
- All 8 guardian slots empty: return coverage_score=0, trigger urgent circle-building alert.
- OR-Tools timeout: return partial matches found so far, log timeout, set status="partial".
- Claude API rate limit: queue message, retry in 60s, fall back to template.
- Blood bank inventory not updated in > 24h: flag bank as "stale", exclude from matches, notify admin.
- Alloimmunization flag + no phenotype matches in city: send 14-day-advance alert to NGO coordinator with instructions to contact regional specialized center.
- Twilio delivery failure: log failure, retry once, queue for manual follow-up.

### Performance Targets
| Operation | Target | Measurement |
|-----------|--------|-------------|
| GET /patients | < 200ms | Cached in Redis |
| GET /patients/:id/forecast (cached) | < 100ms | Redis hit |
| GET /patients/:id/forecast (fresh) | < 5s | Prophet async |
| GET /grid/city/:code (cached) | < 200ms | Redis hit |
| OR-Tools optimization (fresh) | < 30s | CP-SAT timeout |
| WhatsApp message delivery | < 10s | Twilio API |
| Background worker daily run | < 10 min | 500 patients |

---

## 8. Git Workflow & Commit Standards

### Branch Strategy
```
main (protected)
└── dev/person2-backend
    ├── feat/p2-phase0-scaffold
    ├── feat/p2-phase1-database
    ├── feat/p2-phase2-noor-engine
    ├── feat/p2-phase3-guardian-service
    ├── feat/p2-phase4-raktagrid-optimizer
    ├── feat/p2-phase5-ai-messaging
    └── feat/p2-phase6-deployment
```

### Commit Format
```
feat(noor): implement Prophet Hb decay forecasting with confidence bands
feat(ml): add CUSUM alloimmunization detection on Hb-rise-per-unit
feat(grid): implement OR-Tools CP-SAT inventory optimizer
feat(guardian): build circle health scoring algorithm
fix(forecast): handle Prophet convergence failure gracefully
chore(deps): pin numpy to 1.26.4 for Prophet compatibility
docs(api): add Swagger descriptions to all grid endpoints
```

### PR Requirements
- PR description: What changed, Why, How to test
- No PR > 400 lines unless structural refactor
- One reviewer approval required (Person 1 for shared files, self for backend-only)
- CI must pass (ruff lint, mypy type-check, pytest, build)

---

*End of Person 2 Implementation Package. Execute phases sequentially. Do not skip.*
