# Day 14 Load Testing Usage

## Prerequisites
- k6 installed locally (https://k6.io/docs/getting-started/installation/)
- Optional: Locust (pip install -r tools/load/requirements.txt)
- Running staging stack (`docker compose up -d`)

## Quick Start (Baseline)
```bash
export BASE_URL=http://localhost:5000
k6 run tools/load/day14/s1_auth_dashboard.js --env BASE_URL=$BASE_URL
k6 run tools/load/day14/s2_upload_analyze.js --env BASE_URL=$BASE_URL --env VUS=5 --env DURATION=2m
```

## Full Orchestrated Run
```bash
bash tools/load/day14/run_day14_load_tests.sh
```
Artifacts stored in `docs/perf/day14/artifacts/`.

## Mixed Scenario Hold
```bash
k6 run tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$BASE_URL --env RATE=50 --env DURATION=15m --env PRE_VUS=120 --env MAX_VUS=250
```

## Spike
```bash
k6 run tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$BASE_URL --env RATE=250 --env DURATION=2m --env PRE_VUS=400 --env MAX_VUS=800
```

## Stress (incremental)
```bash
for r in 300 400 500; do k6 run tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$BASE_URL --env RATE=$r --env DURATION=3m --env PRE_VUS=$((r*2)) --env MAX_VUS=$((r*3)); done
```

## Soak
```bash
k6 run tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$BASE_URL --env RATE=40 --env DURATION=60m --env PRE_VUS=150 --env MAX_VUS=250
```

## Locust Alternative
```bash
BACKEND_HOST=$BASE_URL locust -f tools/load/locustfile.py --headless -u 100 -r 20 -t 10m --host $BACKEND_HOST
```

## Metrics Capture
```bash
curl -s $BASE_URL/metrics > docs/perf/day14/artifacts/metrics/backend_metrics_$(date +%s).txt
curl -s http://localhost:8100/metrics > docs/perf/day14/artifacts/metrics/aicore_metrics_$(date +%s).txt
```

## Profiling (Example)
```bash
# Backend CPU Flamegraph
0x -- node backend/src/server.js
# ai_core sampling
py-spy record -o docs/perf/day14/artifacts/flamegraphs/ai_core_flame.svg --pid $(pgrep -f 'uvicorn') --duration 60
```

## Result Interpretation
- Compare p95 against targets (PLAN.md)
- Open issues for breaches; update capacity_plan.md

