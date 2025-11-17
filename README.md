# EthixAI

Empowering Ethical, Transparent, and Inclusive Financial Decisions Through AI.

Quick start
-----------
This repository contains the EthixAI ethical AI governance engine prototype (FastAPI backend + React dashboard + fairness/interpretability modules).

What’s here
-----------
- `backend/` — Express system API (evaluation pipeline, storage layer), authentication, health probes.
- `ai_core/` — FastAPI ML microservice for analysis and reports.
- `frontend/` — Next.js + Tailwind dashboard UI.
- `docs/` — product spec, architecture, UX, and compliance docs.

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

Day 17 — E2E Ethical Evaluation Pipeline
----------------------------------------
We implemented the E2E-DEEP pipeline in the backend and UI:
- Simulation engine (deterministic pseudo-model)
- Rules engine (fairness/bias/compliance)
- Risk scoring (0-100 + low/medium/high)
- Explanation generator (summary, details, recommended action)
- API: `POST /v1/evaluate`
- Frontend: `src/app/decision-analysis/page.tsx` with animated RiskGauge

Day 18 — Advanced Evaluation Pipeline + Storage Layer
-----------------------------------------------------
Added a compliance-grade audit trail and history UI.

- Storage: Firebase Firestore collection `ethical_evaluations`
- Backend storage module: `backend/src/storage/evaluations.js`
- Persist every evaluation result (non-blocking) and return `storage_id`
- API endpoints:
	- `GET /v1/evaluations` — list with filters (risk_level, model_id, pagination)
	- `GET /v1/evaluations/:id` — full evaluation detail
- Frontend:
	- History dashboard: `frontend/src/app/history/page.tsx`
	- Evaluation details: `frontend/src/app/history/[id]/page.tsx`
- Docs:
	- `docs/storage-architecture.md`
	- `docs/audit-trail-design.md`
	- `docs/ux-design/history-ui.md`

Environment
-----------
- Set `AUTH_PROVIDER=firebase` to enable Firebase auth (required for history endpoints)
- Configure Firebase Admin credentials via environment (see security docs); Firestore is accessed server-side only
- Frontend expects `NEXT_PUBLIC_BACKEND_URL` for API calls (default http://localhost:5001 in dev pages)

Try it
------
1. Run the stack with Docker Compose.
2. Open `/decision-analysis`, submit an evaluation.
3. You should see a `storage_id` in the response and a new record in Firestore.
4. Open `/history` to view your evaluations; click through to details.


More details and troubleshooting are in `docs/day6-demo.md`.

Contact
-------
Team Lead: Hassan AbdulAziz
