# Day 10 Chaos/Stress Suite

This script performs lightweight chaos experiments against the docker-compose stack:

Scenarios
1. Kill ai_core during an analyze request (expect temporary failures, then recovery)
2. Restart MongoDB (ensure backend/ai_core reconnect and recover)
3. Pause/unpause ai_core (simulate network freeze)

Usage

```bash
chmod +x tools/chaos/day10_chaos_suite.sh
BACKEND_URL=http://localhost:5000 AI_CORE_URL=http://localhost:8100 ./tools/chaos/day10_chaos_suite.sh
```

Notes
- Requires docker compose and running services (`make up`).
- The script uses `jq` for parsing JSON; install if missing or adjust manually.
- Metrics: Observe /metrics on backend and ai_core for error spikes and recovery latency.