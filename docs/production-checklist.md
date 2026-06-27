# ResolveAI Production Checklist

## Before deployment

- [ ] `.env.production` exists on VPS
- [ ] `NODE_ENV=production`
- [ ] Strong `POSTGRES_PASSWORD`
- [ ] Strong `JWT_ACCESS_SECRET`
- [ ] Strong `JWT_REFRESH_SECRET`
- [ ] Real `OPENROUTER_API_KEY` or selected LLM provider key
- [ ] `METRICS_TOKEN` is set
- [ ] `CORS_ORIGIN` is not `*`
- [ ] API domain points to VPS
- [ ] Caddyfile domain is correct
- [ ] Backups folder exists
- [ ] Cron backup is configured

## Deployment

- [ ] Run full backup before deployment
- [ ] Build images
- [ ] Run migrations through `api-migrate`
- [ ] Start API, worker, AI service, Postgres, Redis
- [ ] Verify `/live`
- [ ] Verify `/ready`
- [ ] Verify worker logs
- [ ] Verify migration logs

## After deployment

- [ ] Upload a test knowledge document
- [ ] Confirm worker processes ingestion
- [ ] Confirm embeddings are generated
- [ ] Ask RAG question
- [ ] Confirm citations
- [ ] Confirm usage tracking
- [ ] Confirm `/metrics` requires token if configured
- [ ] Confirm backups are being created

## Emergency

- [ ] Use `scripts/ops/rollback-production.sh`
- [ ] Use `scripts/ops/restore-postgres.sh`
- [ ] Check `docker logs resolveai_api_prod`
- [ ] Check `docker logs resolveai_ai_service_prod`
- [ ] Check `docker logs resolveai_knowledge_worker_prod`
- [ ] Check `docker logs resolveai_api_migrate_prod`
