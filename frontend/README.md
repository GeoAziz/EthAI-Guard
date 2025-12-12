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

Status page notes
-----------------
The `/status` page was updated to improve responsiveness and performance:

- Service cards now use a responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Long titles are truncated and provide a `title` attribute for hover/tooltip visibility.
- Charts are loaded dynamically (client-only) via a lightweight `DynamicChart` component to avoid bundling heavy chart libraries on first load. The component lives at `src/components/DynamicChart.tsx`.
- While data is loading, skeleton placeholders are shown and an offscreen `role="status"` message announces loading to assistive tech.

Quick smoke test
----------------
There's a small smoke test script you can run locally that checks the frontend `/api/status` endpoint. From the repo root run:

```zsh
# start your frontend dev server first (recommended: in a separate terminal)
cd frontend
npm run dev

# in another terminal, run the smoke test (defaults to http://localhost:3000/api/status)
node tools/tests/smoke-status.js

# or using the frontend npm script
npm --prefix frontend run smoke:status
```

You can optionally pass `--expect-source=mongo` to validate the response comes from Mongo (useful for CI or demo verification).
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
