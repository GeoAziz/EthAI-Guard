# User guide — Quick demo walkthrough

This guide shows the minimal steps a judge or internal reviewer should take to run the EthixAI demo locally.

Prerequisites

- Docker & Docker Compose installed
- Node 20+ and npm
- Python 3.11 (for ai_core local development)

Quick start (Docker Compose)

1. Copy `.env.example` to `.env` and adjust secrets if desired:

   cp .env.example .env

2. Build and bring up the stack:

   docker compose up --build -d

3. Run the demo script (automates register/login/analyze flow):

   ./tools/e2e_demo.sh

4. Open the frontend at http://localhost:3000 and navigate to the created report URL printed by the demo script.

Manual flow (no Docker)

1. Start Mongo and Postgres locally.
2. Set environment variables from `.env.example`.
3. Start backend:

   cd backend
   npm ci
   npm start

4. Start ai_core (in a venv):

   cd ai_core
   python -m venv .venv
   . .venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8100

5. Start frontend:

   cd frontend
   npm ci
   npm run dev

Example dataset

Place a demo CSV in the upload flow. We include `docs/example_data/demo.csv` as a small synthetic dataset for quick testing.

Support

If anything fails during the demo, check service logs (`docker compose logs -f`) and retry the `tools/e2e_demo.sh` script. For quick local testing without persistence, run the backend with `USE_IN_MEMORY_DB=1`.
