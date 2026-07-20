# Admin System Spec

Version: 1.0
Date: 2025-11-29
Author: Assistant (spec)

Purpose
-------
This document defines the contract between the Admin UI and the backend for administrative flows. It maps UI actions to REST endpoints, request/response payloads, expected status codes and error semantics, idempotency and retry guidance, optimistic UI recommendations, claim-sync behavior with Firebase, and test scenarios (including using the Firebase Emulator).

Actors
------
- Admin: user with `role: admin`. Full access to admin pages.
- System: backend services that manage users, access requests, and Firebase custom claims.

Authentication & session
------------------------
- Admin UI uses the existing auth model: the frontend authenticates via Firebase (client SDK) and exchanges a Firebase ID token for backend access/refresh tokens at `POST /auth/firebase/exchange`.
- Backend endpoints require either a valid bearer JWT access token (in Authorization header) or HttpOnly cookies containing `accessToken`/`refreshToken` depending on configuration. The backend middleware `firebaseAuth` verifies Firebase tokens or backend JWTs depending on the endpoint.
- Email verification: backend enforces `decoded.email_verified === true` for any endpoint that requires an authenticated user (including `/auth/firebase/exchange`). Unverified Firebase accounts will get HTTP 403 with `{ error: 'email_not_verified' }`.

Common API conventions
----------------------
- All admin endpoints live under `/v1`.
- Requests and responses use JSON.
- On success: status 200 (or 201 for creates), response body contains `{ status: 'success', ... }` or the requested data. For list endpoints use `{ items: [...], count: N }`.
- Errors: return appropriate HTTP status codes with body `{ error: '<code>', message?: '<human>' }`.
  - 400: validation error (bad payload)
  - 401: unauthenticated
  - 403: forbidden (insufficient role or email not verified)
  - 404: not found
  - 409: conflict (e.g., duplicate email when creating)
  - 429: rate limited
  - 500: server error
- Idempotency: where applicable, endpoints should be idempotent for the same input (see per-endpoint notes).
- Rate limiting and input validation: apply server-side protections for admin endpoints that alter state (promote/sync/approve) to prevent accidental abuse.

Endpoints & contracts
---------------------

1) GET /v1/users
-- Purpose: List users for admin UI (Users page)
-- Auth: admin
-- Query parameters:
   - page (optional, integer, default 1)
   - limit (optional, integer, default 50)
   - q (optional, string) - email/name search
-- Response (200):
```
{
  "items": [
    { "_id": "...", "email": "user@example.com", "name": "User Name", "role": "user", "firebase_uid": "abc123", "createdAt": "..." },
    ...
  ],
  "count": 123
}
```
-- Errors: 401, 403
-- Notes: implement cursor pagination for large orgs; UI will pass `page` and `limit` and show paging controls.

2) POST /v1/users/promote
-- Purpose: Promote a user (or create + promote) and attempt to set Firebase custom claims.
-- Auth: admin
-- Payload:
```
{ "email": "user@example.com", "role": "admin" }
```
-- Response (200):
```
{
  "status": "success",
  "user": { "_id": "...", "email":"user@example.com","role":"admin","firebase_uid":"..." },
  "claimsSync": { "status": "success" }
}
```
-- Alternative responses:
- claimsSync skipped (e.g., firebase admin not configured or user has no firebase_uid yet):
```
{ "status":"success", "user": {...}, "claimsSync": { "status":"skipped", "message":"No firebase admin configured" } }
```
- claimsSync failed:
```
{ "status":"success", "user": {...}, "claimsSync": { "status":"failed", "message":"Firebase error: ...", "details": {...} } }
```
-- Errors: 400 (invalid input), 401, 403, 409 (conflict), 500
-- Idempotency & retry semantics:
- Promote is idempotent for the same role: calling `promote` multiple times with the same email+role should result in the same final state (user.role === role).
- If claimsSync fails, clients can retry `POST /v1/users/sync-claims` (see below).
- Promote should be implemented as a synchronous DB create/update + best-effort attempt to set Firebase custom claims; if claims setting is asynchronous (background job), return `claimsSync: { status: 'pending' }` and provide a `/v1/users/:id/claims-status` endpoint (optional) or rely on polling via GET `/v1/users` for updated firebase_uid/role.
-- UX notes:
- Optimistic UI: on successful promote response, the UI can immediately mark the user as admin (optimistic). If `claimsSync.status === 'failed'`, display persistent toast and a link/button to retry claims sync. If `claimsSync.status === 'skipped'`, show an explanation (e.g., "Firebase not configured") and guidance.
- Show per-action feedback: spinner while request in-flight, then toasts for success/failure, and an inline status badge for `claimsSync`.

3) POST /v1/users/sync-claims
-- Purpose: Attempt to set Firebase custom claims for an existing user by email.
-- Auth: admin
-- Payload:
```
{ "email": "user@example.com" }
```
-- Response (200):
```
{ "status": "success", "message": "claims synced", "details": { "firebaseUid": "..." } }
```
-- Alternative (skipped):
```
{ "status":"skipped", "message":"User does not have firebase_uid; create an account in Firebase first or run seeder." }
```
-- Errors: 400, 401, 403, 404 (user not found), 500
-- Idempotency & retry:
- This endpoint should be idempotent. Repeating the same call should eventually succeed (unless configuration or permissions change).
- Use exponential backoff for retries in UI if you implement automated retries.
-- UX notes:
- Show progress indicator; on success show toast and update user row (firebase_uid present). On failure, show error toast with the `message` and provide a "Retry" button.

4) PATCH /v1/users/:id/role
-- Purpose: Update a user role directly.
-- Auth: admin
-- Payload:
```
{ "role": "admin" }
```
-- Response (200):
```
{ "status":"success", "user": { "_id":"...","role":"admin" } }
```
-- Errors: 400, 401, 403, 404, 500
-- Idempotency: idempotent for same role.
-- UX: use optimistic UI to change role locally and revert on error. If role change should also be reflected to Firebase custom claims, call `/v1/users/sync-claims` after successful patch or let the server automatically do that and return `claimsSync` info.

5) GET /v1/users/:id/history
-- Purpose: Retrieve audit/change history for a user (used to show the modal in Users page)
-- Auth: admin
-- Response (200):
```
{ "logs": [ { "_id":"...", "event_type":"role_change", "actor":"admin@example.com", "action":"role: user -> admin", "timestamp": "...", "details": {...}}, ... ] }
```
-- Errors: 401, 403, 404

6) GET /v1/access-requests
-- Purpose: List pending/handled access requests
-- Auth: admin
-- Query params: page/limit optional
-- Response (200):
```
{ "items":[ { "_id":"...","email":"x@...","reason":"...","status":"pending","createdAt":"..." } ], "count": 3 }
```
-- Errors: 401, 403

7) POST /v1/access-requests/:id/approve
8) POST /v1/access-requests/:id/reject
-- Purpose: Admin approve/reject an access request (optionally email user)
-- Auth: admin
-- Payload:
```
{ "emailUser": true }
```
-- Response (200):
```
{ "status":"success", "message":"approved", "claimsSync": { ... } }
```
-- Errors: 400, 401, 403, 404, 500
-- Idempotency:
- Approve/reject should be idempotent (re-approving returns success but does not duplicate actions). Consider returning 409 if already processed to avoid duplicate email notifications.
-- UX:
- Confirmation dialog with the `emailUser` checkbox (already implemented). After action, show toast and refresh list. If `claimsSync` provided, show claim-sync toast and details.

9) POST /v1/users/promote (via access-requests 'promote' action)
-- Promote from access-requests reuse the same contract as the promote endpoint described above.

10) Audit log endpoints (GET /v1/audit?...) - suggestion
-- Provide filters: by actor, event_type, start/end timestamps, pagination. Responses include entries with details and references to affected resources.


Claims sync / Firebase behavior
------------------------------
- Goal: Keep backend `User.role` in Mongo and Firebase custom claims aligned.
- Server responsibilities:
  1. After local role change (create or update), attempt to set Firebase custom claims (via firebase-admin): `admin.auth().setCustomUserClaims(uid, { roles: [role] })`.
  2. If user's `firebase_uid` is missing, either:
     - Create a Firebase user (if allowed) with seeded email & password and persist `firebase_uid` in Mongo; or
     - Return `claimsSync` = skipped and instruct admin to create Firebase account.
  3. Return `claimsSync` information in the response so the UI can show sync outcome.
- Failure modes:
  - Network/API error to Firebase: return `claimsSync.status = 'failed'` with `message` and optional `details`. Allow admin to retry via `/v1/users/sync-claims`.
  - Permission error (service account insufficient): return `claimsSync.status = 'failed'` with message indicating missing permission.
- Idempotency: setCustomUserClaims is idempotent for same claims; calling multiple times with the same roles should succeed.
- Long-running syncs: if your design offloads claims setting to a background job, return `claimsSync.status: 'pending'` and provide a `GET /v1/users/:id/claims-status` or keep returning user with `claimsSync` state when asked.

Optimistic UI recommendations
-----------------------------
- Promote user:
  - Immediately mark the user row as `role: admin` (optimistic). Show a spinner or subtle badge "Saving...".
  - On success: replace spinner with success badge and show `claimsSync` status inline.
  - On error: revert the role to previous state and show an error toast with an action to retry (calls `/v1/users/promote` again).
- Claims sync:
  - If `claimsSync.status === 'failed'`, show a persistent row-level badge "Claims sync failed" with a "Retry" button.
  - If `claimsSync.status === 'skipped'`, show info tooltip explaining why and recommended steps.
- Access Requests:
  - Confirmation dialog should prevent accidental approvals; disable confirm button while processing.
  - After success, update item state in list (optimistic) and show toasts for both approve/reject and claim-sync.

Per-action UX details
---------------------
- Promote (Users page)
  - Form: email input + Promote button
  - During request: disable input and buttons, show inline spinner
  - On response: toast with `User promoted` and if `claimsSync` present show toast for claims result or an inline badge with status
- Retry claims-sync (Users list)
  - Show spinner on the button, show toast on success/failure, update row
- Per-user role patch button (Promote)
  - Inline role change with optimistic UI and toast
- Access Requests
  - Modal confirm with `emailUser` toggle
  - After action, show toast and update list
  - If claimsSync returned with status != success, surface details and provide retry controls

Error codes & UI mapping
------------------------
- 400 -> show validation error toast with server-provided message
- 401 -> redirect to /login and show toast "Session expired"
- 403 -> show descriptive toast: either "Not authorized" or "Email not verified" (if payload error === 'email_not_verified') and show link to verify instructions
- 404 -> show toast "Not found" and refresh data
- 409 -> show toast "Conflict" with server message
- 429 -> show toast "Too many requests, try later" and disable button briefly
- 500 -> show toast "Server error" and log details to the server; provide a retry action

Audit & observability
---------------------
- For every admin action (promote, sync-claims, approve/reject), create an audit entry with fields:
  - event_type (promote|claims_sync|access_request_approve|access_request_reject)
  - actor (admin email or id)
  - target (user id / email)
  - timestamp
  - outcome (success|failed|skipped)
  - details (error message or firebase response)
- Make audit entries accessible via `GET /v1/audit` with filters.

Testing guidance & scenarios (including emulator)
-------------------------------------------------
- Use Firebase Emulator Suite for CI tests to avoid real project secrets. Recommended approach:
  1. Start Firebase emulator (auth) in CI job.
  2. Configure backend in CI to point firebaseAdmin at emulator (use env vars or GOOGLE_APPLICATION_CREDENTIALS pointing to test service account adapted to emulator).
  3. Create a test user (unverified) in emulator via Admin SDK or REST. Ensure `emailVerified` is false.
  4. Call Firebase REST sign-in to obtain idToken for that unverified user.
  5. POST idToken to `/auth/firebase/exchange` and assert 403 with body `{ error: 'email_not_verified' }`.
  6. Using Admin SDK in emulator, set `emailVerified = true` for that user.
  7. Sign-in again, exchange token -> expect 200 with `accessToken`/`refreshToken`.
  8. Call `POST /v1/users/promote` with the test email; assert DB user created or updated with role `admin` and that Firebase custom claims include `roles: ['admin']` (read via Admin SDK in emulator).
  9. Delete/cleanup created users.

CI test cases (basic list):
- Promote creates DB user and sets firebase custom claims.
- Promote when firebase_uid missing: either create firebase account or return skipped — assert behavior matches configured policy.
- Retry claims-sync: call `/v1/users/sync-claims` after clearing claims in emulator and assert claims restored.
- Access request approve: create a fake access request in DB, call approve with `emailUser=false`, assert request status updated and no email sent; with `emailUser=true` assert an email was queued/sent to emulator SMTP or captured by emulator utilities.

Example API payloads / responses (summary)
-----------------------------------------
Promote request:
```
POST /v1/users/promote
Authorization: Bearer <admin-token>
{ "email": "alice@example.com", "role": "admin" }
```
Success:
```
200 OK
{ "status": "success", "user": {"_id":"u1","email":"alice@example.com","role":"admin","firebase_uid":"abcd"}, "claimsSync": {"status":"success"} }
```
Failure (claims failed):
```
200 OK
{ "status": "success", "user": {...}, "claimsSync": {"status":"failed", "message":"Permission denied"} }
```

Errors (example):
```
403 Forbidden
{ "error": "email_not_verified", "message": "User must verify email before exchange" }
```

Operational considerations
------------------------
- Make sure backend enforces both role checks and email_verified checks for security.
- Use secure cookies (`HttpOnly`, `Secure`, `SameSite=Strict`) for refresh/access tokens in production when `USE_COOKIE_REFRESH=1`.
- Ensure Firebase Admin service account used in production has the required IAM permissions.
- If claims setting is delegated to background workers, surface a `claims_status` field in the user resource for UI polling.

Backward compatibility and migration notes
-----------------------------------------
- If the system previously seeded only Mongo users and not Firebase, ensure the seeder creates Firebase entries or document the new requirement clearly.
- For existing users lacking `firebase_uid`, `/v1/users/promote` should either create a Firebase user (if allowed) or return `claimsSync: 'skipped'` and a helpful message.

Appendix — Recommended response shapes for UI
--------------------------------------------
Success (generic):
```
{ "status": "success", "data": { ... } }
```
Operation with claim-sync:
```
{
  "status": "success",
  "user": { "_id":"...","email":"...","role":"admin","firebase_uid":"..." },
  "claimsSync": { "status": "success" | "skipped" | "failed" | "pending", "message": "...", "details": { ... } }
}
```

Closing notes
-------------
This spec is intended to be a living document aligned with the current frontend implementation. Once you review, I can:
- Implement `GET /v1/users` server-side pagination and matching UI controls.
- Add `GET /v1/users/:id/claims-status` (if you prefer background claims tasks).
- Add the Firebase Emulator CI test harness and example Jest tests that follow the scenarios above.

If you want, I can open a PR with this spec file and follow-up tasks (pagination, emulator tests) implemented next.
