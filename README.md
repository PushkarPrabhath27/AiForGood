# 🩸 RaktaSetu NOOR
> **The body predicted it. The system prepared for it. The circle delivered it.**

[![RaktaSetu CI](https://github.com/PushkarPrabhath27/AiForGood/actions/workflows/backend.yml/badge.svg)](https://github.com/PushkarPrabhath27/AiForGood/actions)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js_14-000000?style=flat&logo=nextdotjs)](https://nextjs.org/)
[![Optimization](https://img.shields.io/badge/Google_OR--Tools-4285F4?style=flat&logo=google)](https://developers.google.com/optimization)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Product Vision

In India, **2 lakh Thalassemia Major patients** require blood transfusions every 21 days for life. Despite Thalassemia being mathematically predictable, the operational coordination of donor searches, hospital notifications, and rare blood matching is chaotic and reactive.

**RaktaSetu NOOR** changes this from a crisis-driven response to an automated, predictive coordination pipeline by fusing three clinical and operational innovations:

| Core Pillar | Technical Innovation | Clinical & Logistics Impact |
|:---|:---|:---|
| **🧠 NOOR Engine** | Personalized Hb decay forecasting via FB Prophet + CUSUM anomaly detection. | Models per-patient hemoglobin trajectories to predict the exact transfusion date weeks in advance. Suspicion algorithm detects early signs of alloimmunization. |
| **🛡️ RaktaMitra** | Permanent Guardian Circles relationship OS. | Replaces transactional donor pools with a resilient 8-donor permanent support circle per patient, triggering proactive donor outreach on a schedule. |
| **🌐 RaktaGrid** | City-wide, real-time blood bank inventory network. | Fuses isolated hospital blood banks into a cohesive city grid, executing expiry-aware matching and inter-bank transfers using Google OR-Tools. |

---

## 🏗️ System Architecture

```
                       ┌────────────────────────────────┐
                       │    RaktaSetu Client App        │
                       │   (Next.js 14 App Router)      │
                       └──────────────┬─────────────────┘
                                      │
                                      ▼ API Requests (Supabase JWT)
                       ┌────────────────────────────────┐
                       │     FastAPI Core Services      │
                       │         (Python 3.11)          │
                       └───────┬────────────────┬───────┘
                               │                │
            ┌──────────────────┘                └──────────────────┐
            ▼                                                      ▼
┌───────────────────────────────┐                      ┌───────────────────────────────┐
│     Clinical Brain            │                      │     Logistics Optimizer       │
│  • Prophet Hb Forecaster      │                      │  • OR-Tools Transfer Solver   │
│  • CUSUM Anomaly Detector     │                      │  • City-wide Inventory Grid   │
└───────────────────────────────┘                      └───────────────────────────────┘
            │                                                      │
            └──────────────────┐                ┌──────────────────┘
                               ▼                ▼
                       ┌────────────────────────────────┐
                       │       Relational Store         │
                       │    (SQLite / PostgreSQL)       │
                       └────────────────────────────────┘
```

---

## 📁 Repository Structure & Team Separation

To maintain strict boundaries and ensure a frictionless 2-person development lifecycle, the workspace is partitioned as a **Product vs. Platform Engineering** split:

```
raktasetu-noor/
├── frontend/               # Next.js 14 Frontend Application (Person 1)
│   ├── app/                # App router pages (Dashboard, Guardian Circles, RaktaGrid)
│   ├── components/         # Tailwind CSS + shadcn/ui components
│   └── package.json
├── backend/                # FastAPI & ML Core Services (Person 2)
│   ├── api/                # REST endpoints and controllers
│   ├── ml/                 # Prophet forecaster & CUSUM models
│   ├── services/           # Messaging, database ORM, and OR-Tools solvers
│   ├── tests/              # Pytest suite matching source structure
│   └── requirements.txt
├── shared/                 # Agreed-upon interface contracts (Both read-only)
│   ├── contracts/          # api.schema.json & generated api.types.ts
│   └── constants/          # Medical thresholds and status codes
├── .github/                # GitHub Action workflows and templates
├── docker-compose.yml      # Local Postgres & Redis container definition
├── .env.example            # Committed configuration template
└── README.md               # Root documentation manual
```

---

## 🚀 Developer Quick Start

### 1. Environment Setup

Copy `.env.example` to create your local environment:
```bash
# On Windows
copy .env.example .env

# On macOS / Linux
cp .env.example .env
```
*Note: The database connection defaults to a **relative SQLite database file** (`./backend/raktasetu.db`) to enable zero-config local development without port conflicts.*

### 2. Backend Initialization (FastAPI)

Navigate to the `backend/` directory and configure the Python environment:
```bash
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations and seed database
python db/seed.py

# Launch FastAPI development server
uvicorn api.main:app --reload --port 8000
```
Verify the server is running by visiting:
* **Health Check:** `http://localhost:8000/health`
* **Interactive API Documentation:** `http://localhost:8000/docs`

### 3. Frontend Initialization (Next.js)

Navigate to the `frontend/` directory, install packages, and spin up the hot-reload server:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to interact with the application.

---

## 🛡️ Production Engineering Standards

All contributions to this repository must respect the following standards:

* **Surgical Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat(api): add patient hemoglobin forecast endpoint`).
* **Line Endings:** Handled automatically by our `.gitattributes` file. Ensure your IDE is set to utilize `LF` endings for code files to prevent CI failure.
* **Testing:** Every endpoint, service, and optimization routine must ship with comprehensive unit tests inside the `backend/tests` module. Run `pytest` locally to ensure a passing test pipeline before opening a Pull Request.

---

## 🤝 Collaboration & Support

- **Branching Rule:** Work on isolated feature branches off `dev/person1-frontend` or `dev/person2-backend`. Merge into `main` only via validated Pull Requests.
- **Secrets Management:** **Never commit your `.env` file.** All API keys (Supabase, Claude, Twilio, Sarvam) must remain secure locally.

---
*Built with ❤️ for Thalassemia patients across India as part of the AI-for-Good hackathon.*
