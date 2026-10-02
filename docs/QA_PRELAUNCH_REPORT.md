# ResolveAI — Pre-launch QA report

**Date:** 2 Oct 2026  
**Role:** Senior product tester  
**Scope:** Product readiness for free public launch (auth, UI, core loops). AI answer quality is **deferred** to a dedicated AI testing pass.

---

## Verdict

**Product shell is launch-ready after P0/P1 fixes in this session**, pending your ops smoke on a running stack (DB/Redis/API/web/email).

Docker was not available in this agent environment, so live browser E2E against localhost could not be completed here. API `pnpm build` passes after all fixes.

---

## Blockers fixed this session

| # | Issue | Fix |
|---|--------|-----|
| 1 | Chat showed false “No relevant sources” when `grounded` was undefined | Only show when `grounded === false` |
| 2 | Agent chat crashed on empty KB (`agentRun` null) | API returns stub `agentRun`; UI optional-chains |
| 3 | Agent failure response missing fields crashed Agent console | Full stub shape on failure |
| 4 | Unverified users entered app shell with opaque 403s | Register skips tokens until verified; AppShell redirects to check-email |
| 5 | `EMAIL_VERIFICATION_ENABLED=false` still blocked login | Login/refresh respect the flag; register auto-verifies |
| 6 | Any HTTP 403 on login looked like “verify email” | Only `EMAIL_NOT_VERIFIED` code |
| 7 | Dev verify/invite URLs could leak in prod UI | Frontend gated to `NODE_ENV===development`; API suppresses in production |
| 8 | Knowledge ingest badges never auto-updated | Poll every 4s while PENDING/PROCESSING |
| 9 | Zod validation often returned HTTP 500 | Global `ZodError` → 400 |
| 10 | RAG chat bypassed FREE usage limits | Limits enforced on ask + stream |
| 11 | Settings AI toggles looked live | Demo banner + disabled cursor |
| 12 | Approvals high-risk text unreadable | `text-red-700` |
| 13 | Pricing hero still showed Pro/Team | Free-only visual |
| 14 | Analytics / Agent Runs empty copy implied all Chat fills them | Clarified RAG vs agentic |
| 15 | Approvals Approved/Rejected looked like server history | Session-only notice |

---

## Still deferred (not launch blockers for free v1)

| Item | Notes |
|------|--------|
| **AI answer quality** | Separate pass — prompts, retrieval, grounding |
| Incidents page | Demo data; marked Preview in nav |
| Contact / Blog CMS | Marketing stubs |
| Mobile chat conversation drawer | Desktop works; mobile history sidebar hidden |
| Approvals history API | Session-only until backend stores decisions list |
| SSO / MFA settings | Explicitly demo-only |
| Knowledge upload enqueue failure rollback | Rare Redis-down orphan source; manual re-ingest works |
| Unused shadcn `calendar`/`chart`/`resizable` TS | Not on critical path |

---

## Go-live smoke (you run on your machine)

```bash
# 1. Infra
docker compose up -d

# 2. API + worker + AI
pnpm --filter api dev
pnpm --filter api worker:knowledge:dev
# start ai-service with its .env

# 3. Web
pnpm --filter web dev
```

Checklist:

1. Register → check-email (no dashboard access) → verify via Resend → login  
2. Forgot password → reset → login  
3. Upload knowledge → status moves Pending → Processing → Ready without refresh  
4. Chat RAG question → answer + citations; **no false red “no sources”** on good answers  
5. Empty KB chat → clear no-context message (no UI crash)  
6. Agent-style question (“create a ticket for …”) → thinking “Running multi-agent…” → answer  
7. Settings → Plan & usage = Free only  
8. Invite member → email arrives (or fails gracefully without exposing URL in prod)  
9. Approvals: high-risk warning readable; session note visible  

See also: [`docs/PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md).

---

## Next: AI testing pass

When product smoke is green, focus AI on:

1. Retrieval relevance / hybrid scores  
2. Citation fidelity vs chunks  
3. No-hallucination when KB empty  
4. Agentic tool gating + approval payloads  
5. Follow-up rewrite quality  

Do **not** treat AI quality as a blocker for deploy of auth/email/knowledge shell — ship shell first, then harden prompts.
