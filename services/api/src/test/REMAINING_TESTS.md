# Remaining API tests (`services/api`)

Snapshot of coverage gaps vs existing Vitest + Supertest suite.

**Already covered (8 files, ~25 tests):** core auth (register/login/refresh/logout), health, RBAC, usage summary (partial), chat tool-approval, agent-run debug ACL, `url-safety` helpers.

---

## 1. Auth — remaining

File to add: `src/modules/auth/auth.email-password.test.ts` (or extend `auth.test.ts`)

| Endpoint | Suggested tests |
|----------|-----------------|
| `POST /api/v1/auth/forgot-password` | Accepts known email; does not leak whether email exists |
| `POST /api/v1/auth/reset-password` | Valid token resets password; invalid/expired token rejected |
| `GET/POST /api/v1/auth/verify-email` | Query + body verify; invalid token fails |
| `POST /api/v1/auth/resend-verification` | Resends for unverified user; rate/safe for unknown email |
| `POST /api/v1/auth/change-password` | Success when verified; blocked when email unverified |
| `GET /api/v1/auth/sessions` | Lists sessions |
| `POST /api/v1/auth/sessions/revoke-others` | Keeps current, revokes others |
| `DELETE /api/v1/auth/sessions/:sessionId` | Revokes one session |
| `POST /api/v1/auth/logout` | Single-session logout |

---

## 2. Chat — remaining

Partially covered (tool approve/reject + debug ACL only).

| Endpoint | Suggested tests |
|----------|-----------------|
| `POST /api/v1/chat/ask` | RAG ask (mock AI client); grounded + no-context paths |
| `POST /api/v1/chat/ask/stream` | SSE status/token/done events (mock stream) |
| `POST /api/v1/chat/agent/ask` | Agentic ask creates AgentRun (mock AI) |
| `GET /api/v1/chat/conversations` | List after ask |
| `GET /api/v1/chat/conversations/:id` | Get messages + sources metadata |
| `DELETE /api/v1/chat/conversations/:id` | Delete; 404 after |
| `GET /api/v1/chat/agent/runs` | List runs |
| `GET /api/v1/chat/agent/runs/summary` | Summary counts |
| `GET /api/v1/chat/agent/runs/:id` | Detail |
| `GET /api/v1/chat/agent/runs/:id/timeline` | Timeline steps |
| `GET /api/v1/chat/agent/tool-calls/pending` | Empty + with pending |

---

## 3. Knowledge — remaining (no tests yet)

| Endpoint | Suggested tests |
|----------|-----------------|
| `GET /api/v1/knowledge/` | List sources; RBAC VIEWER vs uploader |
| `GET /api/v1/knowledge/:sourceId` | Detail; 404 unknown |
| `POST /api/v1/knowledge/upload` | Upload PDF/text → 201 + queued ingest job |
| `POST /api/v1/knowledge/:sourceId/ingest` | 202 queued; sets/triggers PROCESSING via worker mock |
| `POST /api/v1/knowledge/search` | Returns chunks when COMPLETED source exists |
| `DELETE /api/v1/knowledge/:sourceId` | Deletes source + files/DB rows |

Also cover: ingest job enqueue payload, failed ingest → `FAILED` status (service/unit with mocks).

---

## 4. Organizations — remaining (no tests yet)

| Area | Endpoints / cases |
|------|-------------------|
| Org | `GET/PATCH /current`, `POST /current/transfer`, `DELETE /current`, `PATCH /current/plan` |
| Members | `GET /members`, `PATCH /members/:id`, `DELETE /members/:id` (+ role ACL) |
| Invites | preview, create, list, resend, revoke, accept |
| Audit | `GET /audit-logs` |
| AI providers | list, upsert, set default, test, delete |
| Notifications | `GET/PUT /notification-preferences` |

---

## 5. Tickets — remaining (no tests yet)

| Endpoint | Suggested tests |
|----------|-----------------|
| `GET /api/v1/tickets/` | List empty + after create |
| `POST /api/v1/tickets/` | Create ticket |
| `GET /api/v1/tickets/:ticketId` | Get one; 404 |
| `PATCH /api/v1/tickets/:ticketId` | Update status/fields |
| RBAC | VIEWER blocked from create/update if permissions say so |

---

## 6. Integrations — remaining (mostly uncovered)

Tool-approval tests touch ticketing webhook indirectly; dedicated coverage still needed:

| Endpoint | Suggested tests |
|----------|-----------------|
| `GET /api/v1/integrations/` | List; credentials not leaked |
| `POST /api/v1/integrations/` | Create Slack/webhook/etc. |
| `PATCH /api/v1/integrations/:id/status` | Enable/disable |
| `DELETE /api/v1/integrations/:id` | Delete |

---

## 7. Usage — remaining (partial)

Covered: record usage service + `GET /ai/summary` ACL.

| Endpoint | Suggested tests |
|----------|-----------------|
| `GET /api/v1/usage/ai/events` | List events after `recordAiUsage`; pagination if any |

---

## 8. Email / storage / jobs — remaining (no dedicated tests)

| Area | What to test |
|------|----------------|
| **email** | Unit: verification/reset mail builders; mock transport (no real SMTP in CI) |
| **storage** | Local path + R2 signed URL helpers (mock S3 client) |
| **jobs** | `enqueueKnowledgeIngestionJob` adds BullMQ job (mock Queue); worker handler calls `ingestKnowledgeSource` |

---

## 9. Health — remaining (optional)

Covered: live, root, health, 404.

Optional: `GET /ready`, `GET /metrics` (auth token if enabled).

---

## Suggested priority order

1. **Auth** — verify-email + forgot/reset password (security-critical)
2. **Knowledge** — upload / ingest queue / search / delete
3. **Chat** — `/ask` + conversations CRUD (mock AI)
4. **Tickets** — full CRUD + RBAC
5. **Organizations** — invites + members
6. **Integrations** — CRUD + no credential leak
7. **Jobs / storage / email** — unit + mocked queue
8. **Chat stream + agent ask** — once AI clients are easy to mock

---

## Notes for implementing remaining tests

- Use existing helpers in `src/test/test-helpers.ts` (`registerAndLoginTestUser`).
- DB is truncated in `src/test/setup.ts` before each test — keep tests isolated.
- Mock external AI (`callAIRagChatService`, stream, agent client) and R2/email/queue so CI stays offline-friendly.
- Run: `cd services/api && pnpm test`
