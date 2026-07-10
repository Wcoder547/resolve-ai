#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

echo "ResolveAI Security Check"
echo "========================"
echo ""

failures=0

check_not_empty() {
  local name="$1"
  local value

  value="$(grep "^$name=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' || true)"

  if [ -z "$value" ]; then
    echo "❌ $name is missing or empty"
    failures=$((failures + 1))
  else
    echo "✅ $name is set"
  fi
}

check_no_default() {
  local name="$1"
  local value

  value="$(grep "^$name=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' || true)"

  if echo "$value" | grep -Eiq "change_this|test_|123456|password|resolveai_password"; then
    echo "❌ $name appears to use an unsafe default"
    failures=$((failures + 1))
  else
    echo "✅ $name does not look like a default"
  fi
}

check_not_empty "JWT_ACCESS_SECRET"
check_not_empty "JWT_REFRESH_SECRET"
check_not_empty "DATABASE_URL"
check_not_empty "CORS_ORIGIN"
check_not_empty "INTEGRATION_SECRET_ENCRYPTION_KEY"

check_no_default "JWT_ACCESS_SECRET"
check_no_default "JWT_REFRESH_SECRET"
check_no_default "INTEGRATION_SECRET_ENCRYPTION_KEY"

cors_origin="$(grep "^CORS_ORIGIN=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' || true)"

if [ "$cors_origin" = "*" ]; then
  echo "❌ CORS_ORIGIN must not be * in production"
  failures=$((failures + 1))
else
  echo "✅ CORS_ORIGIN is not wildcard"
fi

if echo "$cors_origin" | grep -q "^https://"; then
  echo "✅ CORS_ORIGIN uses HTTPS"
else
  echo "❌ CORS_ORIGIN should use HTTPS in production"
  failures=$((failures + 1))
fi

debug_enabled="$(grep "^AGENT_RUN_DEBUG_PAYLOAD_ENABLED=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' || true)"

if [ "$debug_enabled" = "true" ]; then
  echo "⚠️  AGENT_RUN_DEBUG_PAYLOAD_ENABLED is true. Disable after debugging."
else
  echo "✅ Agent debug payloads are disabled"
fi

echo ""

if [ "$failures" -gt 0 ]; then
  echo "Security check failed with $failures issue(s)."
  exit 1
fi

echo "Security check passed."