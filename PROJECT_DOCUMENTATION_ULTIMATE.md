# RaktaSetu NOOR — Complete System Architecture, Clinical/Logistics Algorithms & Developer Manual

RaktaSetu NOOR is a predictive, empathetic, and optimized blood management infrastructure designed specifically to support Thalassemia Major patients. This document details the exact technical implementation, database structures, background worker logic, clinical algorithms, and communication pipelines of the codebase.

---

## 1. Executive Summary & Problem Scope

### 1.1 The Thalassemia Landscape
Thalassemia Major is a genetic blood disorder requiring lifelong blood transfusions every **21 days**. In India, approximately **2 lakh Thalassemia Major patients** depend on this cycle. Despite the mathematical predictability of their needs, the current transfusion ecosystem is highly fragmented, resulting in:
1. **Clinical Blindness:** Clinicians lack predictive metrics for hemoglobin decay rates and early-stage warnings for immunological rejection (alloimmunization) or iron overload.
2. **Relationship Decay:** Donor platforms treat acquisitions as one-off transactions. There is no permanent, high-affinity support network.
3. **Inventory Isolation:** Blood bank inventories are highly siloed. Rare, phenotypically compatible units expire in one hospital while patients die waiting for them in another.

### 1.2 The NOOR Paradigm
RaktaSetu NOOR addresses this crisis with a tripartite solution:
* **🧠 NOOR Engine (Clinical Brain):** Models patient-specific hemoglobin decay rates (Facebook Prophet) and monitors transfusion recovery using Cumulative Sum (CUSUM) control charts to identify immunological warnings.
* **🛡️ RaktaMitra (Relationship OS):** Structures a permanent, 8-person **Guardian Circle** per patient, managing proactive donor scheduling via custom Telegram Bot webhook interactions.
* **🌐 RaktaGrid (Inventory Grid):** Synchronizes city-wide blood bank inventories using OpenStreetMap discovery and runs constraint programming (Google OR-Tools) to optimize inter-bank blood transfers, minimizing waste and transit distance.

---

## 2. Technical Stack Selection & Data Flow

### 2.1 Technology Stack Rationale

* **FastAPI 0.111 (Python 3.11):** Runs asynchronous request processing natively and auto-generates interactive Swagger API specifications (`/docs`).
* **Next.js 14 (App Router):** Leverages Server-Side Rendering (SSR) and React Server Components (RSC) to construct high-speed, zero-hydration-flicker clinical dashboards.
* **SQLAlchemy 2.0 & Alembic:** Manages async PostgreSQL database operations using type-annotated Mapped declarative models.
* **Redis 7 (Upstash):** Caches heavy time-series forecasts and optimization grids with targeted Time-To-Live (TTL) policies.
* **Facebook Prophet 1.1.5:** Employs additive regression to forecast patient hemoglobin levels using historical data.
* **Google OR-Tools 9.10:** CP-SAT constraint programming solver that matches city-wide blood inventory to pending transfusions.
* **Google Gemini (SDK `google-genai`):** Utilizes `gemini-2.5-flash-preview-05-20` to write empathetic donor communication and answer coordination queries through the **Saathi virtual health assistant**.
* **Google Cloud Voice Services:** Google Speech-to-Text (ASR) transcribes voice notes, Google Translation translates them to English, and Google Text-to-Speech (Wavenet) synthesizes pediatric replies.
* **Telegram Bot API:** Displaces WhatsApp in development environments for live, two-way donor confirmation webhooks.

---

### 2.2 System Block Architecture

```
                                  ┌────────────────────────┐
                                  │   Next.js 14 Client    │
                                  └───────────┬────────────┘
                                              │
                                              ▼ API Requests (Supabase JWT)
                                  ┌────────────────────────┐
                                  │    FastAPI Backend     │
                                  └─────┬────────────┬─────┘
                                        │            │
            ┌───────────────────────────┘            └───────────────────────────┐
            ▼                                                                    ▼
┌──────────────────────────────────────┐                              ┌──────────────────────────────────────┐
│        NOOR Clinical Engine          │                              │        RaktaGrid Logistics           │
│  • Prophet Hb decay forecaster       │                              │  • OR-Tools CP-SAT Matcher           │
│  • CUSUM Alloimmunization detector   │                              │  • OSM Overpass Discovery Service    │
│  • Ferritin overload trend analyzer  │                              │  • WhatsApp Unstructured Stock Parser│
└──────────────────────────────────────┘                              └──────────────────────────────────────┘
            │                                                                    │
            └───────────────────────────┐            ┌───────────────────────────┘
                                        ▼            ▼
                                  ┌────────────────────────┐
                                  │      Data Stores       │
                                  │  • Redis Cache Store   │
                                  │  • SQLite / PostgreSQL │
                                  └─────┬────────────┬─────┘
                                        │            │
            ┌───────────────────────────┘            └───────────────────────────┐
            ▼                                                                    ▼
┌──────────────────────────────────────┐                              ┌──────────────────────────────────────┐
│        RaktaMitra Webhooks           │                              │        Saathi Health Bot             │
│  • Telegram webhook state machine    │                              │  • Google Gemini LLM API             │
│  • Dynamic Valence Intent Parser     │                              │  • Google Speech / Translation ASR    │
│  • Inline Confirmation Buttons       │                              │  • Wavenet Text-to-Speech            │
└──────────────────────────────────────┘                              └──────────────────────────────────────┘
```

---

## 3. Clinical Intelligence Engine (NOOR Engine)

The **NOOR Engine** analyzes patient biometrics to predict transfusions and detect immunological anomalies.

### 3.1 Hemoglobin Decay Forecasting
Thalassemia Major patients show cyclical variations in hemoglobin (Hb) levels. The engine uses a dual-algorithm approach:

#### 3.1.1 Facebook Prophet Additive Time-Series Model
Prophet models the patient's Hb levels:
$$\hat{y}(t) = g(t) + s(t) + h(t) + \epsilon_t$$
* **Model Configuration:** 
  * `yearly_seasonality=False`, `weekly_seasonality=False`, `daily_seasonality=False` to ignore calendar trends.
  * `interval_width=0.80` to project an 80% confidence interval.
* **Custom Regressor:** Configured with `post_transfusion` (binary flag) to capture the rapid Hb spikes that occur immediately after a transfusion:
  ```python
  model = Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False, interval_width=0.80)
  model.add_regressor("post_transfusion")
  model.fit(df)
  ```
* **Threshold Crossing Detection:** The model projects 60 days into the future. It identifies the first day where the predicted value ($yhat$) crosses the clinical threshold (7.0 g/dL for adults, 7.5 g/dL for pediatric patients under 12) and flags it as `predicted_transfusion_date`.
* **Asynchronous Thread Pool Delegation:** To prevent blocking the async event loop during CPU-bound model fitting, Prophet is executed in a thread pool:
  ```python
  loop = asyncio.get_event_loop()
  predicted_date, conf_lower, conf_upper, conf_pct, forecast_points = await loop.run_in_executor(
      None, _run_prophet, df, threshold
  )
  ```

#### 3.1.2 Physiological Linear Decay Fallback
If Prophet fails to converge, the engine falls back to a **Physiological Linear Decay Model**:
1. It extracts past cycles to calculate the patient's decay rate:
   $$\text{Decay Rate} = \frac{\text{Hb}_{\text{post}} - \text{Hb}_{\text{pre}}}{\Delta t_{\text{days}}}$$
2. The calculated slope is filtered against standard medical bounds:
   $$0.05 \le \text{Decay Rate} \le 0.40 \text{ g/dL per day}$$
   If the calculated slope falls outside this range, the system defaults to the clinical baseline:
   $$\text{Decay Rate}_{\text{default}} = 0.15 \text{ g/dL per day}$$
3. The engine projects this decay slope from the latest Hb reading down to the threshold to predict the next transfusion date.

---

### 3.2 CUSUM Alloimmunization Anomaly Detection
Alloimmunization occurs when a patient's body creates antibodies against minor blood group antigens (Kell, Duffy, Kidd), causing the rapid destruction of transfused red blood cells. The engine identifies this early by tracking the post-transfusion Hb recovery rate using a **Cumulative Sum (CUSUM)** control chart.

```
CUSUM
  1.2 |                                                       * (Alert Triggered > H)
  1.0 |                                                      /
  0.8 |                                                     /
  0.6 |                                                    /
  0.4 |---------------------------------------------------*----- Alert Limit (H = 0.4)
  0.2 |                                                  /
  0.0 |________*_________*_________*_________*__________/
      +-------------------------------------------------------------> Cycles
            Cycle 1    Cycle 2    Cycle 3    Cycle 4    Cycle 5
```

#### Mathematical Formulation & Execution
1. **Recovery Calculation:** For each transfusion cycle $t$, calculate the recovery rate:
   $$\text{Rise}_t = \frac{\text{Hb}_{\text{post}} - \text{Hb}_{\text{pre}}}{\text{Units Transfused}}$$
2. **Baseline Initialization:** Establish the normal recovery rate using the first 3 post-transfusion cycles:
   $$\mu = \frac{1}{3}\sum_{t=1}^{3}\text{Rise}_t$$
3. **Cumulative Summation:** For each cycle $t \ge 4$, compute the cumulative deviation:
   $$S_t = \max(0, S_{t-1} + (\mu - \text{Rise}_t) - K)$$
   * $S_0 = 0$
   * $K = 0.5$ (the reference value or slack parameter).
4. **Alert Triggering:** The engine flags the patient if the cumulative sum exceeds the threshold $H$:
   $$S_t > H \quad \text{where } H = 0.4$$
   This updates the patient's state to `alloimmunization_flag = True`, alerting clinical coordinators and prompting **RaktaGrid** to require extended phenotype-matched blood.

---

## 4. Guardian Network Circles (RaktaMitra)

RaktaMitra replaces unstable general donor pools with a dedicated, permanent circle of 8 donors per patient.

### 4.1 Circle Building Scoring Algorithm
Donors are assigned to a patient's circle based on an optimization score calculated out of 100 points:

$$\text{Donor Score} = w_{\text{compat}}\cdot S_{\text{compat}} + w_{\text{rel}}\cdot S_{\text{rel}} + w_{\text{geo}}\cdot S_{\text{geo}} + w_{\text{pheno}}\cdot S_{\text{pheno}}$$

#### Scoring Components
* **$w_{\text{compat}} = 0.40$ (ABO Compatibility - Max 40 points):** Direct ABO/Rh blood type compatibility. Exact matches yield 40 points, compatible alternatives receive partial points, and incompatible types are rejected.
  * **Extended Phenotype Match Bonus:** Compatible matches receive a **+20 point bonus** if they match the patient's minor antigen requirements (Kell, Duffy, Kidd).
* **$w_{\text{rel}} = 0.20$ (Reliability - Max 20 points):** Calculated using past donation completions and response latency:
  $$S_{\text{rel}} = 10 \cdot \left(\frac{\text{Completed Donations}}{\text{Total Pledges}}\right) + 10 \cdot \left(1 - \frac{\text{Avg Response Latency (Hours)}}{72}\right)$$
* **$w_{\text{geo}} = 0.20$ (Geography - Max 20 points):** Based on proximity to the patient's primary hospital:
  * Same city code (e.g., "HYD"): 20 points.
  * Distance $< 50\text{ km}$: 10 points.
  * Distance $\ge 50\text{ km}$: 0 points.
* **$w_{\text{pheno}} = 0.20$ (Phenotype Match - Max 20 points):** Assesses compatibility across minor antigens (Kell, Duffy, Kidd). This is mandatory for alloimmunized patients.

The engine selects the **top 3 primary**, **top 3 secondary**, and **top 2 rare specialist** candidates to form the circle. Unassigned slots are left as `empty` placeholders.

---

### 4.2 Circle Health & Resilience Scores
The system continuously monitors circle health across three key metrics:
1. **Coverage Score:** Tracks circle completion:
   $$\text{Coverage} = \left(\frac{\text{Active Guardians}}{8}\right) \times 100$$
2. **Engagement Score:** Measures donor responsiveness:
   $$\text{Engagement} = \max\left(0, 100 \cdot \left(1 - \frac{\text{Avg Latency (Hours)}}{72}\right)\right)$$
3. **Resilience Score (Pair-Survivability):** Calculates the probability that the circle can support the patient if any two active donors are simultaneously unavailable:
   $$\text{Resilience} = \left( \frac{\text{Count of valid replacement donor pairs}}{\text{Total possible donor pairs}} \right) \times 100$$
   * A resilience score below 50% triggers the **Circle Repair Engine**, which automatically identifies new compatible donors to fill vulnerable slots.

---

### 4.3 Two-Way Telegram Webhook Workflow

```
┌─────────────────┐       JSON Update       ┌───────────────────────────┐
│  Telegram Bot   │────────────────────────>│ /messaging/telegram/webhook│
└─────────────────┘                         └─────────────┬─────────────┘
         ▲                                                │
         │ Dispatch Reply                                 ▼
         │   • Confirm: HTML + Date                 Match Guardian by
         │   • Decline: HTML Nudge                  telegram_chat_id
         │                                                │
         └────────────────────────────────────────────────┼──────────────────────────────┐
                                                          │                              │
                                                          ▼ (Confirm)                    ▼ (Decline)
                                                    Transition to                  Transition to
                                                      'active'                     'unavailable'
                                                          │                              │
                                                          ▼                              ▼
                                                    Recalculate                    Log Critical
                                                    Mobilization                  'low_mob' Alert
```

RaktaMitra uses Telegram to handle donor mobilization. When the bot token is configured, the system dispatches interactive messages with inline keyboards to primary guardians. The webhook endpoint (`/api/v1/messaging/telegram/webhook`) processes incoming response payloads:

1. **Valence Intent Parser:** If a user replies with text instead of tapping a button, the system parses the message using localized keyword sets:
   * **Positive tokens (`_POSITIVE_WORDS`):** `yes`, `confirm`, `active`, `y`, `agree`, `support`, `haan`, `ji`.
   * **Negative tokens (`_NEGATIVE_WORDS`):** `no`, `busy`, `decline`, `n`, `reject`, `unavailable`, `nahi`, `na`.
2. **State Machine Transitions:**
   * **Positive Reply:** Transition the guardian's status to `active` in the database, recalculate the mobilization status, and send an HTML confirmation message with details of the upcoming transfusion.
   * **Negative Reply:** Transition the guardian's status to `unavailable`. This logs a critical `low_mobilization` alert in the database, requesting an emergency search on **RaktaGrid**, and sends a polite acknowledgement back to the donor.

---

## 5. Logistics Optimization Grid (RaktaGrid)

When a patient's local circle cannot fulfill their blood requirement, **RaktaGrid** searches city-wide inventory. It optimizes allocation by matching patient needs against blood bank supplies.

### 5.1 Optimization Problem Formulation
We model city-wide allocation as a multi-objective, integer-constrained binary assignment problem.

Let $P$ represent the set of patients requiring blood, and $U$ represent the set of individual, compatible blood units available across all city banks. We define a binary decision variable $x_{p, u}$ for each patient $p \in P$ and unit $u \in U$:

$$x_{p, u} = \begin{cases} 
1 & \text{if unit } u \text{ is assigned to patient } p \\ 
0 & \text{otherwise} 
\end{cases}$$

### 5.2 Objective Function
The optimizer maximizes a combined utility score $Z$, which balances compatibility, waste reduction, and logistics:

$$\max \quad Z = \sum_{p \in P} \sum_{u \in U} \left( \beta_{\text{match}} \cdot x_{p, u} + \beta_{\text{waste}}(u) \cdot x_{p, u} - \beta_{\text{dist}}(p, u) \cdot x_{p, u} \right)$$

Where:
* **$\beta_{\text{match}} = 1000$ (Allocation Utility):** Assures that matching compatible blood to patients is the solver's highest priority.
* **$\beta_{\text{waste}}(u)$ (Waste Prevention Utility):** Prioritizes units nearing their expiry date to prevent blood wastage:
  $$\beta_{\text{waste}}(u) = 10 \cdot (30 - \text{Days to Expiry}(u))$$
  * Assures that units expiring soonest are assigned first.
* **$\beta_{\text{dist}}(p, u)$ (Logistics Penalty):** Penalizes long-distance transport, prioritizing local transfers:
  $$\beta_{\text{dist}}(p, u) = 1 \cdot \text{Haversine Distance}(\text{Hospital}_p, \text{Bank}_u) \text{ in km}$$

### 5.3 Optimization Constraints
The solver operates under strict clinical and physical constraints:

1. **Supply Limit:** Each physical unit $u$ can be assigned to at most one patient:
   $$\sum_{p \in P} x_{p, u} \le 1 \quad \forall u \in U$$
2. **Demand Cap:** Each patient $p$ receives no more than their required units:
   $$\sum_{u \in U} x_{p, u} \le \text{Units Needed}_p \quad \forall p \in P$$
3. **Clinical Compatibility Filter:** Assignments are restricted to clinically compatible pairs. The variable $x_{p,u}$ is set to $0$ if:
   * ABO/Rh groups are incompatible.
   * The patient has an active `alloimmunization_flag` and the unit lacks matching minor antigens (Kell, Duffy, Kidd).
4. **Safety Expiry Buffer:** To prevent using blood that may expire before or during treatment, assignments must meet a minimum safety window:
   $$\text{Expiry Date}_u \ge \text{Predicted Transfusion Date}_p - 2\text{ Days}$$

### 5.4 CP-SAT Solver Execution
The model is executed using Google OR-Tools' **CP-SAT Solver**:
* **Thread Utilization:** Uses 4 parallel search workers.
* **Timeout Limit:** Capped at 30 seconds to prevent thread blocking, though standard city grids typically resolve in under 100ms.
* **Distance Calculation:** Calculated using the Haversine equation:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  * Where $\phi$ represents latitude, $\lambda$ represents longitude, and $R = 6371\text{ km}$.

---

### 5.5 Autonomous OpenStreetMap Discovery Engine
To populate the logistics network with real-world data, the system runs an autonomous discovery process on startup:
1. It queries the OpenStreetMap Overpass API for blood banks within a 25 km radius of central Hyderabad:
   ```overpass
   [out:json][timeout:30];
   (
     node["amenity"="blood_bank"](around:25000,17.3850,78.4867);
     way["amenity"="blood_bank"](around:25000,17.3850,78.4867);
   );
   out center;
   ```
2. **Resilient Fallback:** If the Overpass API fails, the service falls back to seeding a pre-configured list of 6 major real-world Hyderabad blood banks (Aarohi, Red Cross, NTR Trust, Chiranjeevi, Apollo Jubilee Hills, Yashoda Secunderabad).
3. The discovered blood banks are added to the database. For each bank, the system creates a mock API endpoint URL:
   `http://localhost:8000/api/v1/grid/mock-bank-api?bank_name={encoded_name}`
   This enables inventory synchronization testing.

---

### 5.6 WhatsApp Unstructured Stock Parser
RaktaGrid includes an ingestion service to parse unstructured inventory updates sent via WhatsApp:
* **Format:** `"BankName: Type1 Count, Type2 Count"`
* **Parsing Logic:** Uses regex `\b(AB|A|B|O)\s*([+-])\s*(\d+)` to parse messages (e.g., `"Apollo: B+ 3 units, O- 2 units"`) and generate structured inventory updates. The system sets a default 35-day shelf life (standard packed red blood cell viability) for parsed units.

---

## 6. Directory Structure & Key Codebase Files

```
raktasetu-noor/
├── backend/
│   ├── api/
│   │   ├── main.py                    # Application factory; initializes OSM discovery & background workers
│   │   ├── dependencies.py            # Injects database sessions and validates auth tokens
│   │   └── routers/
│   │       ├── patients.py            # Manages patient records and logs Hb readings
│   │       ├── forecasts.py           # Returns Hb decay forecasts and runs anomaly checks
│   │       ├── guardians.py           # Handles circle management, manual mobilization, and Telegram triggers
│   │       ├── grid.py                # Runs OR-Tools grid matching and processes stock updates
│   │       └── messaging.py           # Telegram Bot webhook, intent parser, and confirmation handler
│   │
│   ├── ml/
│   │   ├── noor_engine/
│   │   │   ├── hb_forecaster.py       # Prophet model with linear physiological decay fallback
│   │   │   ├── alloimmunization.py    # Sequential CUSUM anomaly detection chart
│   │   │   └── iron_overload_detector.py # Anomaly detector for ferritin trend spikes
│   │   └── raktagrid/
│   │       ├── inventory_matcher.py   # Google OR-Tools CP-SAT multi-objective matcher
│   │       └── phenotype_matcher.py   # Matches minor antigens (Kell, Duffy, Kidd)
│   │
│   ├── services/
│   │   ├── guardian_service.py        # Circle building selection and health scoring
│   │   ├── mobilization_service.py    # Manages mobilization state machine transitions
│   │   ├── messaging_service.py       # Gemini prompt execution and Telegram Bot delivery
│   │   ├── voice_service.py           # Speech-to-Text translation and Text-to-Speech synthesis
│   │   └── discovery_service.py       # Queries Overpass API for Hyderabad blood banks
│   │
│   ├── models/
│   │   ├── patient.py                 # Patient schema (ABO/Rh, Kell/Duffy/Kidd flags, Hb level)
│   │   ├── guardian.py                # Guardian schema (role, status, scores, telegram_chat_id)
│   │   └── inventory.py               # Inventory schema (blood type, minor antigens, units, expiry)
│   │
│   ├── workers/
│   │   ├── scheduler.py               # Configures APScheduler cron triggers
│   │   └── bank_sync_worker.py        # Periodically pulls stock from external endpoints
│   │
│   ├── telegram_polling_dev.py        # Dev utility: clears webhooks and forwards local updates
│   ├── requirements.txt               # Explicit Python dependency pins
│   └── Dockerfile                     # Multi-stage build configured for Prophet
│
├── shared/
│   └── contracts/
│       ├── api.schema.json            # JSON schema source of truth
│       └── api.types.ts               # Autogenerated TypeScript types
```

---

## 7. Developer Onboarding & Local Setup

### 7.1 Configuration Setup
Create a `.env` file in the root directory:
```env
APP_ENV=development
APP_SECRET_KEY=local-dev-secret-key-32-chars-minimum-length-requirement
APP_HOST=0.0.0.0
APP_PORT=8000

# Relative SQLite path for zero-config onboarding
DATABASE_URL=sqlite+aiosqlite:///./backend/raktasetu.db
DATABASE_URL_SYNC=sqlite:///./backend/raktasetu.db
REDIS_URL=redis://localhost:6379

# Premium zero-cost API integrations
GOOGLE_API_KEY=your_google_cloud_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

### 7.2 Running the Application
```bash
# 1. Navigate to the backend directory
cd backend

# 2. Configure the Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 3. Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Run database migrations
alembic upgrade head

# 5. Seed the database with demo records
python db/seed_demo_data.py

# 6. Launch the backend API server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```
* **Interactive API Documentation:** Open [http://localhost:8000/docs](http://localhost:8000/docs) to access the interactive Swagger UI sandbox.
* **Diagnostics Health Check:** Confirm backend status at [http://localhost:8000/health](http://localhost:8000/health).

### 7.3 Testing the Telegram Bot (Local Environment)
To test the Telegram Bot locally without configuring webhooks or tunnels (like ngrok):
```bash
# Run the long-polling helper script in a separate terminal
python telegram_polling_dev.py
```
This script pulls updates from the Telegram Bot API and forwards them to your local webhook endpoint (`http://localhost:8000/api/v1/messaging/telegram/webhook`).

### 7.4 Running the Test Suite
```bash
# Execute unit and integration tests with coverage reporting
pytest tests/ -v --cov=. --cov-report=term-missing
```
