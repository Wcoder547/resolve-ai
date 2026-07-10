# ResolveAI Architecture Summary

ResolveAI is an AI-first support and incident resolution platform built with a production-style full-stack architecture.

## Core Architecture

```text
Frontend
  Next.js / React / TypeScript / Tailwind
  Agent Console
  Agent Run Timeline
  Human Approval UI

Backend API
  Node.js / Express / TypeScript
  Auth
  RBAC
  Organizations
  Knowledge management
  Chat APIs
  Agent run tracking
  Tool approval APIs
  Integrations
  Metrics
  Audit logs

Database
  PostgreSQL
  Prisma ORM
  pgvector
  AgentRun
  AgentStep
  AgentToolCall
  AiUsageEvent
  IntegrationExecutionLog

Queue
  Redis
  BullMQ
  Knowledge ingestion worker

AI Service
  Python FastAPI
  Document ingestion
  Embeddings
  RAG chat
  Question rewriting
  Multi-agent runtime
  Tool planning
  QA guardrails

Monitoring
  Prometheus
  Grafana
  Alertmanager
  Incident scripts

Deployment
  Docker
  Docker Compose
  Caddy reverse proxy
  GitHub Actions
  Backup/restore scripts
```
