#!/usr/bin/env bash
# Manual deploy on VPS (same steps as GitHub Actions CD)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/api-ecommerce}"
cd "$APP_DIR"

echo ">>> Pulling..."
git fetch origin
git reset --hard "origin/${BRANCH:-main}"

echo ">>> Rebuild..."
docker compose --env-file .env -f docker-compose.prod.yml up -d --build

echo ">>> Health check..."
sleep 3
curl -fsS http://127.0.0.1:3055/health
echo
echo ">>> Done"
