# ResolveAI Final Production Security Checklist

## Environment security

- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET` is strong and not default
- [ ] `JWT_REFRESH_SECRET` is strong and not default
- [ ] `INTEGRATION_SECRET_ENCRYPTION_KEY` is strong and not default
- [ ] `CORS_ORIGIN` is not `*`
- [ ] `CORS_ORIGIN` uses HTTPS
- [ ] `AGENT_RUN_DEBUG_PAYLOAD_ENABLED=false`
- [ ] `BLOCK_PRIVATE_NETWORK_INTEGRATIONS=true`
- [ ] `REQUIRE_HTTPS_IN_PRODUCTION=true`
- [ ] `.env.production` is not committed

## API security

- [ ] Helmet/security middleware enabled
- [ ] `x-powered-by` disabled
- [ ] Rate limits enabled
- [ ] Auth routes have stricter rate limits
- [ ] AI chat routes have stricter rate limits
- [ ] RBAC is enabled
- [ ] Debug endpoints protected by RBAC
- [ ] Debug payloads disabled in production
- [ ] Audit logs enabled

## Integration security

- [ ] Integration credentials encrypted at rest
- [ ] Credentials never returned by list API
- [ ] Webhook URLs validated before saving
- [ ] Webhook URLs validated before execution
- [ ] Private/local network webhook URLs blocked
- [ ] External writes require human approval
- [ ] Integration executions are audit logged
- [ ] Integration execution logs are stored

## Agentic security

- [ ] Approval-required tools do not execute automatically
- [ ] Human approval endpoint protected by RBAC
- [ ] Tool rejection supported
- [ ] Agent timeline available
- [ ] Debug endpoint disabled in production by default
- [ ] Safety evals pass
- [ ] Agentic evals pass

## Infrastructure security

- [ ] `/metrics` is blocked publicly by Caddy
- [ ] Prometheus/Grafana bound to localhost
- [ ] HTTPS enabled
- [ ] HSTS enabled
- [ ] Caddy request body limit enabled
- [ ] Docker services use `no-new-privileges`
- [ ] Docker capabilities dropped where safe
- [ ] Backups enabled
- [ ] Restore tested
- [ ] Incident snapshot script works

## Before every production deploy

````bash
./scripts/ops/security-check.sh
pnpm --dir services/api build
pnpm --dir services/api test
pytest services/ai-service# ResolveAI Final Production Security Checklist

## Environment security

- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET` is strong and not default
- [ ] `JWT_REFRESH_SECRET` is strong and not default
- [ ] `INTEGRATION_SECRET_ENCRYPTION_KEY` is strong and not default
- [ ] `CORS_ORIGIN` is not `*`
- [ ] `CORS_ORIGIN` uses HTTPS
- [ ] `AGENT_RUN_DEBUG_PAYLOAD_ENABLED=false`
- [ ] `BLOCK_PRIVATE_NETWORK_INTEGRATIONS=true`
- [ ] `REQUIRE_HTTPS_IN_PRODUCTION=true`
- [ ] `.env.production` is not committed

## API security

- [ ] Helmet/security middleware enabled
- [ ] `x-powered-by` disabled
- [ ] Rate limits enabled
- [ ] Auth routes have stricter rate limits
- [ ] AI chat routes have stricter rate limits
- [ ] RBAC is enabled
- [ ] Debug endpoints protected by RBAC
- [ ] Debug payloads disabled in production
- [ ] Audit logs enabled

## Integration security

- [ ] Integration credentials encrypted at rest
- [ ] Credentials never returned by list API
- [ ] Webhook URLs validated before saving
- [ ] Webhook URLs validated before execution
- [ ] Private/local network webhook URLs blocked
- [ ] External writes require human approval
- [ ] Integration executions are audit logged
- [ ] Integration execution logs are stored

## Agentic security

- [ ] Approval-required tools do not execute automatically
- [ ] Human approval endpoint protected by RBAC
- [ ] Tool rejection supported
- [ ] Agent timeline available
- [ ] Debug endpoint disabled in production by default
- [ ] Safety evals pass
- [ ] Agentic evals pass

## Infrastructure security

- [ ] `/metrics` is blocked publicly by Caddy
- [ ] Prometheus/Grafana bound to localhost
- [ ] HTTPS enabled
- [ ] HSTS enabled
- [ ] Caddy request body limit enabled
- [ ] Docker services use `no-new-privileges`
- [ ] Docker capabilities dropped where safe
- [ ] Backups enabled
- [ ] Restore tested
- [ ] Incident snapshot script works

## Before every production deploy

```bash
./scripts/ops/security-check.sh
pnpm --dir services/api build
pnpm --dir services/api test
pytest services/ai-service
````
