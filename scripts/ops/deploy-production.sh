#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
API_URL="${API_URL:-http://localhost:5000}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

echo "Starting ResolveAI production deployment..."

echo ""
echo "Step 1: Pre-deployment backup"
ENV_FILE="$ENV_FILE" COMPOSE_FILE="$COMPOSE_FILE" ./scripts/ops/full-backup.sh

echo ""
echo "Step 2: Pull latest code"
git fetch origin main
git reset --hard origin/main

echo "Running production security check..."
./scripts/ops/security-check.sh

echo ""
echo "Step 3: Build production images"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build

echo ""
echo "Step 4: Start production services"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo ""
echo "Step 5: Show service status"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo ""
echo "Step 6: Wait before health check"
sleep 15

echo ""
echo "Step 7: Health check"
API_URL="$API_URL" ./scripts/ops/healthcheck-production.sh

echo ""
echo "Step 8: Prune old backups"
ENV_FILE="$ENV_FILE" ./scripts/ops/prune-backups.sh

echo ""
echo "Production deployment completed successfully."