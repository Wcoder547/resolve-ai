#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/ops/restore-postgres.sh <backup-file.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

echo "WARNING: This will restore database from:"
echo "$BACKUP_FILE"
echo ""
echo "Target database: $POSTGRES_DB"
echo "Target container: postgres"
echo ""
read -p "Type RESTORE to continue: " CONFIRMATION

if [ "$CONFIRMATION" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Stopping API and worker before restore..."

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop api knowledge-worker

echo "Restoring PostgreSQL backup..."

gunzip -c "$BACKUP_FILE" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB"

echo "Starting API and worker..."

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d api knowledge-worker

echo "Restore completed."