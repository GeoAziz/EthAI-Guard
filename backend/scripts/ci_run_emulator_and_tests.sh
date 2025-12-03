#!/usr/bin/env bash
set -euo pipefail

# CI helper: start Firebase Auth emulator and run backend tests
# Assumptions:
# - firebase-tools is installed globally (workflow installs it)
# - FIREBASE_AUTH_EMULATOR_HOST is set in the environment (the workflow sets it)

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Starting Firebase emulators (Auth only) in background..."
# start emulator from root directory where firebase.json exists
cd "$ROOT_DIR"
firebase emulators:start --only auth --project demo-project &> "$ROOT_DIR/backend/firebase-emulator.log" &
EMU_PID=$!

# Switch back to backend for tests
cd "$ROOT_DIR/backend"

echo "Waiting for Auth emulator to be ready..."
# simple wait loop to ensure port is open
for i in {1..30}; do
  if nc -z localhost 9099; then
    echo "Auth emulator is up"
    break
  fi
  sleep 1
done

if ! nc -z localhost 9099; then
  echo "Auth emulator failed to start; dumping last 200 lines of log:"
  tail -n 200 ./firebase-emulator.log || true
  kill $EMU_PID || true
  exit 1
fi

echo "Running backend tests (Jest)..."
npm test --silent

TEST_EXIT=$?

echo "Stopping emulator (PID: $EMU_PID)"
kill $EMU_PID || true
wait $EMU_PID 2>/dev/null || true

exit $TEST_EXIT
