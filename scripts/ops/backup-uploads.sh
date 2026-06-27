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
OUTPUT_DIR="$BACKUP_ROOT/uploads"
OUTPUT_FILE="$OUTPUT_DIR/resolveai-uploads-$TIMESTAMP.tar.gz"

mkdir -p "$OUTPUT_DIR"

echo "Creating uploads backup..."
echo "Output: $OUTPUT_FILE"

docker run --rm \
  -v resolve-ai_api_uploads:/uploads:ro \
  -v "$(pwd)/$OUTPUT_DIR:/backup" \
  alpine \
  tar -czf "/backup/$(basename "$OUTPUT_FILE")" -C /uploads .

echo "Uploads backup completed:"
ls -lh "$OUTPUT_FILE"