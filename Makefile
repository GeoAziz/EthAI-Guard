.PHONY: help install test lint up down clean logs metrics docs

# Default target
help:
	@echo "EthAI-Guard Development Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make install      Install all dependencies (backend + ai_core)"
	@echo "  make test         Run all test suites (backend + ai_core)"
	@echo "  make lint         Run linters (ESLint + Pylint)"
	@echo "  make up           Start docker-compose services"
	@echo "  make down         Stop docker-compose services"
	@echo "  make clean        Clean up artifacts, caches, containers"
	@echo "  make logs         Tail docker-compose logs"
	@echo "  make metrics      Display metrics endpoints"
	@echo "  make docs         Build and serve documentation"
	@echo "  make load-baseline  Run baseline load test (Locust)"
	@echo "  make load-spike     Run spike load test (Locust)"
	@echo "  make load-sustained Run sustained load test (Locust)"
	@echo "  make day14-baseline-artifacts  Baseline with JSON artifacts"
	@echo "  make day14-ramp-artifacts      Ramp with JSON export"
	@echo "  make day14-mixed-artifacts     Mixed hold JSON export"
	@echo "  make day14-spike-artifacts     Spike JSON export"
	@echo "  make day14-stress-artifacts    Stress escalation JSON export"
	@echo "  make day14-soak-artifacts      Soak JSON export"
	@echo "  make day14-baseline   Day14 baseline (k6 S1/S2)"
	@echo "  make day14-ramp       Day14 ramp explainability"
	@echo "  make day14-mixed      Day14 mixed hold"
	@echo "  make day14-spike      Day14 spike scenario"
	@echo "  make day14-stress     Day14 stress escalation"
	@echo "  make day14-soak       Day14 soak (30m)"
	@echo "  make chaos-suite    Run Day10 chaos suite"
	@echo "  make drift-check    Compute drift (PSI/KL) from CSVs"
	@echo "  make scale-up       Scale services (compose)"
	@echo "  make scale-down     Reset scaling (compose)"
	@echo "  make firebase-login Login to Firebase CLI (opens browser)"
	@echo "  make deploy-firestore-indexes Deploy Firestore indexes (requires project + auth)"
	@echo "  make deploy-firestore-rules   Deploy Firestore rules (requires project + auth)"
	@echo "  make deploy-firestore-all     Deploy both rules and indexes"
	@echo ""
	@echo "Example workflow:"
	@echo "  make install"
	@echo "  make test"
	@echo "  make up"
	@echo "  # Visit http://localhost:3000"
	@echo "  make down"

# Install dependencies for backend and ai_core
install:
	@echo "📦 Installing backend dependencies..."
	cd backend && npm install
	@echo "📦 Installing ai_core dependencies..."
	cd ai_core && pip install -r requirements.txt
	@echo "✅ All dependencies installed"

# Run all tests
test: test-backend test-ai-core
	@echo "✅ All test suites passed"

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && NODE_ENV=test npm test

test-ai-core:
	@echo "🧪 Running ai_core tests..."
	cd ai_core && python -m pytest tests/ -v --tb=short

# Lint code
lint: lint-backend lint-ai-core
	@echo "✅ Lint checks passed"

lint-backend:
	@echo "🔍 Linting backend..."
	cd backend && npm run lint || true

lint-ai-core:
	@echo "🔍 Linting ai_core..."
	cd ai_core && python -m pylint ai_core/ --disable=all --enable=E,F || true

# Docker compose targets
up:
	@echo "🚀 Starting services with docker-compose..."
	docker compose up --build -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 5
	@echo "✅ Services started:"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:5000"
	@echo "  AI Core:   http://localhost:8100"
	@echo "  MongoDB:   localhost:27017"

down:
	@echo "🛑 Stopping services..."
	docker compose down
	@echo "✅ Services stopped"

# Logs
logs:
	@echo "📋 Tailing docker-compose logs (Ctrl+C to exit)..."
	docker compose logs -f --tail=100

# Clean up
clean: down
	@echo "🧹 Cleaning up artifacts..."
	rm -rf .pytest_cache __pycache__ .venv .venv_ai_core
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	cd backend && rm -rf node_modules package-lock.json dist 2>/dev/null || true
	cd ai_core && rm -rf .pytest_cache 2>/dev/null || true
	docker compose down -v 2>/dev/null || true
	@echo "✅ Cleanup complete"

.PHONY: day13 day13-report
day13:
	chmod +x tools/integration/day13_full_integration.sh
	BACKEND_URL?=http://localhost:5000 AICORE_URL?=http://localhost:8100 FRONTEND_URL?=http://localhost:3000 \
	tools/integration/day13_full_integration.sh

day13-report:
	@echo "Report at docs/reports/day13-integration-report.md"

# Metrics
metrics:
	@echo "📊 Metrics Endpoints:"
	@echo "  Backend Prometheus:  http://localhost:5000/metrics"
	@echo "  AI Core Prometheus:  http://localhost:8100/metrics"
	@echo ""
	@echo "Fetch metrics:"
	@echo "  curl http://localhost:5000/metrics | grep http_requests_total"
	@echo "  curl http://localhost:8100/metrics | grep ai_core_analysis"

# Documentation
docs:
	@echo "📚 Documentation files:"
	@find docs -name "*.md" -type f | head -10
	@echo ""
	@echo "Key documents:"
	@echo "  - docs/backend-refresh-tokens.md   : Token management & device sessions"
	@echo "  - docs/ARCHITECTURE.md             : System architecture & design"
	@echo "  - docs/observability.md            : Metrics & logging setup"
	@echo "  - CONTRIBUTING.md                  : Contribution guidelines"

# Chaos smoke test (local)
chaos:
	@echo "⚡ Running local chaos smoke test..."
	chmod +x tools/ci/chaos_smoke_ci.sh
	./tools/ci/chaos_smoke_ci.sh

# Day 10: Chaos suite
chaos-suite:
	@echo "⚡ Running Day10 chaos suite..."
	chmod +x tools/chaos/day10_chaos_suite.sh
	BACKEND_URL=http://localhost:5000 AI_CORE_URL=http://localhost:8100 ./tools/chaos/day10_chaos_suite.sh

# Day 10: Load testing (Locust)
load-baseline:
	@echo "🏋️ Running baseline load (50 users, 2m)..."
	BACKEND_HOST=http://localhost:5000 locust -f tools/load/locustfile.py --headless -u 50 -r 10 -t 2m --host http://localhost:5000

load-spike:
	@echo "🚀 Running spike load (300 users, 2m)..."
	BACKEND_HOST=http://localhost:5000 locust -f tools/load/locustfile.py --headless -u 300 -r 300 -t 2m --host http://localhost:5000

load-sustained:
	@echo "🕒 Running sustained load (100 users, 10m)..."
	BACKEND_HOST=http://localhost:5000 locust -f tools/load/locustfile.py --headless -u 100 -r 20 -t 10m --host http://localhost:5000

# Day 14 k6 targets (use BASE_URL override if needed)
.PHONY: day14-baseline day14-ramp day14-mixed day14-spike day14-stress day14-soak
BASE_URL?=http://localhost:5000

day14-baseline:
	@echo "🔎 Day14 Baseline (auth dashboard + upload/analyze)"
	mkdir -p docs/perf/day14/artifacts/k6
	k6 run tools/load/day14/s1_auth_dashboard.js --env BASE_URL=$(BASE_URL)
	k6 run tools/load/day14/s2_upload_analyze.js --env BASE_URL=$(BASE_URL) --env VUS=3 --env DURATION=1m
	@echo "✅ Baseline complete (no JSON exports). Use day14-baseline-artifacts for captured data."

day14-baseline-artifacts:
	@echo "🗂 Day14 Baseline with artifact export"
	mkdir -p docs/perf/day14/artifacts/k6
	k6 run --summary-export docs/perf/day14/artifacts/k6/baseline_auth_dashboard.json tools/load/day14/s1_auth_dashboard.js --env BASE_URL=$(BASE_URL) || true
	k6 run --summary-export docs/perf/day14/artifacts/k6/baseline_upload_analyze.json tools/load/day14/s2_upload_analyze.js --env BASE_URL=$(BASE_URL) --env VUS=3 --env DURATION=1m || true
	@echo "✅ Baseline artifacts saved to docs/perf/day14/artifacts/k6 (threshold failures ignored)"

day14-ramp:
	@echo "📈 Day14 Ramp (explainability heavy)"
	k6 run tools/load/day14/s3_explainability_heavy.js --env BASE_URL=$(BASE_URL) --env RATE_TARGET=25

day14-ramp-artifacts:
	@echo "📈 Day14 Ramp with artifact export"
	mkdir -p docs/perf/day14/artifacts/k6
	k6 run --summary-export docs/perf/day14/artifacts/k6/ramp_explain.json tools/load/day14/s3_explainability_heavy.js --env BASE_URL=$(BASE_URL) --env RATE_TARGET=25 || true
	@echo "✅ Ramp artifacts saved (threshold failures ignored)"

day14-mixed:
	@echo "🔀 Day14 Mixed weighted scenario hold"
	k6 run tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$(BASE_URL) --env RATE=50 --env DURATION=10m

day14-mixed-artifacts:
	@echo "🔀 Day14 Mixed hold with artifact export"
	mkdir -p docs/perf/day14/artifacts/k6
	k6 run --summary-export docs/perf/day14/artifacts/k6/mixed_hold.json tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$(BASE_URL) --env RATE=50 --env DURATION=10m
	@echo "✅ Mixed hold artifacts saved"

day14-spike:
	@echo "🚀 Day14 Spike (250 rps for 2m)"
	k6 run tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$(BASE_URL) --env RATE=250 --env DURATION=2m --env PRE_VUS=400 --env MAX_VUS=800 || true

day14-spike-artifacts:
	@echo "🚀 Day14 Spike with artifact export"
	mkdir -p docs/perf/day14/artifacts/k6
	k6 run --summary-export docs/perf/day14/artifacts/k6/spike_mixed.json tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$(BASE_URL) --env RATE=250 --env DURATION=2m --env PRE_VUS=400 --env MAX_VUS=800 || true
	@echo "✅ Spike artifacts saved"

day14-stress:
	@echo "🔥 Day14 Stress escalation (300→600 rps)"
	for r in 300 400 500 600; do \
	  echo "-- rate=$$r"; \
	  k6 run tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$(BASE_URL) --env RATE=$$r --env DURATION=2m --env PRE_VUS=$$((r*2)) --env MAX_VUS=$$((r*3)) || true; \
	  sleep 8; \
	done

day14-stress-artifacts:
	@echo "🔥 Day14 Stress with artifact export"
	mkdir -p docs/perf/day14/artifacts/k6
	for r in 300 400 500 600; do \
	  echo "-- rate=$$r"; \
	  k6 run --summary-export docs/perf/day14/artifacts/k6/stress_rate_$$r.json tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$(BASE_URL) --env RATE=$$r --env DURATION=2m --env PRE_VUS=$$((r*2)) --env MAX_VUS=$$((r*3)) || true; \
	  sleep 8; \
	done
	@echo "✅ Stress artifacts saved"

day14-soak:
	@echo "💧 Day14 Soak (40 rps for 30m)"
	k6 run tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$(BASE_URL) --env RATE=40 --env DURATION=30m --env PRE_VUS=120 --env MAX_VUS=200 || true

day14-soak-artifacts:
	@echo "💧 Day14 Soak with artifact export"
	mkdir -p docs/perf/day14/artifacts/k6
	k6 run --summary-export docs/perf/day14/artifacts/k6/soak_mixed.json tools/load/day14/s5_mixed_weighted.js --env BASE_URL=$(BASE_URL) --env RATE=40 --env DURATION=30m --env PRE_VUS=120 --env MAX_VUS=200 || true
	@echo "✅ Soak artifacts saved"

.PHONY: day14-all-artifacts
day14-all-artifacts: day14-baseline-artifacts day14-ramp-artifacts day14-mixed-artifacts day14-spike-artifacts day14-stress-artifacts day14-soak-artifacts
	@echo "📦 All Day14 artifact phases complete"

# Day 10: Drift check
drift-check:
	@echo "📐 Example: python tools/drift/drift_check.py --baseline baseline.csv --current current.csv --columns feature1,feature2 --output drift.json"
	@echo "Edit and run the above command with your files."

# Day 10: Scaling demo (docker compose)
scale-up:
	@echo "📈 Scaling system_api=3, ai_core=2..."
	docker compose up -d --scale system_api=3 --scale ai_core=2

scale-down:
	@echo "📉 Resetting to single replicas..."
	docker compose up -d --scale system_api=1 --scale ai_core=1

# Development targets
dev: install up
	@echo "🎉 Development environment ready!"

dev-stop: down clean
	@echo "🎉 Development environment cleaned up"

watch-backend:
	@echo "👀 Watching backend for changes..."
	cd backend && npm run watch || npm run dev

watch-ai-core:
	@echo "👀 Watching ai_core for changes..."
	cd ai_core && python -m pytest tests/ -v --tb=short --watch || python -m pytest tests/ -v --tb=short

# Firebase deployment helpers (requires firebase-tools and auth)
.PHONY: firebase-login deploy-firestore-indexes deploy-firestore-rules deploy-firestore-all

# Opens a browser to authenticate the Firebase CLI for your account
firebase-login:
	@if ! command -v npx >/dev/null 2>&1; then echo "npx not found. Please install Node.js."; exit 1; fi
	@npx --yes firebase-tools login

# Deploy Firestore composite indexes from firestore.indexes.json
# Usage:
#   make deploy-firestore-indexes FIREBASE_PROJECT_ID=my-project
# Or set FIREBASE_TOKEN for CI usage
deploy-firestore-indexes:
	@if [ -z "$(FIREBASE_PROJECT_ID)" ]; then echo "FIREBASE_PROJECT_ID is required. Example: make $@ FIREBASE_PROJECT_ID=my-project"; exit 1; fi
	@echo "🚀 Deploying Firestore indexes to project $(FIREBASE_PROJECT_ID)..."
	@npx --yes firebase-tools deploy --only firestore:indexes --project $(FIREBASE_PROJECT_ID)
	@echo "✅ Firestore indexes deployment triggered. Index build may take several minutes."

# Deploy Firestore security rules from firestore.rules
# Usage:
#   make deploy-firestore-rules FIREBASE_PROJECT_ID=my-project
deploy-firestore-rules:
	@if [ -z "$(FIREBASE_PROJECT_ID)" ]; then echo "FIREBASE_PROJECT_ID is required. Example: make $@ FIREBASE_PROJECT_ID=my-project"; exit 1; fi
	@echo "🔐 Deploying Firestore rules to project $(FIREBASE_PROJECT_ID)..."
	@npx --yes firebase-tools deploy --only firestore:rules --project $(FIREBASE_PROJECT_ID)
	@echo "✅ Firestore rules deployed."

# Deploy both rules and indexes together
deploy-firestore-all:
	@if [ -z "$(FIREBASE_PROJECT_ID)" ]; then echo "FIREBASE_PROJECT_ID is required. Example: make $@ FIREBASE_PROJECT_ID=my-project"; exit 1; fi
	@echo "🚀 Deploying Firestore rules + indexes to project $(FIREBASE_PROJECT_ID)..."
	@npx --yes firebase-tools deploy --only firestore --project $(FIREBASE_PROJECT_ID)
	@echo "✅ Firestore deployment complete (rules + indexes)."
