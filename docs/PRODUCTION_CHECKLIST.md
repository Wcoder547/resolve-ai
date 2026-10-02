# ResolveAI production checklist — free product launch

**Goal:** Ship ResolveAI as a **completely free** public product on a low-cost stack (same approach as the Vynuro internal tool): one VM, Cloudflare, Resend, optional R2 — with real email for verify / forgot-password / invites.

Updated: 2 Oct 2026.

---

## 1. Recommended free stack (~$0 extras)

| Need | Use (free / cheap) | Why |
|------|--------------------|-----|
| Domain | Your domain | Already owned or register one |
| DNS + HTTPS | **Cloudflare** (free) | SSL, CDN, DDoS |
| App host | **One Lightsail / EC2** | Full Docker Compose on one box |
| DB + Redis | Postgres + Redis **in Compose** | Avoid RDS / ElastiCache credit burn |
| Object storage | Local volume v1, or **Cloudflare R2** | R2: 10 GB free; S3-compatible |
| Email | **Resend** (3k emails/mo free) | Verify, reset, invites |
| Frontend | Vercel free tier **or** Next on the same VM | Point `NEXT_PUBLIC_API_URL` at API |
| LLM | OpenRouter / Groq / Gemini keys | **You pay** usage; FREE plan limits protect spend |

**Avoid on a free budget:** ALB + NAT + RDS Multi-AZ + ElastiCache.

---

## 2. Hostnames (Cloudflare)

| Host | Points to | Service |
|------|-----------|---------|
| `app.yourdomain.com` | VM IP or Vercel | Next.js web |
| `api.yourdomain.com` | Same VM (Proxied) | Express API via Caddy |

`caddy/Caddyfile` currently proxies `api.yourdomain.com` → `api:5000`. Replace the hostname and email before go-live.

---

## 3. Production env

Copy `.env.production.example` → server `.env.production` (never commit secrets).

### Required

```bash
NODE_ENV=production

# Public URLs (must match DNS)
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
CORS_ORIGIN=https://app.yourdomain.com
AI_SERVICE_URL=http://ai-service:8000

# Secrets (openssl rand -base64 48)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
INTEGRATION_SECRET_ENCRYPTION_KEY=

DATABASE_URL=postgresql://USER:STRONG_PASSWORD@postgres:5432/resolveai?schema=public
REDIS_URL=redis://redis:6379
TRUST_PROXY=true

# Email — Resend preferred (free)
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM="ResolveAI <noreply@yourdomain.com>"
EMAIL_FROM="ResolveAI <noreply@yourdomain.com>"
EMAIL_VERIFICATION_ENABLED=true

# LLM (platform keys — keep FREE limits on)
OPENROUTER_API_KEY=
# or GROQ_API_KEY= / GOOGLE_API_KEY=
LLM_PROVIDER=openrouter
```

### Optional SMTP fallback (if not using Resend)

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxx
```

Or any other SMTP provider via `SMTP_*`.

### Web (Vercel / local build)

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Bake at **build time** for Next.js.

---

## 4. Master checklist (do in order)

### A. Accounts & DNS

- [ ] Cloudflare → add site
- [ ] A records: `app`, `api` → VM (or `app` → Vercel)
- [ ] SSL/TLS: Full (strict) once origin cert is ready
- [ ] Update `caddy/Caddyfile` hostnames + ACME email

### B. Email (Resend — required for auth)

- [ ] Sign up at [resend.com](https://resend.com)
- [ ] Verify domain (SPF, DKIM, optional DMARC)
- [ ] Create API key → `RESEND_API_KEY`
- [ ] Set `RESEND_FROM` / `EMAIL_FROM` on the **verified** domain
- [ ] Until domain verifies, test with Resend’s onboarding sender → your signup inbox only
- [ ] Keep `EMAIL_VERIFICATION_ENABLED=true`
- [ ] Smoke:
  - [ ] Register → verification email → click link → can use chat/knowledge
  - [ ] Resend verification from login
  - [ ] Forgot password → reset email → new password works
  - [ ] Invite teammate → invite email → accept

**Priority in code:** Resend (`RESEND_API_KEY`) → else `SMTP_*` → else log-only (`SMTP_NOT_CONFIGURED`).

### C. Storage (optional R2)

- [ ] Local volume is fine for single-VM v1 (`STORAGE_PROVIDER=local`)
- [ ] Or R2: set `STORAGE_PROVIDER=r2` + `R2_*` vars

### D. Compute

- [ ] Lightsail / small EC2, Ubuntu 24.04
- [ ] Security group: **22** (your IP), **80/443** (world or Cloudflare only)
- [ ] Install Docker + Compose
- [ ] Clone repo; create `.env.production` from `.env.production.example`
- [ ] `./scripts/ops/security-check.sh`
- [ ] `./scripts/ops/deploy-production.sh` (or compose up)
- [ ] Confirm: `https://api.yourdomain.com/live` and web loads

### E. Free product policy (already in code)

- [ ] Confirm Settings → **Plan & usage** shows Free only (no Upgrade)
- [ ] Confirm Pricing page is Free-only
- [ ] Confirm `PATCH /organizations/current/plan` with `PRO`/`TEAM` returns **400**
- [ ] New orgs default to `FREE` with usage limits

### F. Hardening

- [ ] Strong Postgres password
- [ ] UFW: 22/80/443 only
- [ ] Nightly DB backup (`scripts/ops/backup-postgres.sh` → off-box)
- [ ] `METRICS_TOKEN` set (or rely on Caddy blocking `/metrics`)
- [ ] Never commit `.env.production`
- [ ] Rotate keys if leaked

### G. Go-live smoke

- [ ] Register / verify / login / logout
- [ ] Forgot + reset password
- [ ] Upload knowledge → ingest completes
- [ ] RAG chat with citations
- [ ] Agentic ask → pending approval → approve/reject
- [ ] Org invite email
- [ ] Usage page shows Free limits
- [ ] `./scripts/ops/launch-readiness-check.sh`

---

## 5. Why Resend

| | Resend | Random VPS SMTP / Gmail |
|--|--------|-------------------------|
| Free tier | 3,000 emails / month | Often blocked |
| Deliverability | SPF/DKIM guided | Easy spam |
| In ResolveAI | `RESEND_API_KEY` + `RESEND_FROM` | `SMTP_*` still works |

---

## 6. Cost map

| Item | Est. | Notes |
|------|------|--------|
| Lightsail / small EC2 | ~$5–15 / mo | Main infra cost |
| Cloudflare | $0 | |
| Resend | $0 under 3k/mo | |
| R2 (optional) | $0 on free tier | |
| LLM APIs | Variable | Protected by FREE plan limits |

---

## 7. Deploy commands (on the VM)

```bash
cd /opt/resolve-ai   # your clone path
cp .env.production.example .env.production
# edit secrets + URLs + Resend + LLM keys

ENV_FILE=.env.production ./scripts/ops/security-check.sh
ENV_FILE=.env.production ./scripts/ops/deploy-production.sh

# After mail-only env changes (no image rebuild needed):
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate api knowledge-worker
```

Web on Vercel: set `NEXT_PUBLIC_API_URL`, redeploy frontend after API URL changes.

---

## 8. Deferred (not blocking free launch)

- Incidents product surface (currently demo UI)
- Contact form backend / blog CMS
- SSO / MFA toggles in Settings (demo-only)
- Org BYOK LLM keys routed into chat
- Stripe / paid tiers (intentionally out of scope)
- Multi-VM HA

Ship free production first; iterate after real users.

---

## 9. Related scripts

| Script | Purpose |
|--------|---------|
| `scripts/ops/security-check.sh` | Secrets / CORS / HTTPS sanity |
| `scripts/ops/launch-readiness-check.sh` | API + AI health + security |
| `scripts/ops/deploy-production.sh` | Backup → build → up → health |
| `scripts/ops/healthcheck-production.sh` | Post-deploy health |
| `scripts/ops/backup-postgres.sh` | DB backup |
| `scripts/ops/rollback-production.sh` | Rollback |
