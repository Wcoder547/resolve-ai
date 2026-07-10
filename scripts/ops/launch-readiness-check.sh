#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:5000}"
AI_URL="${AI_URL:-http://localhost:8000}"

echo "ResolveAI Launch Readiness Check"
echo "================================"
echo ""

failures=0

check_command() {
  local label="$1"
  local command="$2"

  echo "Checking: $label"

  if eval "$command" > /tmp/resolveai-check-output.txt 2>&1; then
    echo "✅ $label"
  else
    echo "❌ $label"
    cat /tmp/resolveai-check-output.txt
    failures=$((failures + 1))
  fi

  echo ""
}

check_command "API liveness" "curl -fsS $API_URL/live"
check_command "API readiness" "curl -fsS $API_URL/ready"
check_command "AI service health" "curl -fsS $AI_URL/health"
check_command "AI service readiness" "curl -fsS $AI_URL/ready"

if [ -f "./scripts/ops/security-check.sh" ]; then
  check_command "Production security check" "./scripts/ops/security-check.sh"
else
  echo "⚠️ Security check script not found."
fi

if [ -f "./scripts/ops/healthcheck-production.sh" ]; then
  check_command "Production healthcheck script" "./scripts/ops/healthcheck-production.sh"
else
  echo "⚠️ Production healthcheck script not found."
fi

echo "Summary"
echo "-------"

if [ "$failures" -gt 0 ]; then
  echo "Launch readiness failed with $failures issue(s)."
  exit 1
fi

echo "Launch readiness passed."