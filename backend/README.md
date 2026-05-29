# RaktaSetu NOOR — Backend Engine

RaktaSetu NOOR is an AI-driven, predictive blood management engine designed specifically for Thalassemia care. It orchestrates clinical predictive algorithms, automated guardian circle tracking, combinatorial inventory matching, and empathetic AI communication streams.

---

## 🚀 Key Functional Architectures

1. **NOOR Core ML Engine**:
   - **Hemoglobin Decay Forecaster**: Utilizes Facebook Prophet to model individual hemoglobin (Hb) time-series decay and predict exact threshold crossings (7.0 g/dL) with custom clinical event regressors.
   - **CUSUM Alloimmunization Anomaly Detection**: Implements a highly sensitive one-sided upper CUSUM process control chart ($H = 0.4$, $K = 0.5$) tracking post-transfusion Hb rise recovery drops.
   - **Serum Ferritin Alerts**: Evaluates historical chelation data to fire iron overload alerts (warning: 2500–3000 ng/mL; critical: >3000 ng/mL).

2. **RaktaMitra Guardian Network & Mobilization**:
   - **Composite Circle Builder**: Scores candidates on blood compatibility (40%), response latency (20%), geographic location (20%), and minor antigens (20%) to build a permanent 8-slot circle.
   - **Continuous Circle Health**: Tracks coverage, engagement, and pair-survivability resilience.
   - **T-14 Countdown State Machine**: Automates T-10/T-7/T-3/T-0 notifications and hospital allocations.

3. **RaktaGrid Optimization Solver**:
   - **Google OR-Tools CP-SAT**: Formulates a multi-objective binary assignment IP problem matching predicted patient transfusions to physical units, maximizing matches while minimizing distance and expiries.

4. **Empathetic AI Coordination Pipeline**:
   - **Claude 3.5 Sonnet**: Dynamic composition of child-centered, native language coordination updates.
   - **Twilio SMS/WhatsApp Gateway**: Real-time WhatsApp notifications with local mock-mode fallbacks.
   - **Saathi Virtual Chatbot**: Contextual Regex-driven assistant answering eligibility, Hb levels, and alloimmunization terms.

---

## 🛠 Local Setup & Development

### Prerequisites
- Python 3.11+
- Redis (installed locally or via Docker)
- SQLite (default dev database)

### Installation
1. Initialize virtual environment and activate:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # On Windows
   source .venv/bin/activate # On Unix
   ```
2. Install pinned dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Initialize the database schema and seed historical data:
   ```bash
   alembic upgrade head
   python db/seed_demo_data.py
   ```
4. Verify seeded database data:
   ```bash
   python db/verify_seed.py
   ```
5. Launch the FastAPI development server:
   ```bash
   uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 🧪 Testing Suite
Execute the entire 29-test automated suite (including forecasters, CP-SAT solvers, and worker threads):
```bash
$env:PYTHONPATH="."
pytest tests/ -v
```

---

## 📁 Project Environment Schema

Create a `.env` in the backend root directory mapping:
```bash
# General Configurations
APP_ENV=development
APP_SECRET_KEY=32_character_hexadecimal_string_here
APP_HOST=0.0.0.0
APP_PORT=8000

# Database Connections
DATABASE_URL=sqlite+aiosqlite:///raktasetu.db
DATABASE_URL_SYNC=sqlite:///raktasetu.db

# Cache Services
REDIS_URL=redis://localhost:6379

# Clinical AI / Carrier Messaging Integrations
ANTHROPIC_API_KEY=sk-ant-xxx               # Leave empty for local template fallbacks
TWILIO_ACCOUNT_SID=ACxxx                   # Leave empty for mock WhatsApp send mode
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
SARVAM_API_KEY=xxx
```

---

## 🐳 Production Deployment

### Docker Packaging
The backend is packaged inside `Dockerfile` utilizing a slim Debian Python base and compiles Stan regressors:
```bash
docker build -t raktasetu-backend ./backend
```

### Railway Hosting
Deploy easily on Railway using the provided `railway.json` blueprint. Add all environment variables in your service settings dashboard.
