#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

BACKUP_ROOT="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
OUTPUT_DIR="$BACKUP_ROOT/postgres"
OUTPUT_FILE="$OUTPUT_DIR/resolveai-postgres-$TIMESTAMP.sql.gz"

mkdir -p "$OUTPUT_DIR"

echo "Creating PostgreSQL backup..."
echo "Output: $OUTPUT_FILE"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  | gzip > "$OUTPUT_FILE"

echo "PostgreSQL backup completed:"
ls -lh "$OUTPUT_FILE"