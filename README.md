# EthixAI

Empowering Ethical, Transparent, and Inclusive Financial Decisions Through AI.

Quick start
-----------
This repository contains the EthixAI ethical AI governance engine prototype (FastAPI backend + React dashboard + fairness/interpretability modules).

What’s here
-----------
- `backend/` — FastAPI service, ML logic, fairness and explainability endpoints.
- `frontend/` — React + Tailwind dashboard UI.
- `ml/` — notebooks and scripts for dataset prep, fairness experiments.
- `docs/` — product spec and CBK-aligned submission documents.

Run locally (Docker)
--------------------
This repository includes a `docker-compose.yml` that runs the frontend, the Express system API, the ai_core service, MongoDB and Postgres for local development.

1. Copy `.env.example` to `.env` and edit values if needed. Also copy `frontend/.env.example` to `frontend/.env` when developing locally.

2. Start services (build images on first run):

```bash
docker-compose up --build
```

3. Visit the services:

- Frontend: http://localhost:3000
- Express system API: http://localhost:5000/health
- ai_core FastAPI: http://localhost:8100/health

Run tests locally
-----------------
- AI Core (Python):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r ai_core/requirements.txt
pytest ai_core/tests
```

- Backend (Node):

```bash
cd backend
npm ci
npm test
```

- Frontend (Next.js):

```bash
cd frontend
npm ci
npm run build

End-to-end smoke test
---------------------
After starting services with `docker-compose up --build`, run the e2e smoke test:

```bash
cd tools/e2e
npm install  # first time only
npm test
```

The script will:
1. Check system health
2. Register a new user
3. Login and get auth token
4. Send dataset to `/analyze` endpoint
5. Fetch the persisted report
6. Verify all responses are correct

Expected output: `Smoke test passed` ✅


Day 1 deliverables
-------------------
- One-page product spec: `docs/product_spec.md` (this project’s scope and acceptance criteria).

Next actions
------------
1. Run Day 1 kickoff meeting to finalize scope and owners.
2. Scaffold backend and frontend (choose an option with the dev lead).
3. Prepare demo dataset and begin fairness experiments.

Day 6 — Demo & Integration
--------------------------
We completed Day 6 tasks to produce a demo-ready end-to-end flow (frontend ↔ backend ↔ ai_core).

Quick how-to:

```bash
# make demo script executable and run it (requires Docker)
chmod +x tools/e2e_demo.sh
./tools/e2e_demo.sh
```

More details and troubleshooting are in `docs/day6-demo.md`.

Contact
-------
Team Lead: Hassan AbdulAziz
