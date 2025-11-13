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

End-to-end smoke test (local)
----------------------------
After starting services with `docker-compose up --build` you can run a lightweight smoke test (node required):

```bash
node tools/e2e/smoke_test.js
```

The script will call the system API to register/login, request an analysis, and attempt to fetch the persisted report.
```


Day 1 deliverables
-------------------
- One-page product spec: `docs/product_spec.md` (this project’s scope and acceptance criteria).

Next actions
------------
1. Run Day 1 kickoff meeting to finalize scope and owners.
2. Scaffold backend and frontend (choose an option with the dev lead).
3. Prepare demo dataset and begin fairness experiments.

Contact
-------
Team Lead: Hassan AbdulAziz
