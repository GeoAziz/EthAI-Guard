# Day 6 — Demo: End-to-end Compose run

This document describes how to run a quick end-to-end demo for Day 6. The repository includes a convenience script at `tools/e2e_demo.sh` that automates the happy-path steps.

Prerequisites
- Docker (desktop or engine) with `docker compose` (v2) available
- curl
- jq (recommended, but script falls back to simple parsing)

Quick run (recommended)

1. From the repository root:

```bash
chmod +x tools/e2e_demo.sh
./tools/e2e_demo.sh
```

2. The script will:
- Build and bring up services via `docker compose` (using `docker-compose.yml` at repo root)
- Wait for health endpoints to respond
- Register a demo user and log in (if auth enabled)
- Send a small sample dataset to the backend `/analyze` endpoint
- Print the analyze response and (if available) the frontend URL to view the report

3. When finished, tear down the stack with:

```bash
docker compose -f docker-compose.yml down
```

Troubleshooting
- If `docker compose` fails, ensure Docker is running and you're using a supported compose version.
- If the script can't find `jq`, it will still attempt to parse tokens/report ids using simple tools but results may be less robust.
- If the backend returns errors for `/analyze`, check the backend container logs:

```bash
docker compose logs backend
```

What the demo shows
- The compose stack runs the frontend, backend, and ai_core services (if configured). The script exercises the authentication and analysis flow and prints a report id and frontend link.

Notes
- This script is a convenience for demos. For CI-grade e2e tests prefer writing automated tests using a test harness and not relying on Docker Compose.
- If you plan to demo on a different machine/port, edit `tools/e2e_demo.sh` to adjust `BACKEND_URL` and `FRONTEND_URL`.
