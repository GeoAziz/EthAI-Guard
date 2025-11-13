# Frontend (EthixAI)

Local dev notes for the Next.js frontend.

Environment
-----------
Copy the example env file and adjust if needed:

```bash
cp frontend/.env.example frontend/.env
```

Run locally
-----------

Install deps and build:

```bash
cd frontend
npm ci
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

API
---
The frontend expects `NEXT_PUBLIC_API_URL` to point to the Express system API which proxies auth and analysis endpoints (default `http://localhost:5000`).
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
