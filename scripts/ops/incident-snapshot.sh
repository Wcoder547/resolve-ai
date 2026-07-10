#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
MONITORING_FILE="${MONITORING_FILE:-docker-compose.monitoring.yml}"
OUTPUT_ROOT="${OUTPUT_ROOT:-incident-reports}"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
OUTPUT_DIR="$OUTPUT_ROOT/incident-$TIMESTAMP"

mkdir -p "$OUTPUT_DIR"

echo "Creating incident snapshot: $OUTPUT_DIR"

{
  echo "ResolveAI Incident Snapshot"
  echo "Created at: $TIMESTAMP"
  echo ""
  echo "Git:"
  git rev-parse HEAD || true
  git status --short || true
  echo ""
  echo "Docker Compose Services:"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps || true
  echo ""
  echo "Monitoring Services:"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -f "$MONITORING_FILE" ps || true
  echo ""
  echo "Disk:"
  df -h || true
  echo ""
  echo "Memory:"
  free -h || true
  echo ""
  echo "Docker System:"
  docker system df || true
} > "$OUTPUT_DIR/summary.txt"

echo "Collecting service logs..."

docker logs --tail 500 resolveai_api_prod > "$OUTPUT_DIR/api.log" 2>&1 || true
docker logs --tail 500 resolveai_ai_service_prod > "$OUTPUT_DIR/ai-service.log" 2>&1 || true
docker logs --tail 500 resolveai_knowledge_worker_prod > "$OUTPUT_DIR/knowledge-worker.log" 2>&1 || true
docker logs --tail 500 resolveai_postgres_prod > "$OUTPUT_DIR/postgres.log" 2>&1 || true
docker logs --tail 500 resolveai_redis_prod > "$OUTPUT_DIR/redis.log" 2>&1 || true
docker logs --tail 500 resolveai_prometheus_prod > "$OUTPUT_DIR/prometheus.log" 2>&1 || true
docker logs --tail 500 resolveai_alertmanager_prod > "$OUTPUT_DIR/alertmanager.log" 2>&1 || true
docker logs --tail 500 resolveai_grafana_prod > "$OUTPUT_DIR/grafana.log" 2>&1 || true

echo "Checking health endpoints..."

{
  echo "/live"
  curl -fsS http://localhost:5000/live || true
  echo ""
  echo "/ready"
  curl -fsS http://localhost:5000/ready || true
} > "$OUTPUT_DIR/health.txt"

tar -czf "$OUTPUT_DIR.tar.gz" -C "$OUTPUT_ROOT" "$(basename "$OUTPUT_DIR")"

echo "Incident snapshot created:"
echo "$OUTPUT_DIR.tar.gz"