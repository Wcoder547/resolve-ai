# ResolveAI — AI quality testing report

**Date:** 2 Oct 2026  
**Scope:** Why answers were often wrong / poorly shown, and what we fixed.  
**Unit tests:** `35 passed` (rag quality, rag chat, agents, tool safety).

---

## Root causes (before)

| Priority | Cause | User symptom |
|----------|--------|--------------|
| P0 | Streaming RAG had weak citation checks; empty context still called the LLM | Ungrounded / inventing answers |
| P0 | Soft ILIKE retrieval + very low hybrid floor (0.05) | Irrelevant chunks → wrong answers |
| P1 | Agent agents flattened context with `compact_text` | Lost Source/Chunk structure |
| P1 | Citation rules waived on `needsEscalation` alone | Hallucinations could pass |
| P1 | QA failure **wiped** a good resolution | “AI failed” even when answer was OK |
| P1 | Tools ran even when triage said no tool needed | Noisy / risky tool plans |
| P2 | Context labels `Source 1` vs citations `[S1]` | Model citation confusion |
| P2 | UI hid confidence; false “no sources” banner | Looked broken even when text OK |

---

## Fixes shipped this pass

### AI service
- **Empty context refusal** before LLM (JSON + stream paths)
- Safer **stream finalize** (drop invalid `[Sn]`, set escalation when needed)
- **Citation waiver** only for real low-confidence refusals (not escalation alone)
- Agent context uses **`truncate_preserving_structure`** (keeps newlines / `---`)
- Supervisor **short-circuits** when retrieval marks context inadequate
- QA failure **keeps resolution** + adds Escalation note (no wipe)
- Tool agent **skips** when triage `needsToolAction` is false
- Provider total failure returns **structured refusal** instead of hard 500 when possible

### API / retrieval
- Context text uses **`[S1]`** labels aligned with citation catalog
- **ILIKE fallback gated** (min length + ≥2 terms; max 3 chunks; score 0.08)
- Default **`RAG_MIN_HYBRID_SCORE` 0.05 → 0.12**
- Agentic eval accepts **`skipped_no_context`** stub (not only `null`)
- RAG eval guardrails: refusals don’t require `grounded=true`

### Web
- Confidence (+ Agent) badges on assistant messages

---

## What you should still smoke with live LLM keys

```bash
# AI service
cd services/ai-service && .venv/bin/uvicorn app.main:app --reload --port 8000

# API + web (with Redis/Postgres up)
pnpm --filter api dev
pnpm --filter web dev
```

1. Upload Billing Runbook (or your docs) → wait until Ready  
2. Ask: *Payment succeeded but subscription not activated — what should support check?*  
   - Expect citations `[S1]`, steps from runbook, **high/medium confidence** badge  
3. Ask: *How do I repair a motorcycle engine?*  
   - Expect **refusal / no relevant sources**, not a DIY guide  
4. Ask agent-style: *Create a support ticket for the subscription activation issue*  
   - Expect pending approval tool, not silent execute  
5. Optional: `pnpm --filter api eval:rag` / `eval:agentic` against a seeded org  

---

## Remaining (next iteration, not blocking free launch)

| Item | Notes |
|------|--------|
| Dual-query when rewrite confidence is low | Follow-ups can still miss |
| Full stream → JSON validator parity | Stream is improved but not identical to JSON path |
| Claim-vs-chunk entailment | QA still citation-shaped, not semantic |
| Prompt tuning per Groq / Gemini model | Your `.env` uses Groq `openai/gpt-oss-20b` |
| Seeded live eval run on VPS | Needs running stack + knowledge fixtures |

---

## Verdict

**AI grounding path is materially safer** for launch: fewer hallucinated citations, less retrieval noise, clearer refusals, agents keep usable answers under QA warnings.

**Live LLM smoke (above) is still required** before calling answer quality “done” — unit tests mock providers and cannot prove your Groq/Gemini responses in production.
