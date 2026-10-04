# Sentinel — AI-Based Disaster Prediction and Response System

A full-stack, multi-hazard disaster intelligence and emergency response platform:
flood and fire risk prediction (ML), live earthquake monitoring (USGS), live weather
(Open-Meteo), an interactive hazard map, SOS/incident reporting with photo upload,
an emergency safety chatbot, threshold-based alerting, and an admin command center
for incident verification, rescue coordination, and analytics.

> **Honesty note:** This is a portfolio/demonstration project. The flood and fire ML
> models are trained on a clearly-labeled **synthetic** dataset (generated with
> domain-informed heuristics — see `backend/ml/datasets/generate_datasets.py`), not
> real historical disaster records. Earthquake data comes from the live USGS feed
> when reachable; fire hotspots come from NASA FIRMS when a `NASA_FIRMS_MAP_KEY` is
> configured. When any external source is unreachable, the app clearly falls back to
> flagged demo data rather than pretending it's live. This platform does not replace
> official emergency services.

---

## 0. Quick start (one-command setup)

If you'd rather not run each install step manually, use the scripts in `scripts/`:

**Windows (cmd.exe — recommended over PowerShell to avoid venv activation policy issues):**
```
scripts\setup.bat
```
Then, in two separate terminal windows:
```
scripts\start-backend.bat
scripts\start-frontend.bat
```

**macOS / Linux:**
```bash
./scripts/setup.sh
```
Then, in two separate terminals:
```bash
./scripts/start-backend.sh
./scripts/start-frontend.sh
```

`setup` creates the Python virtual environment, installs backend + frontend
dependencies, copies `.env.example` → `.env` on both sides, trains the ML
models, and seeds demo data — all in one go. After that, open
**http://localhost:5173** and log in with the demo accounts in §4.

If anything in the quick start fails, the manual steps in §4–§5 below do the
exact same things individually, which makes it easier to see where it broke.

---

## 1. Tech stack

**Frontend:** React 19 + Vite, Tailwind CSS, Framer Motion, React Router, React Leaflet, Recharts, Lucide icons, Axios.

**Backend:** FastAPI, SQLAlchemy, Pydantic v2, JWT auth (python-jose), bcrypt password hashing (passlib), httpx for external API calls.

**ML:** scikit-learn (RandomForestRegressor), pandas, numpy, joblib.

**Database:** SQLite by default (zero config). Swap `DATABASE_URL` for PostgreSQL/PostGIS at any time — the SQLAlchemy models don't change.

**External APIs:** USGS Earthquake feed, Open-Meteo (weather), NASA FIRMS (fire hotspots, optional — requires a free API key).

**Chatbot LLM:** Groq (`openai/gpt-oss-120b`) via its OpenAI-compatible endpoint, with an automatic rule-based fallback when no API key is configured.

---

## 2. Project structure

```
disaster-platform/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routers (auth, predictions, hazards, weather, risk, incidents, alerts, rescue, chat, admin)
│   │   ├── core/           # config.py, security.py
│   │   ├── database/       # SQLAlchemy session/engine
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # external_apis.py, chatbot.py, risk_engine.py
│   │   ├── ml/             # predictor.py (loads joblib models)
│   │   └── main.py
│   ├── ml/
│   │   ├── datasets/       # generate_datasets.py + generated CSVs
│   │   ├── training/       # train_models.py
│   │   └── models/         # trained .joblib files (generated)
│   ├── tests/               # pytest suite
│   ├── uploads/              # incident photo uploads
│   ├── seed.py               # demo data seeding script
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # Landing, Login, Register, Dashboard, RiskMap, Predictions, Alerts, Incidents, Assistant, Admin
│   │   ├── components/      # shared UI primitives
│   │   ├── layouts/          # AppShell (sidebar/mobile nav)
│   │   ├── context/          # AuthContext, ToastContext
│   │   ├── services/api.js   # Axios API client
│   │   └── utils/
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 3. Requirements

- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker + Docker Compose, if you'd rather not install Python/Node locally

---

## 4. Backend setup

```bash
cd backend
python -m venv venv

# Windows (PowerShell)
venv\Scripts\Activate.ps1
# Windows (cmd.exe) — use this if PowerShell's execution policy blocks activation
venv\Scripts\activate.bat
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Environment
copy .env.example .env      # Windows
cp .env.example .env        # macOS/Linux
# Edit .env if you want to enable Groq chat, NASA FIRMS, or PostgreSQL

# Train the ML models (also auto-runs on first prediction request if skipped)
python ml/training/train_models.py

# Seed demo data (admin + demo user, sample incidents/alerts/rescue ops)
python seed.py

# Run the API
uvicorn app.main:app --reload --port 8000
```

- API root: http://localhost:8000/
- Interactive Swagger docs: **http://localhost:8000/docs**
- Health check: http://localhost:8000/api/health

**Demo accounts (created by `seed.py`):**
| Role  | Email                          | Password   |
|-------|--------------------------------|------------|
| Admin | admin@disasterplatform.dev     | Admin@123  |
| User  | demo@disasterplatform.dev      | Demo@123   |

---

## 5. Frontend setup

```bash
cd frontend
npm install

copy .env.example .env      # Windows
cp .env.example .env        # macOS/Linux
# VITE_API_BASE_URL=http://localhost:8000 (default is already correct for local dev)

npm run dev
```

Open **http://localhost:5173**.

Production build: `npm run build` (outputs to `frontend/dist`), preview with `npm run preview`.

---

## 6. Configuration reference (`backend/.env`)

| Variable | Purpose | Default / notes |
|---|---|---|
| `SECRET_KEY` | JWT signing secret | **Change this** before any real deployment |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./disaster_platform.db`; switch to `postgresql://user:pass@host:5432/db` any time |
| `GROQ_API_KEY` | Enables the LLM-powered chatbot | Leave blank to use the built-in rule-based fallback |
| `GROQ_MODEL` | Groq model name | `openai/gpt-oss-120b` |
| `NASA_FIRMS_MAP_KEY` | Enables live fire hotspot data | Leave blank to use seeded demo hotspots |
| `USGS_EARTHQUAKE_FEED_URL` | Live seismic feed | Public, no key required |
| `OPEN_METEO_BASE_URL` | Live weather | Public, no key required |
| `FRONTEND_ORIGIN` | CORS allow-list | `http://localhost:5173` |

Nothing in this app requires a paid API key to run end-to-end — every external
integration has a documented, clearly-labeled fallback.

---

## 7. ML model setup / retraining

The flood and fire models are trained from a synthetic, domain-informed dataset
(rainfall/soil-saturation → flood risk; heat/wind/dryness → fire risk). To regenerate
the dataset and retrain from scratch:

```bash
cd backend
python ml/datasets/generate_datasets.py   # regenerate ml/datasets/*.csv
python ml/training/train_models.py         # retrain + save ml/models/*.joblib
```

To use a real dataset instead, replace the generated CSVs with one that has the same
column names (`FLOOD_FEATURES` / `FIRE_FEATURES` in `train_models.py`) and re-run
the training script — the API layer doesn't need to change.

---

## 8. Running with Docker

```bash
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

The backend container trains the models and seeds demo data automatically on first boot.

---

## 9. Running tests

```bash
cd backend
pytest -v
```

Covers: authentication (register/login/invalid password), flood & fire prediction
endpoints, incident creation + listing, and alert-threshold risk-level logic, plus a
basic health check.

---

## 10. Troubleshooting

- **`ModuleNotFoundError` on backend start** — make sure the virtual environment is
  activated and `pip install -r requirements.txt` completed without errors.
- **PowerShell blocks `venv\Scripts\Activate.ps1`** — run
  `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first, or activate with
  `venv\Scripts\activate.bat` in `cmd.exe` instead.
- **CORS errors in the browser console** — confirm `FRONTEND_ORIGIN` in `backend/.env`
  matches the URL you're opening the frontend from.
- **Weather/earthquake data looks empty** — these calls fail soft when the external
  API is unreachable (e.g. no internet, corporate firewall); the app keeps working
  with cached/demo data and will pick up live data again automatically once reachable.
- **Chatbot always gives short canned answers** — that's the rule-based fallback; set
  `GROQ_API_KEY` in `backend/.env` and restart the backend to enable the LLM.
- **`sqlite3.OperationalError: database is locked`** — stop any other process also
  running against `disaster_platform.db` (e.g. a second uvicorn instance).

---

## 11. Known simplifications (by design, for a runnable portfolio build)

- SMS alerts are **simulated** (logged, not actually sent) unless you wire in a real
  SMS provider.
- Email alerts are modeled in the data layer but not wired to an SMTP provider —
  add one in `app/services/` if needed.
- The ML models use synthetic training data (see §7) — swap in a real dataset before
  using this for anything beyond a demo/portfolio.
- Rate limiting / production-grade observability (structured logging, metrics) is
  intentionally left minimal to keep the project easy to read and run.
#   A I - D i s a s t e r  
 