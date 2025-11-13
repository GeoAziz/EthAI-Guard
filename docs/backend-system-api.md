## System API (Express) — Backend Design

This service handles authentication, dataset uploads, and orchestration of reports.

Core routes
- POST /auth/register
- POST /auth/login
- POST /datasets/upload
- GET /reports/:userId

Implementation notes
- Currently a minimal Express skeleton lives in `backend/`.
- Mongoose models and JWT auth will be connected in Phase 2.
