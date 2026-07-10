# ResolveAI Incident Response Runbook

## Severity levels

### SEV1 — Critical outage

Examples:

- API is down
- AI service is down
- Database is unavailable
- Users cannot log in
- Agentic chat completely fails

Target response: immediate

### SEV2 — Major degraded service

Examples:

- High 5xx error rate
- Agent runs failing
- Tool approvals stuck
- Integrations failing
- AI provider failing but fallback works

Target response: within 30 minutes

### SEV3 — Minor issue

Examples:

- Slow responses
- Some ingestion jobs failing
- Some documents not embedding
- Non-critical dashboard issue

Target response: same day

---

## First response checklist

1. Check service status

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```
