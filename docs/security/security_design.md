# Security Design

This summary covers the main safety and security measures implemented for the Day‑8 reliability run.

Implemented controls
- Rate limiting: global per‑IP rate limiting added to the backend using `express-rate-limit` (default 60 requests/min). Configure via `RATE_MAX` and `RATE_WINDOW_MS` environment variables.
- Input validation: `express-validator` used on auth and analyze endpoints to validate and sanitize inputs; request body size limited with `express.json({ limit })`.
- Secrets: follow pre-commit detect-secrets baseline policy (no secret material committed). Keep secrets off in `.env` examples and use environment variables in deployment.
- Error handling: centralized error handler that hides stack traces in production and returns generic 502/500 responses for external failures.

Operational guidance
- Run services in an isolated network and limit host port exposure. For demos, avoid binding Mongo directly to host default ports unless necessary.
- Add an API gateway or application firewall for production demos to terminate TLS and provide further rate-limiting and WAF rules.

Next steps
- Add auth rate limiting for sensitive endpoints (login/register) and CAPTCHAs for high-risk flows.
- Integrate an audit log exporter (structured JSON logs to a logging backend) and rotate logs.

Auth hardening implemented
- Password policy: production defaults to minimum 12 characters (configurable with MIN_PASSWORD_LENGTH). Tests and in-memory mode keep a lower minimum to avoid breaking CI.
- Login throttling: an additional login-specific rate limiter is enabled (10 attempts per 5 minutes by default).
- Refresh token rotation: refresh tokens are rotated on use. Tokens are stored server-side (demo map in-memory); in production persist token hashes and revoke old tokens on rotation.
- Secure cookie support: optional `USE_COOKIE_REFRESH=1` will cause the server to set refresh tokens as Secure, HttpOnly, SameSite=Strict cookies.
- CAPTCHA: optional integration point exists and is disabled by default for dev; enable in production only behind feature flag.


