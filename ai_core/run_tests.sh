#!/usr/bin/env bash
set -euo pipefail

# Helper to create a venv, install ai_core requirements, and run pytest from repo root.
# This avoids system-wide pip and ensures the ai_core package is importable during tests.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$REPO_ROOT/.venv_ai_core"

if [ ! -d "$VENV" ]; then
  python -m venv "$VENV"
fi

"$VENV/bin/python" -m pip install --upgrade pip setuptools wheel
"$VENV/bin/pip" install -r "$REPO_ROOT/ai_core/requirements.txt"

export PYTHONPATH="$REPO_ROOT"
cd "$REPO_ROOT"
"$VENV/bin/pytest" -q ai_core/tests
