# Production Hardening Checklist (Firebase + Backend)

This document lists small, actionable steps to harden Firebase and backend before production.

1) Service account & secrets
- Rotate the Firebase service account key periodically (90 days recommended).
- Do NOT commit `serviceAccountKey.json` to git. Use secret storage:
  - Preferred: cloud provider secret manager (AWS Secrets Manager / GCP Secret Manager / Azure Key Vault)
  - Acceptable: GitHub Actions repository secrets + environment variables in deploy target
- Environment variables recommended for Render/Vercel/Heroku:
  - FIREBASE_CLIENT_EMAIL
  - FIREBASE_PRIVATE_KEY (include BEGIN/END lines; escape newlines if necessary)
  - FIREBASE_PROJECT_ID
  - GOOGLE_APPLICATION_CREDENTIALS (if using a secret file mounted)

2) Least privilege for service account
- Create a service account with only the roles you need:
  - `Firebase Authentication Admin` (or `roles/firebase.admin` scope)
  - Avoid broad roles like `Owner` or `Editor`.
- Use separate service accounts for CI/emulator vs production.

3) Secure tokens & cookies
- In production set `USE_COOKIE_REFRESH=1` and store refresh token as Secure HttpOnly cookie.
- Enforce `sameSite=strict` and `secure=true` in production.
- Back-end must validate device info and rotationId for refresh token reuse detection.

4) CORS & allowed origins
- Set `ALLOWED_ORIGINS` to explicit list of production frontend origins.
- Reject unknown origins in CORS middleware; allow non-browser tools by absence of origin.

5) JWT secrets and rotation
- Use strong secrets for `SECRET_KEY` and `REFRESH_SECRET` (random 32+ bytes).
- Store secrets centrally and rotate on schedule; support key id (kid) in JWT if needed.

6) Audit logging & monitoring
- Ensure audit logs for promotions/syncs include actor, target_user, and request_id.
- Send logs to a central logging system (ELK / Datadog / Cloud Logging) and retain for 90+ days.
- Add alerts for suspicious events: repeated refresh token reuse, mass promotions, or spikes in 401.

7) Rate limiting and abuse controls
- Keep rate limiting on `POST /auth/login` and `POST /auth/firebase/exchange`.
- Add per-IP and per-account throttles; escalate after repeated failures.

8) CI & pre-deploy checks
- Add `FRONTEND_SMOKE_URL` repo secret for axe smoke CI.
- Run promote + claims smoke during staging deploys using a staging service account and test Firebase project.

9) Emergency rollback
- Tag released artifacts and keep previous tags available for quick rollback.
- Keep DB backups and a documented restore procedure.

10) Developer access & least privilege
- Limit who can create/rotate Firebase keys; require PR and code review for env changes.

Appendix: Minimal env vars to set in production
- MONGO_URL
- SECRET_KEY
- REFRESH_SECRET
- AUTH_PROVIDER=firebase
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- FIREBASE_PROJECT_ID
- USE_COOKIE_REFRESH=1
- ALLOWED_ORIGINS=https://app.example.com


