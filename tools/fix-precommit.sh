#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/mnt/devmandrive/EthAI"
cd "$REPO_ROOT"

echo "== Starting pre-commit fix script =="

# 1) create & activate venv
if [ ! -d "$REPO_ROOT/.venv" ]; then
  echo "Creating virtualenv at .venv..."
  python3 -m venv .venv
else
  echo "Virtualenv .venv already exists — reusing"
fi

# shellcheck disable=SC1091
source .venv/bin/activate

# 2) upgrade pip and install tools inside venv
echo "Upgrading pip and installing pre-commit + detect-secrets..."
python -m pip install --upgrade pip
pip install --upgrade pre-commit detect-secrets

# 3) ensure git has staged the YAML edit you already made
echo "Staging all changes..."
git add -A || true

echo "Committing YAML fix (if staged)..."
git commit -m "ci: fix frontend workflow duplicate key and apply pre-commit fixes" || echo "No changes to commit (already committed)."

# 4) run pre-commit across all files
echo "Running pre-commit --all-files (may reformat files)..."
pre-commit run --all-files || true

# 5) stage & commit any changes pre-commit made
echo "Staging changes after pre-commit..."
git add -A || true

echo "Committing pre-commit fixes (if any)..."
git commit -m "chore: apply pre-commit automatic fixes" || echo "No additional changes to commit."

# 6) regenerate detect-secrets baseline
echo "Regenerating detect-secrets baseline (detect-secrets scan)..."
if detect-secrets --version >/dev/null 2>&1; then
  detect-secrets scan > .secrets.baseline || echo "detect-secrets scan exited non-zero"
else
  echo "detect-secrets not found in venv PATH"
fi

# 7) stage & commit baseline if changed
git add .secrets.baseline || true
git commit -m "chore: refresh detect-secrets baseline" || echo "No baseline changes to commit."

# 8) push
echo "Pushing to origin/main..."
if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  git push origin HEAD:main || echo "git push failed — check remote access/credentials"
else
  # No upstream set — attempt to push anyway
  git push origin HEAD:main || echo "git push failed — check remote access/credentials"
fi

# 9) deactivate venv
deactivate || true

echo "== Done =="
