# ResolveAI — Agentic Support and Incident Resolution Platform

## Overview

ResolveAI is a production-style AI-first support and incident resolution platform that combines Retrieval-Augmented Generation, multi-agent workflows, human approval, external integrations, monitoring, and production security.

The goal of the project is to help support teams resolve customer issues using their own knowledge base while keeping AI actions safe, auditable, and human-controlled.

## Problem

Most AI chatbot implementations have three major problems:

1. They answer without enough grounding.
2. They cannot explain how they reached an answer.
3. They may trigger actions without a safe approval process.

ResolveAI solves this by combining RAG, multi-agent reasoning, source citations, tool approval workflows, and full observability.

## Core Features

- Organization-based multi-tenant backend
- Authentication and RBAC
- Knowledge base upload and ingestion
- PDF, TXT, Markdown, and DOCX support
- Background ingestion with Redis and BullMQ
- pgvector-based semantic search
- Hybrid retrieval with keyword and vector search
- RAG answers with citations
- Conversation-aware follow-up question rewriting
- Multi-agent runtime
- Agent run timeline
- Safe tool registry
- Human approval for risky tool actions
- External webhook integrations
- AI usage tracking
- Audit logging
- Prometheus and Grafana monitoring
- Backup, restore, rollback, and deployment scripts
- Production security hardening

## Multi-Agent Workflow

ResolveAI uses a supervisor-based multi-agent architecture.

The agent workflow includes:

1. Triage Agent
2. Retrieval Review Agent
3. Diagnostic Agent
4. Tool Agent
5. Resolution Agent
6. QA / Guardrail Agent

Each agent has a focused responsibility. The final answer is generated only after retrieval, diagnosis, tool planning, and QA checks.

## RAG Pipeline

The RAG pipeline supports document ingestion, chunking, embeddings, vector search, hybrid retrieval, and citation-based answer generation.

The system uses PostgreSQL with pgvector to store embeddings and perform semantic retrieval. It also uses keyword search and reranking to improve retrieval quality.

## Tool Safety and Human Approval

ResolveAI uses a safe tool execution model:

- Safe read tools can run automatically.
- Draft tools can create internal draft payloads.
- Risky tools require human approval.
- Disabled tools cannot run.

For example, if the agent wants to create a support ticket, it only creates a pending tool call. A human reviewer must approve it before the backend executes the external integration.

## Observability

Every agentic run is stored as an AgentRun. Each step is stored as an AgentStep, and each tool call is stored as an AgentToolCall.

This makes the system easy to debug and operate in production.

The project also includes:

- Health checks
- Metrics
- Prometheus
- Grafana
- Alertmanager
- Incident snapshot scripts
- Incident response runbook

## Security

Security was treated as a core part of the system.

Implemented security features include:

- JWT authentication
- Refresh token rotation
- Password validation
- RBAC permissions
- Route-level authorization
- Audit logs
- Rate limiting
- CORS hardening
- Helmet security headers
- Public metrics protection
- Encrypted integration credentials
- SSRF protection for external webhooks
- Production startup security checks
- Docker hardening

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS

Backend:

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- pgvector
- Redis
- BullMQ

AI Service:

- Python
- FastAPI
- FastEmbed
- LLM provider abstraction
- OpenRouter / Groq / Gemini fallback

Infrastructure:

- Docker
- Docker Compose
- Caddy
- Prometheus
- Grafana
- Alertmanager
- GitHub Actions

## What I Learned

This project helped me practice real-world AI engineering beyond simple chatbot integration.

Key learning areas:

- Designing production RAG systems
- Building multi-agent workflows
- Implementing safe AI tool execution
- Adding human approval for risky actions
- Tracking AI usage and cost
- Designing backend observability
- Handling production security concerns
- Creating DevOps-ready deployment workflows

## Outcome

ResolveAI is a complete AI-first full-stack project that demonstrates backend engineering, RAG architecture, agentic AI, DevOps, monitoring, and production security.

It is designed as a realistic SaaS architecture for AI-powered support and incident resolution.
