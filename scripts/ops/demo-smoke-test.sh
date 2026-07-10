#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:5000}"
EMAIL="${DEMO_EMAIL:-waseem@example.com}"
PASSWORD="${DEMO_PASSWORD:-password123}"

echo "ResolveAI Demo Smoke Test"
echo "========================="
echo ""

echo "Logging in..."

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['tokens']['accessToken'])")

echo "✅ Login successful"
echo ""

echo "Testing normal RAG chat..."

curl -s -X POST "$API_URL/api/chat/ask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "question": "Payment is successful but subscription is not activated. What should support do?",
    "limit": 5
  }' | python3 -m json.tool

echo ""
echo "✅ RAG chat tested"
echo ""

echo "Testing agentic chat..."

AGENT_RESPONSE=$(curl -s -X POST "$API_URL/api/chat/agent/ask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "question": "Payment is successful but subscription is not activated. Create a support ticket for this issue after approval.",
    "limit": 5
  }')

echo "$AGENT_RESPONSE" | python3 -m json.tool

AGENT_RUN_ID=$(echo "$AGENT_RESPONSE" | python3 -c "import sys,json; data=json.load(sys.stdin)['data']; print(data['agentRun']['id'] if data.get('agentRun') else '')")

if [ -n "$AGENT_RUN_ID" ]; then
  echo ""
  echo "✅ Agentic chat tested"
  echo "Agent Run ID: $AGENT_RUN_ID"
  echo ""

  echo "Testing agent timeline..."

  curl -s "$API_URL/api/chat/agent/runs/$AGENT_RUN_ID/timeline" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

  echo ""
  echo "✅ Agent timeline tested"
else
  echo "⚠️ No agent run created. This may happen if no relevant context was found."
fi

echo ""
echo "Testing pending approvals..."

curl -s "$API_URL/api/chat/agent/tool-calls/pending" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

echo ""
echo "✅ Pending approvals tested"
echo ""
echo "Demo smoke test completed."