#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
ART_DIR="docs/perf/day14/artifacts"
mkdir -p "$ART_DIR/k6" "$ART_DIR/metrics" "$ART_DIR/flamegraphs" "$ART_DIR/memory"
RUN_ID="day14_$(date +%Y%m%d_%H%M%S)"

log() { printf "[%s] %s\n" "$(date +%H:%M:%S)" "$*"; }

log "Day 14 Load Test Orchestrator (RUN_ID=$RUN_ID)"

phase() { printf "\n==================== %s ====================\n" "$*"; }

phase "Baseline"
# Low load baseline
k6 run --quiet --summary-export "$ART_DIR/k6/baseline_auth_dashboard.json" tools/load/day14/s1_auth_dashboard.js --env BASE_URL=$BASE_URL
k6 run --quiet --summary-export "$ART_DIR/k6/baseline_upload_analyze.json" tools/load/day14/s2_upload_analyze.js --env BASE_URL=$BASE_URL --env VUS=2 --env DURATION=1m

phase "Ramp-Up (Analyze)"
k6 run --summary-export "$ART_DIR/k6/ramp_explain.json" tools/load/day14/s3_explainability_heavy.js --env BASE_URL=$BASE_URL --env RATE_TARGET=25

phase "Mixed Scenario Hold"
k6 run --summary-export "$ART_DIR/k6/mixed_hold.json" tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$BASE_URL --env RATE=50 --env DURATION=10m

phase "Spike"
k6 run --summary-export "$ART_DIR/k6/spike_mixed.json" tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$BASE_URL --env RATE=250 --env DURATION=2m --env PRE_VUS=400 --env MAX_VUS=800 || true

phase "Stress To Failure (increment rate)"
for r in 300 400 500 600; do
  log "Stress iteration rate=$r"
  k6 run --summary-export "$ART_DIR/k6/stress_rate_${r}.json" tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$BASE_URL --env RATE=$r --env DURATION=3m --env PRE_VUS=$((r*2)) --env MAX_VUS=$((r*3)) || true
  sleep 10
done

phase "Soak (moderate sustained)"
k6 run --summary-export "$ART_DIR/k6/soak_mixed.json" tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$BASE_URL --env RATE=40 --env DURATION=30m --env PRE_VUS=120 --env MAX_VUS=200 || true

log "Collecting Prometheus snapshot (if curl accessible)"
if curl -sf "$BASE_URL/metrics" > "$ART_DIR/metrics/backend_metrics_${RUN_ID}.txt"; then
  log "Backend metrics captured"
fi
# ai_core metrics
if curl -sf "${AI_CORE_URL:-http://localhost:8100}/metrics" > "$ART_DIR/metrics/aicore_metrics_${RUN_ID}.txt"; then
  log "AI core metrics captured"
fi

log "Done. Artifacts in $ART_DIR"
