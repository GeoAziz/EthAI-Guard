## Frontend Setup

This project uses React + Vite and Tailwind CSS. The frontend lives in `frontend/`.

To run locally:

1. Install dependencies

```bash
cd frontend
npm ci
```

2. Start dev server

```bash
npm run dev
```

Environment
- `VITE_API_BASE_URL` — the backend base URL (e.g., http://localhost:5000)

Notes
- The frontend currently contains stubs for Dashboard, Upload, Reports, Compliance, Login and Register.
- Connect the real API by setting `VITE_API_BASE_URL` and implementing axios client usage in `src/utils/api.js`.
