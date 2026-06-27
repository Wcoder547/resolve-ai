#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:5000}"

echo "Checking ResolveAI production health..."
echo "API URL: $API_URL"

echo ""
echo "Checking /live..."
curl -fsS "$API_URL/live" | python3 -m json.tool

echo ""
echo "Checking /ready..."
curl -fsS "$API_URL/ready" | python3 -m json.tool

echo ""
echo "Health check completed successfully."