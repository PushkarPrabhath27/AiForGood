# RaktaSetu NOOR — Development Handoff Registry

This file serves as the single source of truth for tracking project execution state, active configurations, completed phases, and upcoming steps. It ensures seamless continuation across AI session boundaries.

---

## 1. Project Specifications

* **Target AWS Region:** `us-east-1` (N. Virginia)
* **AWS Budget Limit:** $35.00
  * **RDS PostgreSQL:** Single-AZ `db.t3.micro`
  * **Cognito User Pool:** Free tier up to 50k MAU
  * **DynamoDB:** `PAY_PER_REQUEST` billing mode
  * **ElastiCache:** Swapped for a zero-cost local in-process Python dict-based mock Redis caching layer
  * **App Runner Sizing:** `0.5 vCPU / 1 GB` (safeguarded against OOM for Prophet + background tasks)
* **Caregiver Sentinel:** Text-only symptom checking (no voice notes / speech ASR / Sarvam translation)
* **Dataset Ingestion Source:** `Dataset.csv` (7,033 records) containing patient, donor, and operational histories
* **Demo Patient Mapping Strategy:**
  * **Priya:** Maps a B+ Female patient candidate from `Dataset.csv` to `550e8400-e29b-41d4-a716-446655440001`
  * **Vikram:** Maps a B+ Male patient candidate from `Dataset.csv` to `550e8400-e29b-41d4-a716-446655440002` (sets `kell_negative=True`, `alloimmunization_flag=True` to preserve clinical scenarios)
  * All other patients are seeded with stable UUIDs hashed from their hex keys via `uuid.uuid5`

---

## 2. Active Progress Checklist

- [x] **Phase 1: Persistence Tracking & Repository Setup**
  - [x] Create local `task.md` progress tracker
  - [x] Create root `handoff.md` registry
- [x] **Phase 2: AWS us-east-1 Infrastructure Provisioning**
  - [x] Provision RDS PostgreSQL instance
  - [x] Provision Cognito User Pool and Client
  - [x] Provision DynamoDB `DonorCompatibilityEdges` table (ensuring `BillingMode` GSI bugfix)
  - [x] Implement local mock Redis client wrapper
- [x] **Phase 3: Dataset Ingestion (Seeding)**
  - [x] Implement `seed_dataset.py` with stable `uuid.uuid5` hash mapping
  - [x] Execute seed script on RDS instance and verify integrity
- [x] **Phase 4: Auth & Bedrock SDK Migration**
  - [x] Set up Cognito JWT validation in `auth.py`
  - [x] Create `bedrock_service.py` utilizing Bedrock unified Converse API with Claude Haiku (cross-region profile)
  - [x] Expose `generate_message` alias from `bedrock_service.py`
- [x] **Phase 5: Database Migrations for the 6 Innovations**
  - [x] Alembic revision `930e034a9750` applied to RDS @ head
  - [x] All 15 tables confirmed live in RDS PostgreSQL
  - [x] 39/39 tests passing
- [x] **Phase 6: Core Logic Integration (The 6 Innovations)**
  - [x] **Innovation 1 — Living Circle CUSUM**: `services/donor_churn_service.py` + `workers/donor_churn_worker.py` — CUSUM score + re-engagement nudge via Bedrock; scheduled every 6h
  - [x] **Innovation 2 — Compatibility Graph**: `services/compatibility_graph_service.py` — DynamoDB upsert/query/eligibility toggle for donor-patient edges
  - [x] **Innovation 3 — Caregiver Sentinel**: `services/sentinel_service.py` — text keyword scorer, Hb deviation fusion, SentinelAlert creation; `api/routers/sentinel.py` (3 endpoints)
  - [x] **Innovation 4 — Donor Fatigue**: `services/fatigue_service.py` — ceiling enforcement, rest lift, DynamoDB edge ineligibility; `api/routers/fatigue.py` (3 endpoints); fatigue_lift scheduled daily at 01:00
  - [x] **Innovation 5 — Grief Protocol**: `services/grief_service.py` — patient deceased status, per-guardian Bedrock memorial, circle_repair_log; `api/routers/grief.py` (3 endpoints)
  - [x] **Innovation 6 — Blood Weather**: `services/blood_weather_service.py` — dataset-driven demand/supply aggregation, gap severity, weekly forecast; `api/routers/weather.py` (3 endpoints); scheduled daily at 03:00
  - [x] `workers/scheduler.py` updated with 3 new jobs (donor_churn, blood_weather, fatigue_lift)
  - [x] `api/main.py` updated with 4 new router registrations
  - [x] All 39 tests still passing
- [/] **Phase 7: Cloud Deployment & Final E2E Verification**
  - [x] Create `backend/apprunner.yaml` (0.5 vCPU / 1 GB memory)
  - [x] Integrate ECR build-tag-push and test suite into GitHub Actions workflow
  - [x] Programmatically inject AWS credentials into GitHub Secrets
  - [x] Push to main -> GitHub Actions tests pass, builds image, and pushes to Amazon ECR successfully!
  - [ ] Deploy FastAPI backend to AWS App Runner (Pending manual console creation due to IAM PassRole restrictions)
  - [ ] Run end-to-end dry run matching the revised demo narrative
  - [ ] Verify CloudWatch metric publishing

---

## 3. Provisioned Resources (us-east-1)

* **Cognito User Pool ID:** `us-east-1_YI3lZZIuK`
* **Cognito Client ID:** `2k0aad7vm3gd1sbog7e93guhbk`
* **Security Group ID:** `sg-0f625944417ed8cc2` (authorizes TCP port 5432 inbound)
* **DynamoDB Table Name:** `DonorCompatibilityEdges`
* **RDS Hostname:** `raktasetu-db.covwwscw4pp0.us-east-1.rds.amazonaws.com`
* **Secrets Manager Secret Name:** `raktasetu/db-password`
* **ECR Registry/Repository:** `235130525598.dkr.ecr.us-east-1.amazonaws.com/raktasetu-noor:latest`

---

## 4. Next Steps

1. **Create App Runner Service via AWS Console:**
   Because the `noor-dev-admin` IAM user lacks `iam:PassRole` permissions, please create the service manually in the console:
   - Go to: https://us-east-1.console.aws.amazon.com/apprunner/home#/create
   - Select **Amazon ECR** container registry.
   - Enter Image URI: `235130525598.dkr.ecr.us-east-1.amazonaws.com/raktasetu-noor:latest`
   - Set Deployment Trigger to **Automatic**.
   - Create a new service role for ECR Access (`AppRunnerECRAccessRole`).
   - Use `0.5 vCPU` and `1 GB` memory.
   - Set Port to `8080` and Health check path to `/health`.
   - Copy and paste the environment variables listed in [walkthrough.md](file:///C:/Users/pushk/.gemini/antigravity/brain/8a2e05fc-2567-4b07-9a1f-32650c9d83d0/walkthrough.md).

2. **Verify live endpoints & run E2E demo:**
   - Once deployed, hit `https://<your-app-runner-url>/health` to confirm `{"status":"ok"}`.
   - Run the validation test suite or manual smoke steps (e.g., Priya T-14 sentinel check-in, weather predictions, fatigueCeiling verification) on the live URL.

3. **Key Venv / Command to run anything:**
   ```
   C:\Users\pushk\OneDrive\Documents\AIforgood\.venv\Scripts\python.exe -m <module>
   ```
   Run from: `C:\Users\pushk\OneDrive\Documents\AIforgood\backend`

