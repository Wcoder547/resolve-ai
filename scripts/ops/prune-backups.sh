#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

BACKUP_ROOT="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

echo "Pruning backups older than $RETENTION_DAYS days in $BACKUP_ROOT..."

if [ -d "$BACKUP_ROOT" ]; then
  find "$BACKUP_ROOT" -type f -mtime +"$RETENTION_DAYS" -print -delete
fi

echo "Backup pruning completed."