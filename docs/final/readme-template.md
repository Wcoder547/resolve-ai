# ResolveAI

ResolveAI is an AI-first support and incident resolution platform built with RAG, multi-agent workflows, safe tool execution, human approval, monitoring, and production security.

## Features

- Multi-tenant organization backend
- Authentication and RBAC
- Knowledge base upload and ingestion
- PDF, TXT, Markdown, and DOCX support
- Background ingestion with Redis and BullMQ
- PostgreSQL + pgvector embeddings
- Hybrid search and reranking
- RAG answers with citations
- Conversation-aware follow-up handling
- Multi-agent incident resolution runtime
- Agent run timeline and debugging APIs
- Safe tool registry
- Human approval for risky tool execution
- External webhook integrations
- AI usage tracking
- Audit logs
- Prometheus/Grafana monitoring
- Production backup and restore scripts
- Security hardening

## Architecture

```text
Frontend → Node API → PostgreSQL/Redis → FastAPI AI Service → LLM Providers
                     ↓
              Agent Runtime
                     ↓
        Tool Approval + Integrations
```
