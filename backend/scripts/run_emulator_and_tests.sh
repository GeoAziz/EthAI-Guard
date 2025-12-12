#!/usr/bin/env bash
# Helper to run Firebase Auth emulator (only auth) and then run backend integration tests that target it.
# Usage: ./run_emulator_and_tests.sh
set -euo pipefail

# Check for firebase-tools (npx will be used if not installed globally)
FIREBASE_CMD=""
if command -v firebase >/dev/null 2>&1; then
  FIREBASE_CMD="firebase"
else
  FIREBASE_CMD="npx firebase"
fi

# Ensure npm test tool is available
if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found; aborting"
  exit 2
fi

# Default emulator ports
AUTH_PORT=9099
# export the env var consumed by tests to detect emulator
export FIREBASE_AUTH_EMULATOR_HOST=localhost:${AUTH_PORT}
export FIREBASE_PROJECT=demo-project

# Start emulator in background
# We limit to only auth emulator for speed
${FIREBASE_CMD} emulators:start --only auth --project ${FIREBASE_PROJECT} --import=./firebase_emulator_import --export-on-exit=./firebase_emulator_export &
EMULATOR_PID=$!

# Wait for emulator to be responsive (simple loop)
echo "Waiting for Firebase Auth emulator to be ready..."
RETRIES=0
until nc -z localhost ${AUTH_PORT}; do
  sleep 0.5
  RETRIES=$((RETRIES+1))
  if [ ${RETRIES} -gt 60 ]; then
    echo "Emulator did not start in time"
    kill ${EMULATOR_PID} || true
    exit 3
  fi
done

echo "Emulator ready (pid=${EMULATOR_PID}). Running backend tests..."
# Run only the emulator integration test or any tests that check for FIREBASE_AUTH_EMULATOR_HOST
npm test --silent --prefix "$(dirname "$0")/.."

# Stop emulator
echo "Tests finished. Shutting down emulator (pid=${EMULATOR_PID})"
kill ${EMULATOR_PID} || true
wait ${EMULATOR_PID} 2>/dev/null || true

echo "Done."
