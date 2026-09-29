# ResolveAI — Complete Project Walkthrough

**ResolveAI** is a multi-tenant SaaS for support/incident teams: upload your docs, ask questions, get **grounded answers with citations**, and let multi-agent AI plan actions — with **human approval** before anything risky runs.

Think: “ChatGPT for _your_ company knowledge,” plus agent workflows, audit trails, and production ops — not a generic chatbot.

---

## 1. Big picture architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js    │────▶│  Express API     │────▶│  FastAPI AI     │
│  (web)      │     │  (Node/Prisma)   │     │  (agents/RAG)   │
└─────────────┘     └────────┬─────────┘     └─────────────────┘
                             │
                    ┌────────┴────────┐
                    │ PostgreSQL      │
                    │ + pgvector      │
                    │ Redis + BullMQ  │
                    └─────────────────┘
```

| Layer                          | Role                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| **Web** (`apps/web`)           | UI: auth, knowledge, chat, approvals, agent runs, analytics                    |
| **API** (`services/api`)       | Auth, RBAC, orgs, ingestion queue, retrieval, chat orchestration, integrations |
| **AI** (`services/ai-service`) | Chunking, embeddings, RAG, multi-agent supervisor, tools                       |
| **Data**                       | Postgres + pgvector (docs/embeddings), Redis (jobs)                            |

Local DB/Redis: `docker compose up -d`. Web and API run via pnpm; AI is a separate Python FastAPI process.

---

## 2. User perspective (product story)

### Who uses it

| Role                     | What they do                                                  |
| ------------------------ | ------------------------------------------------------------- |
| **Support agent**        | Ask questions, read citations, use chat                       |
| **Developer / incident** | Inspect agent runs, debug steps                               |
| **Admin / Owner**        | Upload knowledge, manage members, integrations, approve tools |
| **Viewer**               | Read-only knowledge/chat/runs                                 |

Roles map to permissions (`OWNER`, `ADMIN`, `DEVELOPER`, `SUPPORT_AGENT`, `VIEWER`).

### Typical journey

1. **Register / login** → JWT + refresh tokens
2. **Onboarding** → join/create an organization (tenant)
3. **Knowledge Base** → upload PDF / TXT / MD / DOCX
4. System **chunks + embeds** docs in the background
5. **AI Chat** → ask in natural language
6. Get an answer with **source citations** (which doc/chunk)
7. If the agent wants a risky action (e.g. create ticket) → **Approvals** queue
8. Human approves/rejects → then webhook/integration can run
9. **Agent Runs** → full timeline of every agent step/tool call
10. **Analytics** → usage, cost, activity

### App screens (sidebar)

- Overview / Dashboard
- Knowledge Base
- AI Chat
- Tickets / Incidents (ops surfaces)
- Approvals
- Agent Runs
- Analytics
- Settings

### Product promise (what users care about)

1. Answers grounded in _their_ docs
2. Visible sources
3. Human approval for risky AI actions
4. Full AI traceability

---

## 3. Frontend perspective

**Stack:** Next.js + React + TypeScript + Tailwind + shadcn-style UI.

**Layout:**

- Marketing: `/` landing
- Auth: `/login`, `/register`
- App shell: `(app)/*` with shared `AppShell` sidebar

**How the UI talks to the backend**

- `lib/api-client.ts` / `lib/api.ts` → REST to Express `/api/v1/...`
- Auth helpers store/refresh tokens
- Feature pages are mostly client components that call those APIs

**Main feature components**

| Area            | Component folder                         |
| --------------- | ---------------------------------------- |
| Chat            | `components/chat`                        |
| Knowledge       | `components/knowledge`                   |
| Approvals       | `components/approvals`                   |
| Agent runs      | `components/agent-runs`                  |
| Analytics       | `components/analytics`                   |
| Settings / auth | `components/settings`, `components/auth` |

**Frontend’s job:** auth UX, org context, upload/list knowledge, chat with citations, show pending approvals + agent timelines, usage charts. It does **not** run LLMs; it orchestrates via the API.

---

## 4. Backend perspective

**Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, BullMQ.

### API surface (`services/api/src/app.ts`)

| Prefix                  | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `/api/v1/auth`          | Register, login, refresh                                 |
| `/api/v1/organizations` | Tenants, membership                                      |
| `/api/v1/knowledge`     | Upload, ingest, search                                   |
| `/api/v1/chat`          | Conversations, agentic ask, tool approval, observability |
| `/api/v1/usage`         | Token/cost tracking                                      |
| `/api/v1/rbac`          | Roles/permissions                                        |
| `/api/v1/integrations`  | Slack/ticketing/generic webhooks                         |

Plus health, metrics, rate limits, Helmet, CORS, request IDs.

### Domain model (mental model)

- **Organization** = tenant
- **User** ↔ **OrganizationMember** (role)
- **KnowledgeSource** → **Document** → **DocumentChunk** (+ `vector(384)` embedding)
- **Conversation** → **Message**
- **AgentRun** → **AgentStep** + **AgentToolCall** (approval status)
- **OrganizationIntegration** + execution logs
- **AiUsageEvent** / daily rollups
- **AuditLog**

### Backend’s job on a chat question

1. Auth + RBAC (`chat:ask`)
2. Check AI usage limits
3. Optionally rewrite follow-up into a standalone question (AI service)
4. **Hybrid search** over org chunks (pgvector + keyword)
5. Call AI **agentic resolve** with question + retrieved sources
6. Persist conversation, message, `AgentRun`, steps, tool calls
7. Record token usage
8. If tools need approval → leave them `PENDING` for humans

### Knowledge pipeline

1. Upload file (local or R2-style storage)
2. Create `KnowledgeSource` (`PENDING`)
3. BullMQ job on Redis
4. AI service: load → chunk → embed
5. Store chunks + vectors in Postgres
6. Status → `COMPLETED` / `FAILED`

### Integrations & safety

- Encrypted credentials
- Webhooks with SSRF protection
- Risky tools: approve in API before real side effects

Backend = **system of record + gatekeeper**. AI = brain; API decides what is allowed and what is stored.

---

## 5. AI perspective

**Stack:** Python, FastAPI, embeddings (FastEmbed / 384-dim), LLM providers (OpenRouter / Groq / Gemini with fallback), RAG + multi-agent pipeline.

### AI service routes (`/ai/...`)

- Ingestion (chunk/load helpers)
- Embeddings
- Chat / question rewrite / RAG answer
- Agents (resolve supervisor)
- Tools (plan execution / registry)

### RAG ideas

1. Split docs into chunks
2. Embed → store in pgvector
3. Retrieve relevant chunks for a question
4. Generate answer **only from that context**
5. Attach **citations** (S1, S2, … → real chunks)
6. Rewrite conversational follow-ups into standalone queries

### Multi-agent supervisor (the “brain”)

Full teaching guide (diagrams, conditionals, parallel vs sequential):  
[`services/ai-service/docs/AGENTS.md`](services/ai-service/docs/AGENTS.md)

Pipeline in `supervisor.py`:

```text
Question + sources
    │
    ▼
Triage Agent          → categorize / prioritize
    │
    ▼
Retrieval Review      → are sources good enough?
    │
    ▼
Diagnostic Agent      → what’s wrong / what’s needed?
    │
    ▼
Tool Agent            → plan tools (ticket, status check, …)
    │
    ▼
Tool Executor         → safe tools now; risky → pending approval
    │
    ▼
Resolution Agent      → draft answer + steps + citations
    │
    ▼
QA / Guardrail Agent  → grounded? approved? escalate?
    │
    ▼
Final answer + steps + citations + confidence + escalation flags
```

If QA fails (and QA approval is required), the user gets a safe “couldn’t approve” response and escalation — not a confident hallucination.

### Tool safety model

- **Safe / mock read tools** → can auto-run (e.g. mock customer status)
- **Draft tools** → create internal drafts
- **Approval-required** → API stores pending `AgentToolCall` until a human with `agent_tool:approve` acts
- **Disabled** → never run

That’s the difference between a demo chatbot and production-minded agentic AI.

---

## 6. End-to-end: one support question

```text
User types: "Customer can't reset password — what should we do?"

1. Web → POST /api/v1/chat/...
2. API authenticates + checks RBAC + usage
3. API rewrites question if needed (AI)
4. API searches DocumentChunks for that org
5. API sends question + chunks to AI /agents resolve
6. Supervisor runs triage → retrieval → diagnostic → tools → resolution → QA
7. API saves Message + AgentRun + Steps + ToolCalls
8. Web shows answer + citations
9. If create_ticket needs approval → Approvals page
10. Human approves → API hits ticketing webhook → log execution
```

---

## 7. How the monorepo is organized

```text
resolve-ai/
├── apps/web/              # Next.js frontend
├── services/api/          # Express + Prisma backend
├── services/ai-service/   # FastAPI AI
├── docs/                  # Case study, ER diagram
├── ops/                   # Prometheus, Grafana, Alertmanager
├── caddy/                 # Reverse proxy (prod)
├── docker-compose*.yml    # Local DB + prod/monitoring stacks
└── scripts/               # Ops helpers
```

**DevOps flavor:** Docker, Caddy, Prometheus/Grafana, GitHub Actions, backup/rollback scripts — treated as a production-style SaaS, not a toy.

---

## 8. Mental model to remember

| Lens         | One sentence                                                                                |
| ------------ | ------------------------------------------------------------------------------------------- |
| **User**     | Upload knowledge → ask → get cited answers → approve risky actions → inspect AI runs        |
| **Frontend** | Multi-page SaaS UI over REST; no LLM logic in the browser                                   |
| **Backend**  | Multi-tenant auth/RBAC, ingestion jobs, retrieval, orchestration, persistence, integrations |
| **AI**       | Embeddings + RAG + supervisor agents + tools + QA guardrails                                |

**Core engineering idea:** AI is powerful but **not trusted blindly** — grounding, citations, approvals, and full run history make it operable in real support/incident work.
