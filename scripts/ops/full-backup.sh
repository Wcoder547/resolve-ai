#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo "Starting ResolveAI full backup..."

ENV_FILE="$ENV_FILE" COMPOSE_FILE="$COMPOSE_FILE" ./scripts/ops/backup-postgres.sh
ENV_FILE="$ENV_FILE" COMPOSE_FILE="$COMPOSE_FILE" ./scripts/ops/backup-uploads.sh

echo "Full backup completed."