Health-check worker
-------------------

This worker performs synthetic health checks for services and persists results to MongoDB (if configured) or writes to `public/demo-status.json` as a fallback.

Quick start (local/demo):

```bash
# Run in demo mode (writes public/demo-status.json)
node tools/status/worker.js
```

Run with MongoDB (persist incidents and status):

```bash
export MONGO_URI="mongodb+srv://user:pass@cluster/..."
export MONGO_DB="ethai"
node tools/status/worker.js
```

Environment variables
- `INTERVAL_MS`: interval between checks (ms). Default 30000.
- `MONGO_URI`: MongoDB connection string. If set, worker persists to DB.
- `MONGO_DB`: DB name (default: `ethai`).
- `API_GATEWAY_URL`, `ANALYSIS_ENGINE_URL`, `FIREBASE_HEALTH_URL`, `SHAP_URL`: override endpoints to check.

Deploying to Render (Docker)

1. Create a new "Web Service" or preferably a "Background Worker" on Render.
2. Choose Docker as the environment and point to this repository.
3. Set the Docker build context to `/tools/status` and the Dockerfile path to `Dockerfile`.
4. Set environment variables in Render for `MONGO_URI`, `MONGO_DB` and any endpoint overrides.
	- Recommended envs: `MONGO_URI`, `MONGO_DB`, `API_GATEWAY_URL`, `ANALYSIS_ENGINE_URL`, `FIREBASE_HEALTH_URL`, `SHAP_URL`, `INTERVAL_MS`.
	- To enable the worker when running from the backend container, set `ENABLE_STATUS_WORKER=1` on the backend service instead of creating an extra Render service.
5. Start the service. It will run the worker continuously.

Leader election (prevent multiple workers)

The worker implements a lightweight Mongo-backed leader-election lock. This prevents multiple backend instances or multiple worker services from running checks concurrently and duplicating incidents.

How it works
- The worker writes a lock document to the `worker_locks` collection with `_id: 'status_worker'`, an `owner` identifier and an `expiresAt` timestamp.
- A worker will only run checks if it can atomically acquire the lock (or renew it when it already owns it). The lock TTL and renew interval are configurable via env vars `WORKER_LOCK_TTL_MS` and `WORKER_RENEW_INTERVAL_MS`.
- On graceful shutdown the worker will attempt to release the lock.

GitHub Actions (scheduled run)

If you prefer not to run an always-on service, use the included GitHub Actions scheduled workflow at `.github/workflows/status-worker.yml`. Steps:

1. Add the following repository Secrets (Settings → Secrets):
	- `MONGO_URI` - MongoDB connection string
	- `MONGO_DB` - database name (e.g., `ethai`)
	- Optional endpoint overrides: `API_GATEWAY_URL`, `ANALYSIS_ENGINE_URL`, `FIREBASE_HEALTH_URL`, `SHAP_URL`
2. The workflow will run `node tools/status/worker.js` every 5 minutes and persist results to Mongo.

Notes
- The worker will create incidents for failed checks and will attempt to deduplicate ongoing incidents.
- Keep your Mongo credentials secret and use a least-privilege user for monitoring (read/write only to `status_meta`, `incidents`, and `worker_locks`).
- If you run the worker both as a Render service and via GitHub Actions, the leader lock ensures only the owner runs checks (the scheduled action will skip if lock held).

Metrics

- The worker exposes Prometheus metrics at `/metrics` (default port `9500`). You can override the port with `WORKER_METRICS_PORT`.
- Metrics exposed:
	- `status_worker_checks_total` (counter) — total checks performed
	- `status_worker_checks_failed_total` (counter) — total failed checks
	- `status_worker_last_check_timestamp` (gauge) — unix timestamp of last run
Pushgateway

If you prefer Pushgateway instead of a scrapeable `/metrics` endpoint (for example when using GitHub Actions scheduled runs which can't be scraped), set `PUSHGATEWAY_URL` to the Pushgateway address (e.g. `https://pushgateway.example.com:9091`). When set, the worker will push metrics to the Pushgateway after each check. Example:

```bash
# Configure Pushgateway and run worker (example)
export PUSHGATEWAY_URL='https://pushgateway.example.com:9091'
setsid node tools/status/worker.js > tools/status/worker.log 2>&1 < /dev/null &
```

Notes:
- The worker still exposes `/metrics` when `prom-client` is installed; Pushgateway is optional and intended for environments where scraping is not feasible (GitHub Actions, ephemeral CI jobs).
- When using Pushgateway, the worker groups metrics by an `owner` label so you can distinguish pushes from multiple runners.
