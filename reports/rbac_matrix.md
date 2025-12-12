# RBAC Matrix — Seeded Test Users

Generated: 2025-11-29

This file summarizes the role capabilities and the results of the RBAC checks performed against the local backend after seeding the test users (emails and passwords from `creds.md`). All checks were run against the API endpoints: POST /auth/login, GET /v1/users/me, GET /reports, and GET /v1/users (admin-only).

## Summary (per role)

- **Admin (promote-test@example.com)**
  - Can authenticate (login).
  - Can view own profile (`GET /v1/users/me`).
  - Can fetch reports (`GET /reports`).
  - Can list all users and access admin-only endpoints (`GET /v1/users`).

- **Analyst (analyst-test@example.com)**
  - Can authenticate.
  - Can view own profile.
  - Can fetch reports.
  - Cannot access admin endpoints (`GET /v1/users` returned 403 Insufficient permissions).

- **Reviewer (reviewer-test@example.com)**
  - Can authenticate.
  - Can view own profile.
  - Can fetch reports.
  - Cannot access admin endpoints (403).

- **Regular user (user-test@example.com)**
  - Can authenticate.
  - Can view own profile.
  - Can fetch reports.
  - Cannot access admin endpoints (403).

- **Guest (guest-test@example.com)**
  - Can authenticate.
  - Can view own profile.
  - Can fetch reports.
  - Cannot access admin endpoints (403).

## Test results (concise)

All logins returned HTTP 200 and produced a valid access token. For each role the following endpoint results were observed:

- `POST /auth/login` — 200 for all seeded users
- `GET /v1/users/me` — 200, returned correct email and role for each user
- `GET /reports` — 200, returned empty reports list for all users in this test run
- `GET /v1/users` — 200 for admin (returned 5 users), 403 for non-admin roles with an explicit "Insufficient permissions" response

## Notes & recommendations

- These tests were run against a local development environment after dropping and recreating the `users` collection to ensure clean seeded accounts and deterministic passwords. The operation is destructive and intended for local/dev use only.
- The RBAC enforcement is implemented in the backend `authGuard` / `requireRole` middleware; admin-only checks correctly require the `admin` role.
- For better long-term safety, add automated integration tests (e.g., Jest / supertest) that exercise these RBAC flows and run on CI to prevent regressions.

If you want, I can also add the raw JSON responses (saved under `/tmp` during the run) into a zipped archive in `reports/` for auditing, or create a small automated test suite that asserts the same matrix programmatically.
