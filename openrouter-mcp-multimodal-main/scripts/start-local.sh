#!/bin/sh
# Resolve the checkout so .env and media paths work from any MCP client cwd.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ ! -f dist/index.js ]; then
  echo 'Build the server first: npm ci && npm run build' >&2
  exit 1
fi
exec "${OPENROUTER_NODE:-node}" dist/index.js
