## Local demo notes (secrets and test mode)

This project supports a lightweight demo mode that runs the backend entirely in-memory for local development and testing. Follow these safety guidelines and steps.

1) Secrets
 - DO NOT commit service account credentials or other secrets to git. The file `serviceAccountKey.json` must not be tracked in the repository.
 - If you need Firebase Admin locally, place the JSON file in a secure local location (for example, `~/.ethai/serviceAccountKey.json` or `/etc/secrets/serviceAccountKey.json`) and point `GOOGLE_APPLICATION_CREDENTIALS` to it.
 - In production, use your platform's secret manager (Render Secret Files, Kubernetes Secrets, GitHub Actions secrets, etc.) and set `GOOGLE_APPLICATION_CREDENTIALS` accordingly.

2) Why we removed the file
 - A copy of `serviceAccountKey.json` was previously present in the repo; it has been removed from the tracked files to avoid accidental leakage. The file is now listed in `.gitignore`.

3) Running locally (backend in test/in-memory mode)

 - Start the backend in test (in-memory) mode:

   cd /mnt/devmandrive/EthAI
   NODE_ENV=test PORT=5000 node backend/src/server.js

 - Check health:

   curl -sS http://localhost:5000/health | jq .

 - Expected: HTTP 200 and a small JSON payload or OK text depending on configuration.

4) Running the frontend

 - From the `frontend/` directory:

   cd frontend
   npm install
   npm run dev

 - Open http://localhost:3000 (or the port Next prints) and use the UI. In dev, `NEXT_PUBLIC_API_URL` from your env (or `.env.local`) should point to the backend (e.g. `http://localhost:5000`).

5) If you want to enable Firebase Admin locally (optional)

 - Save your service account JSON somewhere outside the repo, e.g. `~/.ethai/serviceAccountKey.json`.
 - Export env var before starting backend:

   export GOOGLE_APPLICATION_CREDENTIALS=$HOME/.ethai/serviceAccountKey.json

 - Set `AUTH_PROVIDER=firebase` in your environment (or `.env.local`) if you want the backend to try to initialize Firebase Admin.

6) Notes
 - `.env.example` contains the list of environment variables to set (non-secret examples). Do not copy secrets into the repo.
 - For CI and production, prefer secret manager integration rather than file-based secrets.
