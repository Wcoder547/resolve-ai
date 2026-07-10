#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

ACTION="${1:-}"

if [ -z "$ACTION" ]; then
  echo "Usage:"
  echo "./scripts/ops/incident-quick-actions.sh status"
  echo "./scripts/ops/incident-quick-actions.sh restart-api"
  echo "./scripts/ops/incident-quick-actions.sh restart-ai"
  echo "./scripts/ops/incident-quick-actions.sh restart-worker"
  echo "./scripts/ops/incident-quick-actions.sh restart-all"
  echo "./scripts/ops/incident-quick-actions.sh logs-api"
  echo "./scripts/ops/incident-quick-actions.sh logs-ai"
  echo "./scripts/ops/incident-quick-actions.sh logs-worker"
  exit 1
fi

case "$ACTION" in
  status)
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    ;;

  restart-api)
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart api
    ;;

  restart-ai)
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart ai-service
    ;;

  restart-worker)
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart knowledge-worker
    ;;

  restart-all)
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart api ai-service knowledge-worker
    ;;

  logs-api)
    docker logs -f --tail 300 resolveai_api_prod
    ;;

  logs-ai)
    docker logs -f --tail 300 resolveai_ai_service_prod
    ;;

  logs-worker)
    docker logs -f --tail 300 resolveai_knowledge_worker_prod
    ;;

  *)
    echo "Unknown action: $ACTION"
    exit 1
    ;;
esac