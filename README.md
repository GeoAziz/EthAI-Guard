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
This repository includes a minimal `docker-compose.yml` to start a stub frontend and backend plus MongoDB and PostgreSQL for local development.

1. Copy `.env.example` to `.env` and edit values if needed.

2. Start services:

```bash
docker-compose up --build
```

3. Visit `http://localhost:3000` for the frontend stub and `http://localhost:8000/health` for backend health.


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
