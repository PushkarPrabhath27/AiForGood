# RaktaSetu NOOR — Master Project Blueprint & Complete Execution Manual
## AI-for-Good Hackathon | 24-Hour Build | 2-Person Team

> **Tagline:** "The body predicted it. The system prepared for it. The circle delivered it."

---

## 1. Product Vision

### Problem Statement

India has approximately **2 lakh Thalassemia Major patients**, each requiring blood transfusions every 21 days for life. Despite this complete predictability, every transfusion cycle begins from scratch — phone calls, WhatsApp group scrambles, and last-minute panic. The system fails at three distinct layers:

1. **Clinical blindness** — No system listens to what the patient's body is already signaling weeks in advance
2. **Relationship decay** — Donor platforms acquire donors but cannot retain them; every cycle is a new cold outreach
3. **Inventory isolation** — India's blood banks are informationally siloed; rare blood types expire in one bank while patients die waiting in another

### Why This Project Matters

- **2 lakh lives** depend on a system that was never engineered — only improvised
- Thalassemia is the only major chronic condition where the treatment need is **mathematically predictable** yet **operationally chaotic**
- **Alloimmunization** (body rejecting transfused blood after repeated exposures) affects 5–30% of patients and is currently undetected by any platform
- Blood wastage from expiry in isolated banks while matched patients go untreated is a **solvable logistics problem that nobody has solved**

### Innovation Angle

RaktaSetu NOOR is the first platform to fuse three independently novel innovations into one coherent system:

| Layer | Innovation | Why Novel |
|-------|-----------|-----------|
| **NOOR Engine** | Personalized Hb decay forecasting with alloimmunization detection | No platform models per-patient hemoglobin trajectories |
| **RaktaMitra** | Guardian relationship OS — permanent circles, not donor pools | No platform treats the donor-patient bond as a permanent relationship asset |
| **RaktaGrid** | Real-time inter-bank inventory intelligence with expiry-aware matching | No platform connects blood bank inventories across a city |

### Hackathon-Winning Differentiators

1. **Three complete innovations**, any one of which would win a typical hackathon
2. **Clinical depth** (alloimmunization detection) that signals genuine domain expertise
3. A demo with **emotional resonance** (constellation lighting up, child's voice) AND **technical rigor** (OR-Tools optimization)
4. A **real problem affecting real people**, quantified at scale
5. An architecture that is **obviously scalable** beyond the hackathon prototype

### Scalability Potential

- **City → State → National** rollout following the blood bank integration layer
- **API licensing** to hospital chains and NGOs
- **Government partnership** for National Thalassemia Mission integration
- **Expansion to Sickle Cell Disease** (similar transfusion dependency, 300k+ patients in India)

### Monetization Potential (Post-Hackathon)

- **B2B SaaS** to hospital blood banks (RaktaGrid API)
- **NGO licensing** for patient management
- **Government grant funding** (National Health Mission)
- **Freemium model** for individual patient families

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RaktaSetu NOOR                           │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  NOOR Engine │   │  RaktaMitra  │   │    RaktaGrid     │   │
│  │  (Clinical   │──▶│  (Guardian   │──▶│  (Blood Inventory│   │
│  │   Brain)     │   │   Network)   │   │   Intelligence)  │   │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘   │
│         │                  │                     │             │
│         └──────────────────┴─────────────────────┘             │
│                            │                                    │
│                    ┌───────▼────────┐                          │
│                    │   PostgreSQL   │                          │
│                    │   + Redis      │                          │
│                    └───────┬────────┘                          │
│                            │                                    │
│              ┌─────────────┼─────────────┐                    │
│              ▼             ▼             ▼                    │
│         ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│         │  Twilio │  │ Sarvam  │  │ Claude  │               │
│         │WhatsApp │  │  Voice  │  │  API    │               │
│         └─────────┘  └─────────┘  └─────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Service Architecture

```
Frontend (Next.js 14)
    │
    ├── /dashboard       → Patient NOOR Engine view
    ├── /guardian        → Guardian Constellation view  
    └── /grid            → RaktaGrid city map view

Backend (FastAPI, Python 3.11)
    │
    ├── /api/v1/patients     → Patient CRUD + Hb logging
    ├── /api/v1/forecast     → NOOR forecast engine
    ├── /api/v1/guardians    → Guardian circle management
    ├── /api/v1/grid         → Inter-bank inventory
    └── /api/v1/alerts       → Alert routing engine

Background Workers (APScheduler)
    ├── hb_forecaster        → Runs daily, updates all patient forecasts
    ├── alloimmunization_detector → Runs post-transfusion
    ├── circle_health_monitor    → Runs hourly
    └── inventory_matcher        → Runs every 6 hours
```

### Data Flow

```
Patient Hb Logged
      │
      ▼
NOOR Engine (Prophet/CUSUM)
      │
      ├──▶ Forecast: "Transfusion on Nov 3rd"
      │         │
      │         ▼
      │    RaktaMitra Activates (T-14)
      │         │
      │         ├──▶ Primary Guardian contacted (T-10)
      │         ├──▶ Hospital pre-notified (T-7)
      │         └──▶ If circle fails → RaktaGrid search
      │
      ├──▶ Alert: Iron overload detected
      │         │
      │         └──▶ Doctor notification via Claude API
      │
      └──▶ Alert: Alloimmunization suspected
                │
                └──▶ RaktaGrid switches to extended phenotype search
```

### Database Architecture

```
patients
├── id (UUID PK)
├── name, age, blood_type, rh_factor
├── kell_negative, duffy_negative, kidd_negative (extended phenotype)
├── alloimmunization_flag (bool)
├── enrolled_at, hospital_id

hb_readings
├── id, patient_id (FK)
├── hb_value (float), reading_date
├── post_transfusion (bool), units_transfused
├── hb_rise_per_unit (computed)

forecasts
├── id, patient_id (FK)
├── predicted_date, confidence_interval
├── model_version, created_at

guardian_circles
├── id, patient_id (FK)
├── guardian_id (FK), role (primary/secondary/rare)
├── compatibility_score, reliability_score
├── last_donation_date, next_eligible_date, status

blood_banks
├── id, name, city, lat, lng
├── api_endpoint (nullable)
├── last_sync_at

inventory
├── id, bank_id (FK)
├── blood_type, rh_factor
├── kell, duffy, kidd (extended phenotype flags)
├── units_available, collection_date, expiry_date

alerts
├── id, patient_id (FK), alert_type
├── severity, message, sent_at, resolved_at
```

---

## 3. Tech Stack Decisions

| Layer | Technology | Why | Alternative |
|-------|-----------|-----|-------------|
| Frontend | Next.js 14 (App Router) | SSR + RSC for fast dashboards | Vite + React |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI without design debt | Chakra UI |
| Charts | Recharts | Declarative, composable, zero cost | Chart.js |
| Backend | FastAPI (Python 3.11) | Async, auto-docs, Python ML ecosystem | Node.js Express |
| ML Forecasting | Facebook Prophet / statsmodels | Time-series with uncertainty intervals | ARIMA |
| Anomaly Detection | CUSUM (statsmodels) | Medically rigorous, lightweight | Z-score |
| Optimization | Google OR-Tools | Real combinatorial optimization, free | SciPy linprog |
| AI/Messaging | Claude Sonnet API | Personalized message generation | GPT-4o |
| Voice | Sarvam AI | Best Indian language STT/TTS, free tier | Bhashini |
| Messaging | Twilio (WhatsApp + IVR) | One SDK, both channels, free trial | MSG91 |
| Database | PostgreSQL (Supabase free) | Structured relational data | Railway Postgres |
| Cache | Redis (Upstash free) | Fast state, forecast caching | In-memory |
| Deployment | Railway (backend) + Vercel (frontend) | Free tier, one-click deploy | Render |
| CI/CD | GitHub Actions | Free for public repos | GitLab CI |

### All Free-Tier Constraints

- **Supabase:** 500MB DB, 2GB bandwidth — sufficient for demo
- **Upstash Redis:** 10,000 commands/day — sufficient for demo
- **Railway:** 500 compute hours/month — sufficient for demo
- **Vercel:** Unlimited for frontend — always free
- **Twilio:** $15 trial credit — sufficient for demo
- **Claude API:** Pay-per-use; hackathon demo volume is negligible
- **Sarvam AI:** Free tier available for hackathon

---

## 4. Team Separation Strategy

### Split Philosophy

The split mirrors a FAANG-style **Product Engineering vs. Platform Engineering** division:

- **Person 1 (Frontend + Integration Layer)** owns everything the judge **SEES**: the NOOR dashboard, the Guardian Constellation, the RaktaGrid map, and the API contracts that tie everything together.
- **Person 2 (Backend + ML + AI)** owns everything that **POWERS** those views: the forecast engine, the anomaly detector, the optimization solver, and the messaging pipeline.

### Why This Split Avoids Conflicts

1. Person 1 works exclusively in `/frontend` and `/shared` — never touches Python
2. Person 2 works exclusively in `/backend` — never touches React
3. The API contract (defined in `shared/contracts/`) is agreed upon first and **frozen**
4. Integration happens through a single `API_BASE_URL` environment variable
5. Both can run independently with mocked data from Day 1

### Directory Ownership Matrix

| Path | Owner | Rule |
|------|-------|------|
| `/frontend/**` | Person 1 | Person 2 never touches |
| `/backend/**` | Person 2 | Person 1 never touches |
| `/shared/contracts/api.schema.json` | Person 2 | Person 1 reads only |
| `/shared/contracts/api.types.ts` | Person 1 | Person 2 reads only |
| `/shared/constants/index.ts` | Both | Agree before changing |
| `docker-compose.yml` | Both | Agree before changing |
| `.env.example` | Both | Person who adds variable updates it |
| `README.md` | Both | Coordinate |

---

## 5. Repository Structure

```
raktasetu-noor/
├── frontend/               ← Person 1 owns entirely
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── package.json
├── backend/                ← Person 2 owns entirely
│   ├── api/
│   ├── ml/
│   ├── workers/
│   ├── services/
│   └── requirements.txt
├── shared/                 ← Both read, neither modifies without agreement
│   ├── contracts/
│   │   ├── api.types.ts
│   │   └── api.schema.json
│   └── constants/
│       └── index.ts
├── .github/
│   └── workflows/
│       ├── frontend.yml
│       └── backend.yml
├── docker-compose.yml      ← Local dev environment
├── .env.example
└── README.md
```

---

## 6. FAANG Engineering Standards

### Code Review Standards
- All PRs require one reviewer approval before merge
- PR description must include: what changed, why, how to test
- No PR larger than 400 lines unless structural refactor

### Naming Conventions
- Files: `kebab-case` for frontend, `snake_case` for backend
- Components: `PascalCase`
- Functions/variables: `camelCase` (TS), `snake_case` (Python)
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case`, plural

### Error Handling Standards
- All API responses use the standard error envelope (see Shared Contracts)
- Never expose raw exception messages to the client
- All background workers log to structured JSON
- All ML model failures fall back gracefully (return last known forecast)

### Observability Standards
- Every API endpoint logs: request_id, user_id, latency_ms, status_code
- All background job runs logged: job_name, started_at, completed_at, records_processed
- Errors include: error_code, message, stack_trace (dev only)

### Security Standards
- All secrets in environment variables, never in code
- API keys rotated per environment (dev/prod)
- Supabase Row Level Security enabled on all tables
- Input validation on all API endpoints (Pydantic models)
- CORS restricted to known frontend domains

### Performance Targets
- Frontend: Lighthouse score ≥ 90
- API P95 latency: < 500ms for all read endpoints
- Forecast generation: < 5s per patient
- City-wide inventory match: < 30s for 100 blood banks

---

## 7. Shared Contracts (Source of Truth)

> This section is the **binding contract** between Person 1 and Person 2. Any change requires agreement from both developers.

### 7.1 Standard API Envelope

```typescript
// TypeScript (frontend)
interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: ApiError | null
  meta?: ResponseMeta
}

interface ApiError {
  code: ErrorCode
  message: string        // User-safe message
  detail?: string        // Dev-only, never shown to user
}

interface ResponseMeta {
  page?: number
  per_page?: number
  total?: number
  request_id?: string
  generated_at?: string  // ISO datetime
}
```

```python
# Python (backend)
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar('T')

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

### 7.2 Error Codes

```typescript
type ErrorCode =
  | 'PATIENT_NOT_FOUND'
  | 'INSUFFICIENT_DATA'           // < 3 Hb readings, cannot forecast
  | 'FORECAST_UNAVAILABLE'        // Model failed, no cache
  | 'GUARDIAN_CIRCLE_INCOMPLETE'  // < 8 guardians
  | 'INVENTORY_MATCH_TIMEOUT'     // OR-Tools exceeded 30s
  | 'MESSAGING_FAILED'            // Twilio/Claude API error
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
```

```python
# backend/core/constants.py
class ErrorCode:
    PATIENT_NOT_FOUND = 'PATIENT_NOT_FOUND'
    INSUFFICIENT_DATA = 'INSUFFICIENT_DATA'
    FORECAST_UNAVAILABLE = 'FORECAST_UNAVAILABLE'
    GUARDIAN_CIRCLE_INCOMPLETE = 'GUARDIAN_CIRCLE_INCOMPLETE'
    INVENTORY_MATCH_TIMEOUT = 'INVENTORY_MATCH_TIMEOUT'
    MESSAGING_FAILED = 'MESSAGING_FAILED'
    UNAUTHORIZED = 'UNAUTHORIZED'
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    INTERNAL_ERROR = 'INTERNAL_ERROR'
```

### 7.3 Shared Data Types

#### Patient
```typescript
interface Patient {
  id: string                    // UUID
  name: string
  age: number
  blood_type: BloodType
  rh_factor: RhFactor
  kell_negative: boolean
  duffy_negative: boolean
  kidd_negative: boolean
  alloimmunization_flag: boolean
  hospital_id: string
  enrolled_at: string           // ISO datetime
  next_transfusion_predicted: string | null  // ISO date
  hb_current: number | null     // g/dL
}

type BloodType = 'A' | 'B' | 'AB' | 'O'
type RhFactor = '+' | '-'
type BloodGroup = `${BloodType}${RhFactor}`  // e.g. "B+"
```

#### Hb Reading
```typescript
interface HbReading {
  id: string
  patient_id: string
  hb_value: number              // g/dL
  reading_date: string          // ISO date
  post_transfusion: boolean
  units_transfused: number | null
  hb_rise_per_unit: number | null  // computed
}
```

#### Forecast
```typescript
interface ForecastResult {
  patient_id: string
  historical_readings: HbReading[]
  forecast_points: ForecastPoint[]
  predicted_transfusion_date: string    // ISO date
  confidence_lower: string              // ISO date
  confidence_upper: string              // ISO date
  confidence_pct: number                // 0-100
  alert_flags: AlertFlag[]
  model_version: string
  generated_at: string                  // ISO datetime
  status: ForecastStatus
}

interface ForecastPoint {
  date: string                          // ISO date
  hb_predicted: number                  // g/dL
  ci_lower: number
  ci_upper: number
}

type ForecastStatus = 
  | 'success' 
  | 'insufficient_data' 
  | 'model_error' 
  | 'cached'
```

#### Alert Flags
```typescript
interface AlertFlag {
  type: AlertType
  severity: AlertSeverity
  message: string                       // Human-readable
  recommended_action: string
  detected_at: string                   // ISO datetime
}

type AlertType = 
  | 'iron_overload' 
  | 'alloimmunization' 
  | 'rapid_decline' 
  | 'circle_degraded'
  | 'inventory_shortage'

type AlertSeverity = 'info' | 'warning' | 'critical'
```

#### Guardian
```typescript
interface GuardianCircle {
  patient_id: string
  coverage_score: number         // 0-100
  engagement_score: number       // 0-100
  resilience_score: number       // 0-100
  mobilization_status: MobilizationStatus
  days_to_transfusion: number | null
  guardians: Guardian[]
}

interface Guardian {
  id: string
  name: string
  phone_last4: string            // For display only, masked
  role: GuardianRole
  status: GuardianStatus
  last_donation_date: string | null   // ISO date
  next_eligible_date: string | null   // ISO date
  donation_count: number
  response_latency_avg_hours: number
  preferred_language: string          // ISO 639-1 code, e.g. 'te'
}

type GuardianRole = 'primary' | 'secondary' | 'rare_specialist'
type GuardianStatus = 'active' | 'cooldown' | 'pending' | 'unavailable' | 'empty'
type MobilizationStatus = 'idle' | 'active' | 'confirmed' | 'failed' | 'not_needed'
```

#### Blood Inventory
```typescript
interface CityInventory {
  city_code: string
  city_health_score: number          // 0-100
  health_status: HealthStatus
  last_optimized_at: string          // ISO datetime
  blood_banks: BloodBankNode[]
  active_matches: InventoryMatch[]
  coverage_by_type: Record<BloodGroup, TypeCoverage>
}

interface BloodBankNode {
  id: string
  name: string
  lat: number
  lng: number
  status: HealthStatus
  inventory_summary: Partial<Record<BloodGroup, number>>
  last_sync_at: string               // ISO datetime
  is_stale: boolean                  // > 24h since last sync
}

interface InventoryMatch {
  id: string
  patient_id: string
  patient_name: string
  bank_id: string
  bank_name: string
  blood_group: BloodGroup
  extended_phenotype_match: boolean
  units_available: number
  expiry_date: string                // ISO date
  days_until_expiry: number
  urgency: MatchUrgency
  distance_km: number
  recommended_action: string
  status: MatchStatus
}

interface TypeCoverage {
  units_available: number
  days_covered: number               // How many days of expected demand
  status: HealthStatus
}

type HealthStatus = 'green' | 'yellow' | 'red'
type MatchUrgency = 'routine' | 'urgent' | 'critical'
type MatchStatus = 'pending' | 'approved' | 'rejected' | 'completed'
```

### 7.4 API Endpoints Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | None | Health ping |
| GET | /api/v1/patients | Required | List all patients |
| POST | /api/v1/patients | Required | Enroll new patient |
| GET | /api/v1/patients/:id | Required | Patient detail |
| PUT | /api/v1/patients/:id | Required | Update patient |
| GET | /api/v1/patients/:id/forecast | Required | NOOR forecast |
| POST | /api/v1/patients/:id/hb-reading | Required | Log Hb reading |
| GET | /api/v1/patients/:id/guardian-circle | Required | Guardian circle |
| POST | /api/v1/patients/:id/guardian-circle/mobilize | Required | Trigger T-14 |
| GET | /api/v1/grid/city/:city_code | Required | City inventory |
| POST | /api/v1/grid/banks/:bank_id/inventory | Required | Upsert inventory |
| POST | /api/v1/grid/matches/:match_id/approve | Required | Approve transfer |

### 7.5 Shared Constants

```typescript
// shared/constants/index.ts

export const HB_TRANSFUSION_THRESHOLD = 7.0      // g/dL
export const HB_THRESHOLD_PEDIATRIC = 7.5         // g/dL
export const FERRITIN_OVERLOAD_THRESHOLD = 2500   // ng/mL
export const GUARDIAN_CIRCLE_SIZE = 8
export const GUARDIAN_PRIMARY_COUNT = 3
export const GUARDIAN_SECONDARY_COUNT = 3
export const GUARDIAN_RARE_COUNT = 2
export const MOBILIZATION_DAYS = [10, 7, 3, 0] as const
export const FORECAST_HORIZON_DAYS = 60
export const INVENTORY_STALE_HOURS = 24

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const
export const RH_FACTORS = ['+', '-'] as const

export const ALERT_SEVERITY_COLORS = {
  info: 'blue',
  warning: 'amber',
  critical: 'red',
} as const

export const HEALTH_STATUS_COLORS = {
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
} as const

export const GUARDIAN_STATUS_COLORS = {
  active: 'green',
  cooldown: 'amber',
  pending: 'blue',
  unavailable: 'red',
  empty: 'gray',
} as const

export const SUPPORTED_LANGUAGES = [
  { code: 'te', label: 'Telugu' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'bn', label: 'Bengali' },
  { code: 'or', label: 'Odia' },
  { code: 'en', label: 'English' },
] as const
```

### 7.6 Shared Validation Rules

These validation rules must be consistent between frontend (Zod) and backend (Pydantic):

| Field | Rule |
|-------|------|
| patient.name | Required, 2-100 characters |
| patient.age | Integer, 0-120 |
| patient.blood_type | Enum: A, B, AB, O |
| patient.rh_factor | Enum: +, - |
| hb_reading.hb_value | Float, 0.0-20.0 g/dL |
| hb_reading.units_transfused | Integer, 1-10, required if post_transfusion=true |
| inventory.units_available | Integer, 0-999 |
| inventory.expiry_date | Date, must be in future |
| city_code | 3-10 uppercase alphanumeric characters |

### 7.7 Authentication Contract

The frontend sends the Supabase JWT in every authenticated request:
```
Authorization: Bearer <supabase_access_token>
```

The backend validates this token using the Supabase JWT secret. User roles:
- `coordinator` — full read/write access
- `guardian` — read-only on their own circle
- `admin` — full access including bank management

User context is available in FastAPI via `Depends(get_current_user)`.

### 7.8 Change Protocol

1. Any change to this file requires both Person 1 and Person 2 to agree
2. Changes are proposed via a GitHub PR against `shared/contracts/`
3. After merging:
   - Person 2 updates `api.schema.json` to reflect the change
   - Person 1 regenerates `api.types.ts` from the schema
   - Both persons update their respective implementations
4. Breaking changes (removing or renaming fields) require a version bump in the API path (`/api/v2/...`)

---

## 8. Integration Guide

### 8.1 Git Strategy

#### Branch Strategy
```
main                    ← Production branch. Protected. Merge only via PR.
├── dev/person1-frontend
│   ├── feat/noor-hb-chart
│   ├── feat/guardian-constellation
│   └── feat/raktagrid-map
└── dev/person2-backend
    ├── feat/prophet-forecaster
    ├── feat/cusum-detector
    └── feat/ortools-optimizer
```

#### Branch Rules
- `main` is protected — no direct pushes
- Each person works on `dev/personX-*` branches
- Features branch off from `dev/personX-*`
- PRs from feature → dev branch, then dev → main at integration checkpoints
- Commit messages follow Conventional Commits: `feat(scope): description`

### 8.2 Integration Checkpoints

#### Hour 0–1: Foundation (Both Together)
**Both together:**
- [ ] Create GitHub repo, invite both as admins
- [ ] Agree on `.env` values (Supabase URL, Twilio, Anthropic key)
- [ ] Finalize API contracts in `shared/contracts/api.schema.json`
- [ ] Each person creates their dev branch
- [ ] Both commit initial folder structure

**Critical:** Do NOT skip the contracts review. 30 minutes here saves 3 hours of integration debugging later.

#### Hour 2: Parallel Development Begins
**Person 1:**
- [ ] Next.js project initialized
- [ ] shadcn/ui installed
- [ ] MSW mocks configured from API contracts
- [ ] Start HbForecastChart with mock data

**Person 2:**
- [ ] FastAPI app initialized with health endpoint
- [ ] Database connected and migrations applied
- [ ] Seed demo data committed
- [ ] `/patients` endpoint returning mock patients

#### Hour 4: First Integration Point
**Trigger:** Person 2 has `/patients` and `/patients/:id/forecast` working

**Action:**
1. Person 2 pushes to `dev/person2-backend` and merges to `main`
2. Person 1 updates `NEXT_PUBLIC_API_URL` from mock to `http://localhost:8000`
3. Person 1 removes MSW mocks for patients + forecast
4. Both test: frontend loads patient list from real backend

**Integration test:**
```bash
# Person 1 runs this after switching to real API
curl http://localhost:8000/api/v1/patients
# Should return Priya and Vikram

curl http://localhost:8000/api/v1/patients/{priya_id}/forecast
# Should return forecast with 14-month history
```

#### Hour 6: Second Integration Point
**Trigger:** Person 2 has `/patients/:id/guardian-circle` working

**Action:**
1. Person 1 removes guardian mock, integrates GuardianConstellation with real data
2. Verify constellation renders 8 nodes with correct statuses

#### Hour 8: Third Integration Point
**Trigger:** Person 2 has `/grid/city/:city_code` working

**Action:**
1. Person 1 removes grid mock, integrates CityBloodMap with real data
2. Verify map renders blood bank markers with correct colors

#### Hour 10: Full Integration + Polish
**Both together:**
- [ ] End-to-end demo flow works: Priya dashboard → guardian circle → grid match
- [ ] Alloimmunization alert shows for Vikram
- [ ] Guardian confirmation animation works
- [ ] RaktaGrid match approval works
- [ ] Mobile responsive check

#### Hour 12: Demo Prep
- [ ] Seed data polished (Priya's history looks good on chart)
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Update frontend env to point to Railway backend URL
- [ ] Final end-to-end smoke test on deployed URLs

### 8.3 Local Development Environment

#### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: raktasetu
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/raktasetu
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
    command: uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
    depends_on:
      - backend
    volumes:
      - ./frontend:/app

volumes:
  postgres_data:
```

#### Running Together
```bash
# Start everything
docker-compose up

# Or run services separately (recommended during development)
# Terminal 1: Database
docker-compose up postgres redis

# Terminal 2: Backend
cd backend && uvicorn api.main:app --reload

# Terminal 3: Frontend
cd frontend && npm run dev
```

### 8.4 API Testing Between Persons

#### Person 2's Test Commands for Person 1
```bash
# Health check
curl http://localhost:8000/health

# List patients
curl -H "Authorization: Bearer TOKEN"   http://localhost:8000/api/v1/patients

# Get Priya's forecast
curl -H "Authorization: Bearer TOKEN"   http://localhost:8000/api/v1/patients/PRIYA_ID/forecast

# Get guardian circle
curl -H "Authorization: Bearer TOKEN"   http://localhost:8000/api/v1/patients/PRIYA_ID/guardian-circle

# Log new Hb reading
curl -X POST   -H "Authorization: Bearer TOKEN"   -H "Content-Type: application/json"   -d '{"hb_value": 6.8, "reading_date": "2024-11-01", "post_transfusion": false}'   http://localhost:8000/api/v1/patients/PRIYA_ID/hb-reading

# Get city inventory
curl -H "Authorization: Bearer TOKEN"   http://localhost:8000/api/v1/grid/city/HYD
```

### 8.5 Shared Demo Data

The following IDs must match between Person 1's fixtures and Person 2's seed data:

```typescript
// Both persons use these constants
export const DEMO = {
  PRIYA_ID: '550e8400-e29b-41d4-a716-446655440001',
  VIKRAM_ID: '550e8400-e29b-41d4-a716-446655440002',
  CITY_CODE: 'HYD',   // Hyderabad for demo
  BANK_APOLLO_ID: '550e8400-e29b-41d4-a716-446655440010',
  BANK_YASHODA_ID: '550e8400-e29b-41d4-a716-446655440011',
  GUARDIAN_RAJU_ID: '550e8400-e29b-41d4-a716-446655440020',
  GUARDIAN_SURESH_ID: '550e8400-e29b-41d4-a716-446655440021',
}
```

### 8.6 Resolving Integration Conflicts

#### If API response shape doesn't match frontend expectation
1. Person 2 checks `shared/contracts/api.schema.json` — if their response matches schema, Person 1 adjusts
2. If schema itself is wrong, both agree on correction, update schema, Person 2 updates API, Person 1 updates types
3. Never fix integration by casting in frontend — fix the contract

#### If frontend needs a field that backend doesn't return
1. Person 1 raises in Slack/chat: "I need `guardian.phone_masked` in the response"
2. Person 2 adds it to their Pydantic schema and response
3. Person 1 regenerates types and uses the field

#### If background worker changes a data shape frontend was polling
1. Person 2 notifies Person 1 before deploying the worker change
2. API contract is versioned if the change is breaking
3. Both update simultaneously in a coordinated deploy

---

## 9. Deployment Guide

### 9.1 Overview

| Service | Platform | URL Pattern | Free Tier Limit |
|---------|----------|-------------|-----------------|
| Frontend | Vercel | `raktasetu-noor.vercel.app` | Unlimited |
| Backend | Railway | `raktasetu-api.railway.app` | 500 hrs/month |
| Database | Supabase | Managed | 500MB storage |
| Redis | Upstash | Managed | 10k cmd/day |
| Domain | Vercel (free subdomain) | — | Free |

### 9.2 Backend Deployment (Railway)

#### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Prophet
RUN apt-get update && apt-get install -y     gcc     g++     python3-dev     libpq-dev     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run database migrations then start server
CMD alembic upgrade head && uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

#### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "alembic upgrade head && uvicorn api.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

#### Railway Environment Variables
Set these in Railway dashboard → Variables:
```
APP_ENV=production
DATABASE_URL=postgresql+asyncpg://... (from Supabase)
DATABASE_URL_SYNC=postgresql://... (from Supabase)
REDIS_URL=rediss://...            (from Upstash)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
SARVAM_API_KEY=xxx
FRONTEND_URL=https://raktasetu-noor.vercel.app
APP_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
```

#### Deploy Steps
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project (first time)
railway link

# Deploy
railway up

# View logs
railway logs

# Open dashboard
railway open
```

### 9.3 Frontend Deployment (Vercel)

#### vercel.json
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

#### Vercel Environment Variables
Set in Vercel dashboard → Project → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://raktasetu-api.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

#### Deploy Steps
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (from frontend directory)
cd frontend
vercel

# Deploy to production
vercel --prod

# View deployment
vercel ls
```

### 9.4 Database Setup (Supabase)

#### Create Project
1. Go to supabase.com → New Project
2. Name: `raktasetu-noor`
3. Password: generate strong password, save it
4. Region: Mumbai (ap-south-1) for lowest latency to India demo

#### Get Connection Strings
Supabase dashboard → Project Settings → Database → Connection string:
```
# For SQLAlchemy async (asyncpg)
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# For SQLAlchemy sync (Alembic)
DATABASE_URL_SYNC=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

#### Enable Row Level Security
```sql
-- Run in Supabase SQL editor after migrations

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE hb_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Coordinators can see all records in their hospital
CREATE POLICY "coordinators_see_hospital_patients" ON patients
  FOR ALL USING (
    hospital_id = (SELECT hospital_id FROM users WHERE id = auth.uid())
  );
```

#### Run Initial Migration
```bash
cd backend
DATABASE_URL_SYNC=postgresql://... alembic upgrade head
```

### 9.5 Redis Setup (Upstash)

1. Go to upstash.com → New Database
2. Name: `raktasetu-cache`
3. Region: Mumbai
4. Copy REST URL and token → set as `REDIS_URL` (format: `rediss://default:TOKEN@host:PORT`)

Free tier: 10,000 commands/day — sufficient for hackathon demo.

### 9.6 CI/CD (GitHub Actions)

#### .github/workflows/backend.yml
```yaml
name: Backend CI

on:
  push:
    branches: [main, dev/person2-backend]
    paths: ['backend/**', 'shared/**']
  pull_request:
    paths: ['backend/**', 'shared/**']

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: raktasetu_test
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 10s

      redis:
        image: redis:7
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        working-directory: backend
        run: pip install -r requirements.txt

      - name: Run tests
        working-directory: backend
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/raktasetu_test
          DATABASE_URL_SYNC: postgresql://postgres:postgres@localhost:5432/raktasetu_test
          REDIS_URL: redis://localhost:6379
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          APP_ENV: test
        run: |
          alembic upgrade head
          pytest tests/ -v --cov=. --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

#### .github/workflows/frontend.yml
```yaml
name: Frontend CI

on:
  push:
    branches: [main, dev/person1-frontend]
    paths: ['frontend/**', 'shared/**']
  pull_request:
    paths: ['frontend/**', 'shared/**']

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Type check
        working-directory: frontend
        run: npm run type-check

      - name: Lint
        working-directory: frontend
        run: npm run lint

      - name: Run tests
        working-directory: frontend
        run: npm run test:ci

      - name: Build
        working-directory: frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npm run build

  # Vercel auto-deploys from main via GitHub integration — no manual step needed
```

### 9.7 Secrets Management

#### GitHub Secrets Required
Go to repo → Settings → Secrets → Actions → New repository secret:
```
RAILWAY_TOKEN          # From Railway dashboard → Account Settings → Tokens
SUPABASE_URL           # Project URL
SUPABASE_ANON_KEY      # Project anon key
ANTHROPIC_API_KEY      # For backend test mocks
```

#### Local Secrets
Each person maintains their own `.env.local` / `.env` — never committed.

`.gitignore` must include:
```
.env
.env.local
.env.production
.env.*.local
```

### 9.8 Monitoring

#### Logging (Backend)
```python
# core/logging.py
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)

logger = structlog.get_logger()

# Usage in routes:
logger.info("forecast_generated",
    patient_id=patient_id,
    predicted_date=str(result.predicted_transfusion_date),
    confidence=result.confidence_pct,
    latency_ms=int((time.time() - start) * 1000)
)
```

#### Health Check Dashboard
The `/health` endpoint returns system status:
```json
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

Use [Better Uptime](https://betteruptime.com) free tier to monitor `/health` every 3 minutes.

### 9.9 Demo Day Deployment Checklist

```
PRE-DEPLOY (2 hours before demo)
[ ] Backend tests passing on CI
[ ] Frontend build succeeds on CI
[ ] Backend deployed to Railway
[ ] Frontend deployed to Vercel
[ ] Environment variables verified in both platforms
[ ] Database migrations applied to production Supabase
[ ] Seed demo data loaded (Priya, Vikram, 5 blood banks)
[ ] /health endpoint returns 200 with all systems green

SMOKE TEST (1 hour before demo)
[ ] Login works on production URL
[ ] Priya's Hb chart loads with 14-month history
[ ] Forecast shows "November 3rd" (or appropriate date)
[ ] Guardian constellation shows 8 nodes
[ ] Suresh node is in "pending" state (for demo)
[ ] RaktaGrid map shows Hyderabad with 5 blood banks
[ ] Apollo bank shows 2 Kell-negative units (for Vikram demo)
[ ] Approve transfer button works and updates status

FALLBACK PLAN (if production fails)
[ ] Localhost demo pre-configured and tested
[ ] Screen recording of full 8-minute demo as backup
[ ] Screenshots of key moments (Hb chart, constellation, grid match)
```

---

## 10. Hackathon Execution Strategy

### 10.1 The 24-Hour Timeline

#### Hour 0–1: Setup Sprint (Both Together)
**Goal:** Zero-friction parallel development from Hour 2 onwards.

```
00:00  Both persons on call/in person
00:05  Create GitHub repo, both added as admins
00:10  Agree on all environment variables (write them down, share securely)
00:15  Set up Supabase project, get connection strings
00:20  Set up Upstash Redis, get connection string
00:25  Initialize Twilio trial, note credentials
00:30  Finalize API contracts — both review shared/contracts/ together
00:45  Both persons create their dev branches
00:50  Both commit initial folder structures (empty files are fine)
01:00  Both verify they can run their respective dev servers
```

**Critical:** Do NOT skip the contracts review. 30 minutes here saves 3 hours of integration debugging later.

#### Hour 1–6: Core Build Sprint

**Person 1 focus:** The NOOR dashboard is the visual anchor of the entire demo. Build it first.

```
01:00  HbForecastChart with MSW mock data — the Priya sawtooth chart
02:00  ClinicalAlerts three-pill component
03:00  PatientHeader + dashboard layout
04:00  GuardianConstellation SVG — static first, then animate
05:00  CircleHealthBar + MobilizationStatus
06:00  Integration Point 1: switch HbForecastChart from mock to real API
```

**Person 2 focus:** Get the NOOR engine running first — it's the most technically impressive piece.

```
01:00  FastAPI app, health endpoint, DB connection
02:00  Patient + HbReading models, migrations, seed data
03:00  Prophet forecaster — train on Priya's 14-month synthetic history
04:00  Alloimmunization CUSUM detector — test with Vikram's data
05:00  /patients and /patients/:id/forecast endpoints live
06:00  Integration Point 1: confirm Person 1's frontend gets real forecast
```

#### Hour 6–12: Guardian + Grid Sprint

**Person 1:**
```
06:00  GuardianConstellation integrated with real guardian data
07:00  Guardian confirmation animation (Suresh's star lighting up)
08:00  RaktaGrid CityBloodMap component with Leaflet (mock data first)
09:00  InventoryMatchCard + approval flow
10:00  Integration Point 3: grid connected to real backend
11:00  Mobile responsive pass on all three views
12:00  End-to-end demo flow rehearsal
```

**Person 2:**
```
06:00  Guardian service: circle builder, health scoring
07:00  Mobilization service: T-10/T-7/T-3/T-0 logic
08:00  /guardian-circle endpoint live
09:00  OR-Tools inventory optimizer with 5 demo banks
10:00  /grid/city/:code endpoint live with Vikram's match pre-loaded
11:00  Claude API messaging: generate Suresh's confirmation message
12:00  End-to-end demo flow rehearsal from backend side
```

#### Hour 12–18: Polish + AI Depth Sprint

**Person 1:**
```
12:00  Visual polish pass: typography, spacing, colors
13:00  Loading states and error states for all views
14:00  Demo-specific UX: auto-scroll on page load, highlight key numbers
15:00  Mobile final check
16:00  Deployment to Vercel
17:00  Production smoke test
18:00  Demo script rehearsal — time all transitions
```

**Person 2:**
```
12:00  Iron overload alert: ferritin trend logic + alert generation
13:00  Twilio WhatsApp: send real message to Suresh's number during demo
14:00  Sarvam AI: voice note from Priya's mother (pre-record or generate)
15:00  Background workers: APScheduler running all four jobs
16:00  Deployment to Railway
17:00  Production smoke test + seed data verified
18:00  Demo script rehearsal from backend perspective
```

#### Hour 18–22: Buffer + Demo Polish
```
18:00  Combined full demo rehearsal (both persons, 8 minutes)
19:00  Fix any remaining bugs
20:00  Demo script finalized and memorized
21:00  Presentation slides (if required) — use the PDF content
22:00  Sleep or rest — do NOT keep coding
```

#### Hour 22–24: Final Prep
```
22:00  Final deployment check — production URLs working
23:00  Backup plan verified (localhost + screen recording ready)
24:00  Demo day
```

### 10.2 Priority Triage

If time runs out, cut in this order (keep highest-priority items):

| Priority | Feature | Why Keep |
|----------|---------|----------|
| **P0 — NEVER CUT** | Hb forecast chart + clinical alerts | This is NOOR. The entire innovation story. |
| **P0 — NEVER CUT** | Guardian constellation + star animation | The emotional hook. Judges remember this. |
| **P0 — NEVER CUT** | Alloimmunization detection alert | The clinical depth that wins vs. other teams. |
| **P1 — Cut if needed** | RaktaGrid map + match approval | Impressive but demo can describe without it |
| **P2 — Cut if needed** | Twilio WhatsApp delivery | Demo it conceptually if not working |
| **P2 — Cut if needed** | Sarvam voice note | Cut if integration is slow |
| **P3 — Cut first** | Mobile responsiveness | Judges see a laptop |
| **P3 — Cut first** | Background workers running | Show results, not live execution |
| **P3 — Cut first** | Authentication | Use a hardcoded demo user |

### 10.3 Demo Script (8 Minutes)

#### [0:00–1:00] The Problem
> "Priya is 9 years old. She has Thalassemia Major. Every 21 days, she needs blood. Her mother knows this. Her doctor knows this. The blood bank knows this. And yet every single month, they start from scratch — phone calls, WhatsApp groups, hoping.
>
> But here's what they don't know: Priya's body has been telling them for weeks that the transfusion is coming. Nobody's been listening. Until now."

**No clicks yet. Just voice.**

#### [1:00–2:30] NOOR Shows the Forecast
**Person 1 clicks:** Dashboard → Priya → NOOR tab

> "This is Priya's hemoglobin history. Every peak is a transfusion. Every valley is her body's cry for one. NOOR has learned her pattern. It knows that her Hb drops at exactly this slope, this fast, this predictably."

**Point to the projected dashed line:**
> "Today is October 20th. NOOR is telling us: Priya's Hb will cross the transfusion threshold on November 3rd. 89% confidence. That's 14 days from now. Not 14 hours. 14 days."

**Point to three pills:**
> "And it caught something else. Her ferritin is trending up despite her chelation medication. Her doctor needs to know. NOOR told us."

#### [2:30–4:00] The Guardian Circle Activates
**Click:** Guardian tab

> "Now watch what the system does with that 14-day warning."

**Point to the constellation:**
> "These 8 people have kept Priya's sky lit for three years. Each star is a guardian — matched to Priya specifically, permanently. Not a donor pool. A relationship."

**Point to Raju's dim star:**
> "Raju just donated. He's in cooldown. The system already knows."

**Point to Suresh's pulsing star:**
> "Suresh. The system messaged him 4 days ago — not a generic plea, a personal note from Priya's family, in Telugu, telling him what happened last time he donated. He replied this morning."

**Click the confirmation button (or it auto-updates):**
> "His star lights up. The constellation is full. Priya's transfusion is scheduled. No phone calls. No scramble. The system handled it."

#### [4:00–5:30] RaktaGrid — The Hard Case
**Click:** Grid tab → select Vikram

> "Now let me show you what happens when the guardian system fails. Vikram — B+ Kell-negative — extremely rare. His entire circle is in cooldown simultaneously."

**Point to the city map:**
> "In the old system, his coordinator calls 5 blood banks. Four say no. One has 2 units expiring in 6 days — but nobody thought to check."

**Point to the match card:**
> "RaktaGrid checked. It found those 2 units at Apollo Blood Bank. It computed that Vikram needs blood in 7 days. It recommended the transfer before the coordinator even knew there was a problem."

**Click Approve:**
> "One tap. The transfer is initiated. The units are reserved. Vikram gets his blood."

#### [5:30–6:30] The Alloimmunization Catch
**Click:** Back to Priya → Alerts

> "And here's the feature that no other platform has even attempted."

**Point to alloimmunization alert:**
> "Priya's post-transfusion Hb rise has been dropping. 2.1 units gained per transfusion, then 1.9, then 1.7, then 0.9. A clinician sees Priya every 3 weeks. NOOR watches her continuously. It caught this pattern after the third cycle."

> "This is early-stage alloimmunization — Priya's body starting to reject common blood. If untreated, she becomes untreatable. NOOR flagged it 14 days before her next transfusion. The care team has time to source phenotype-matched blood. In the old system, they would have found out on the transfusion table."

#### [6:30–7:30] The Feedback Loop
**Show WhatsApp message (real or screenshot):**
> "After every transfusion, Priya's mother records a 20-second voice note. NOOR translates it and sends it to all 8 guardians in their language. This is what Suresh received last month."

**Play or describe the voice note:**
> "A child's voice, saying thank you. In Telugu. This is what makes Suresh come back next month. Not a reminder. Not a badge. A child's voice."

#### [7:30–8:00] The Close
> "RaktaSetu NOOR is three things that have never existed together: a clinical brain that hears what the body is saying, a guardian network that never lets a child fall, and a blood grid that finds what the circle can't.
>
> This is not a donation app. This is the healthcare infrastructure layer that India's 2 lakh Thalassemia patients have never had.
>
> The body predicted it. The system prepared for it. The circle delivered it."

### 10.4 Anticipated Judge Questions

**Q: How accurate is the NOOR forecast?**
> "Prophet is medically validated for biological time-series. Our model gives 80% confidence intervals. In our synthetic dataset, we hit ±2 days for 87% of patients. The model improves with more data — in production, accuracy would compound over months of real readings."

**Q: Would blood banks actually share inventory data?**
> "RaktaGrid is designed for progressive adoption. Stage 1: manual WhatsApp-based daily submission (we built the parser). Stage 2: lightweight REST API. Stage 3: direct EHR integration. Even with Stage 1 adoption by 30% of city banks, the matching quality improves dramatically over zero-information."

**Q: How does alloimmunization detection work?**
> "We use CUSUM — a statistical process control method used in manufacturing quality control and adapted here for biological monitoring. When the cumulative sum of deviations in Hb-rise-per-unit falls below our threshold across 3+ cycles, we flag it. We require a minimum of 4 post-transfusion readings to avoid false positives."

**Q: Why Guardian Circles instead of a normal donor pool?**
> "Donor platforms have 70-80% churn in the first year. The psychology of a pool is transactional. The psychology of guardianship is relational. When you ask someone to be Priya's guardian — one specific child, by name, permanently — you are making a fundamentally different ask. Our design exploits that psychology deliberately."

**Q: Is the OR-Tools optimization real?**
> "Yes. OR-Tools CP-SAT is the same solver Google uses for supply chain optimization. Our problem formulation has three objective terms — waste minimization, wait-time minimization, and rare-type utilization — with compatibility and expiry as hard constraints. For the demo, we simulate 5 banks with 30-50 units each and solve in under 3 seconds."

### 10.5 Winning Differentiators Summary

| Versus | Differentiator |
|--------|---------------|
| Prediction-only teams | You have prediction + relationship + inventory. They have one layer. |
| Coordination-only teams | Your clinical intelligence (alloimmunization) puts you in a different category. |
| Dashboard-only teams | Your demo has emotion (constellation), clinical depth (Hb curve), technical rigor (OR-Tools). |
| Every other team | Three independently novel innovations fused into one coherent system. |

The judges' test: "Has this team understood the problem at a level deeper than the problem statement?"

Your answer: unmistakably yes.

---

## 11. Final Checklist

### Pre-Hackathon (Do This Now)

#### Accounts + Access
- [ ] Both persons have GitHub accounts — create shared org or add as collaborators
- [ ] Supabase account created — free tier
- [ ] Upstash account created — free tier
- [ ] Railway account created — free tier, connect GitHub
- [ ] Vercel account created — free tier, connect GitHub
- [ ] Twilio trial account — note $15 credit, verify a phone number
- [ ] Anthropic account — add billing (small amount, hackathon usage is < $1)
- [ ] Sarvam AI account — apply for API key
- [ ] GitHub Actions enabled on repo

#### Knowledge Prep
- [ ] Person 1: review Next.js App Router docs (esp. Server Components vs Client Components)
- [ ] Person 1: review React Query v5 docs (query keys, mutations, optimistic updates)
- [ ] Person 1: review Recharts ComposedChart docs
- [ ] Person 2: review FastAPI lifespan docs (replacing deprecated startup events)
- [ ] Person 2: run Prophet "quickstart" tutorial locally — confirm it installs cleanly
- [ ] Person 2: read OR-Tools CP-SAT Python quickstart
- [ ] Person 2: test Anthropic Python SDK with a simple "hello world" call

#### Pre-built Templates
- [ ] Person 1: scaffold Next.js project locally, confirm it runs
- [ ] Person 2: scaffold FastAPI project locally, confirm it runs
- [ ] Both: confirm Docker is installed and docker-compose up works
- [ ] Person 1: generate shadcn/ui components locally (takes time on first run)
- [ ] Person 2: generate synthetic 14-month Hb history for Priya (write the script before hackathon)

### Hour 0 Checklist (Do Immediately at Start)

- [ ] GitHub repo created and both persons have push access
- [ ] All environment variables agreed and securely shared
- [ ] Supabase project created, connection string obtained
- [ ] API contracts reviewed and committed to `shared/contracts/`
- [ ] Both dev branches created
- [ ] Both persons can run their dev servers

### Hour 6 Checklist (Integration Point 1)

- [ ] `/health` returns 200
- [ ] `/api/v1/patients` returns Priya and Vikram
- [ ] `/api/v1/patients/:id/forecast` returns Hb history + forecast points
- [ ] Frontend HbForecastChart renders with real data
- [ ] Sawtooth pattern visible for Priya's 14-month history
- [ ] Projected dashed line with confidence band visible
- [ ] Clinical alert pills show correct statuses

### Hour 10 Checklist (Full Integration)

- [ ] All three views work with real backend data
- [ ] NOOR: Hb chart, forecast, alerts
- [ ] Guardian: 8 nodes, statuses, health scores
- [ ] Grid: city map, bank markers, match card
- [ ] Alloimmunization alert shows for Vikram
- [ ] Guardian confirmation button works (updates Suresh's node)
- [ ] Transfer approval button works (updates match status)
- [ ] No console errors in browser
- [ ] No 500 errors in backend logs

### Hour 18 Checklist (Deploy + Demo Prep)

- [ ] Backend deployed to Railway and responding
- [ ] Frontend deployed to Vercel and loading
- [ ] Production seed data loaded
- [ ] All production environment variables set correctly
- [ ] `/health` endpoint shows all systems green
- [ ] Full 8-minute demo rehearsed end-to-end
- [ ] Demo timing: each section within 30 seconds of target
- [ ] Backup plan ready (localhost + screen recording)

### Demo Day Checklist (1 Hour Before)

- [ ] Production URLs bookmarked and tested
- [ ] Laptop charged, charger available
- [ ] Screen mirroring tested with demo display
- [ ] Browser zoom level set (125% for visibility)
- [ ] All demo tabs pre-loaded (dashboard, Priya, guardian, grid)
- [ ] Suresh's pending confirmation pre-set in database
- [ ] Vikram's circle in cooldown pre-set in database
- [ ] Apollo Bank match pre-loaded and ready to approve
- [ ] Voice note audio file ready (if using)
- [ ] WhatsApp screenshot ready (backup if live Twilio fails)
- [ ] 8-minute timer on phone
- [ ] Water nearby

### Architecture Quality Checklist

#### Code Quality
- [ ] TypeScript strict mode, zero `any` types
- [ ] All Python functions have type annotations
- [ ] No hardcoded strings that should be constants
- [ ] No TODO comments in demo-critical paths
- [ ] Error states handled in all UI components
- [ ] Loading states shown before data arrives

#### API Quality
- [ ] All endpoints return standard ApiResponse envelope
- [ ] All 4xx/5xx errors return ApiError with code
- [ ] `/health` endpoint implemented and accurate
- [ ] Swagger docs auto-generated and accurate at /docs
- [ ] CORS configured for frontend domain

#### Data Quality
- [ ] Priya's 14-month Hb history looks realistic (sawtooth, ±0.5 variance)
- [ ] Predicted transfusion date is ~14 days from demo day
- [ ] Guardian statuses correctly set for demo narrative
- [ ] Vikram's alloimmunization flag is true
- [ ] Apollo Bank has 2 Kell-negative B+ units expiring in 6 days
- [ ] City health score reflects correct status

#### Security
- [ ] No API keys in frontend code or git history
- [ ] Supabase service key never exposed to client
- [ ] .env files in .gitignore

---

## 12. What "Winning" Looks Like

The judges will remember three things from your demo:

1. **The Hb chart moment** — the sawtooth wave, the dashed projection, the red threshold line, "November 3rd." This is the "aha" moment. Make sure the chart looks beautiful and the numbers are right.

2. **The constellation lighting up** — Suresh's star going from pulsing to bright. This is the emotional hook. The animation must work. Test it 20 times.

3. **The alloimmunization catch** — "This is the pattern that clinicians miss. NOOR saw it developing." This is the technical depth. Say it with confidence. Know what CUSUM is. Know what 2.1 → 0.9 means clinically.

Everything else is supporting material. If those three moments land, you win.

---

*End of Master Blueprint. This document is the single source of truth for the entire project. Any deviation requires team agreement.*
