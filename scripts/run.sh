#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

if [ ! -d node_modules ]; then
  echo "[universe-ai] installing dependencies…"
  npm install --no-audit --no-fund
  node node_modules/electron/install.js || true
fi

exec npx electron . --no-sandbox "$@"
