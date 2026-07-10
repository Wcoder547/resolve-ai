# ResolveAI Final Launch Readiness Checklist

## 1. Environment

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] Redis URL configured
- [ ] JWT secrets are strong
- [ ] Integration encryption key is strong
- [ ] CORS origin uses HTTPS frontend URL
- [ ] Debug payloads disabled in production
- [ ] Private network integration URLs blocked
- [ ] Metrics are blocked publicly through Caddy

## 2. Backend API

- [ ] API builds successfully
- [ ] Prisma migrations apply successfully
- [ ] Auth works
- [ ] RBAC works
- [ ] Knowledge upload works
- [ ] Knowledge ingestion queue works
- [ ] Worker runs
- [ ] RAG chat works
- [ ] Agentic chat works
- [ ] Tool approval flow works
- [ ] Integration execution logs are stored
- [ ] Audit logs are stored

## 3. AI Service

- [ ] FastAPI starts successfully
- [ ] `/health` works
- [ ] `/ready` works
- [ ] Embeddings endpoint works
- [ ] RAG chat endpoint works
- [ ] Agentic runtime works
- [ ] Tool planner works
- [ ] QA guardrail works
- [ ] LLM fallback works

## 4. RAG Quality

- [ ] Document ingestion works
- [ ] Chunks are created
- [ ] Embeddings are generated
- [ ] Hybrid search works
- [ ] Citations appear in answers
- [ ] No-context fallback works
- [ ] RAG evaluation passes

## 5. Agentic Runtime

- [ ] Triage Agent runs
- [ ] Retrieval Review Agent runs
- [ ] Diagnostic Agent runs
- [ ] Tool Agent runs
- [ ] Resolution Agent runs
- [ ] QA Agent runs
- [ ] AgentRun records are stored
- [ ] AgentStep timeline is stored
- [ ] AgentToolCall records are stored
- [ ] Approval-required tools stay pending
- [ ] Approved tools execute only after human approval
- [ ] Rejected tools do not execute

## 6. Frontend

- [ ] Agent Console works
- [ ] Agent Runs page works
- [ ] Agent Run Detail page works
- [ ] Timeline tab works
- [ ] Agents tab works
- [ ] Tools tab works
- [ ] Citations tab works
- [ ] Debug tab is permission-protected
- [ ] Tool Approvals page works

## 7. Monitoring

- [ ] Prometheus runs
- [ ] Grafana runs
- [ ] Alertmanager runs
- [ ] API metrics scrape successfully
- [ ] AI service metrics scrape successfully
- [ ] Agent run metrics appear
- [ ] Tool approval metrics appear
- [ ] Integration failure metrics appear
- [ ] Incident snapshot script works

## 8. Security

- [ ] Security check script passes
- [ ] CORS wildcard is not used
- [ ] HTTPS enforced
- [ ] Production secrets are not default
- [ ] Public `/metrics` blocked
- [ ] Integration credentials encrypted
- [ ] SSRF protection enabled
- [ ] Docker no-new-privileges enabled
- [ ] Debug payloads disabled in production

## 9. Backups and Recovery

- [ ] PostgreSQL backup works
- [ ] Uploads backup works
- [ ] Restore tested on staging/dev
- [ ] Rollback script works
- [ ] Cron backup configured

## 10. Portfolio Readiness

- [ ] README updated
- [ ] Architecture summary added
- [ ] Demo script added
- [ ] Portfolio case study added
- [ ] Screenshots recorded
- [ ] Demo video recorded
- [ ] LinkedIn post prepared
