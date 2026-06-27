#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
API_URL="${API_URL:-http://localhost:5000}"
TARGET_REF="${1:-HEAD~1}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

echo "WARNING: This will rollback production to:"
echo "$TARGET_REF"
echo ""
read -p "Type ROLLBACK to continue: " CONFIRMATION

if [ "$CONFIRMATION" != "ROLLBACK" ]; then
  echo "Rollback cancelled."
  exit 1
fi

echo ""
echo "Step 1: Backup current production state"
ENV_FILE="$ENV_FILE" COMPOSE_FILE="$COMPOSE_FILE" ./scripts/ops/full-backup.sh

echo ""
echo "Step 2: Checkout target ref"
git fetch origin main
git reset --hard "$TARGET_REF"

echo ""
echo "Step 3: Rebuild services"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build

echo ""
echo "Step 4: Restart services"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo ""
echo "Step 5: Wait before health check"
sleep 15

echo ""
echo "Step 6: Health check"
API_URL="$API_URL" ./scripts/ops/healthcheck-production.sh

echo ""
echo "Rollback completed successfully."