#!/usr/bin/env bash
set -euo pipefail

echo "Simulate ai_core downtime using docker compose (requires docker-compose to be running from repo root)"
COMPOSE="docker compose"

echo "Stopping ai_core service..."
$COMPOSE stop ai_core || true
echo "Waiting 5s to simulate downtime..."
sleep 5
echo "Starting ai_core service..."
$COMPOSE start ai_core || $COMPOSE up -d ai_core

echo "Running a quick health check against backend..."
curl -sS -f http://localhost:5000/health || echo "backend health check failed"

echo "Done."
