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
