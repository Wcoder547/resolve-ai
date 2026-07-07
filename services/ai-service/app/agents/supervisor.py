from uuid import uuid4

from app.config.settings import get_settings
from app.schemas.agents import AgentResolveRequest
from app.agents.triage_agent import run_triage_agent
from app.agents.retrieval_agent import run_retrieval_agent
from app.agents.diagnostic_agent import run_diagnostic_agent
from app.agents.resolution_agent import run_resolution_agent
from app.agents.qa_agent import run_qa_agent
from app.services.rag_answer_quality import (
    build_citations,
    build_markdown_answer,
    extract_citation_labels,
    map_citation_reasons,
)


def normalize_confidence(value):
    confidence = str(value or "medium").lower().strip()

    if confidence not in {"low", "medium", "high"}:
        return "medium"

    return confidence


def build_citation_catalog_for_resolution(payload: AgentResolveRequest):
    catalog = []

    for index, source in enumerate(payload.sources, start=1):
        catalog.append(
            {
                "label": f"S{index}",
                "sourceId": source.source_id,
                "sourceName": source.source_name,
                "documentId": source.document_id,
                "documentTitle": source.document_title,
                "chunkId": source.chunk_id,
                "chunkIndex": source.chunk_index,
                "score": source.score,
            }
        )

    return catalog


def build_final_answer_and_citations(payload: AgentResolveRequest, resolution: dict):
    direct_answer = str(resolution.get("directAnswer", "")).strip()
    recommended_steps = resolution.get("recommendedSteps", [])

    if not isinstance(recommended_steps, list):
        recommended_steps = []

    recommended_steps = [str(step).strip() for step in recommended_steps if str(step).strip()]

    answer_text_for_citations = " ".join([direct_answer, *recommended_steps])
    used_labels = extract_citation_labels(answer_text_for_citations)

    citation_catalog = build_citation_catalog_for_resolution(payload)
    reason_map = map_citation_reasons(resolution)

    citations = build_citations(
        used_labels=used_labels,
        citation_catalog=citation_catalog,
        reason_map=reason_map,
    )

    confidence = normalize_confidence(resolution.get("confidence", "medium"))
    needs_escalation = bool(resolution.get("needsEscalation", False))
    escalation_reason = resolution.get("escalationReason")

    if escalation_reason is not None:
        escalation_reason = str(escalation_reason).strip() or None

    answer = build_markdown_answer(
        {
            "direct_answer": direct_answer or "I could not generate a reliable answer from the available context.",
            "recommended_steps": recommended_steps,
            "citations": citations,
            "confidence": confidence,
            "needs_escalation": needs_escalation,
            "escalation_reason": escalation_reason,
        }
    )

    return {
        "answer": answer,
        "citations": citations,
        "confidence": confidence,
        "needsEscalation": needs_escalation,
        "escalationReason": escalation_reason,
    }


def resolve_with_agents(payload: AgentResolveRequest):
    settings = get_settings()

    if not settings.agentic_runtime_enabled:
        raise RuntimeError("Agentic runtime is disabled.")

    agent_run_id = str(uuid4())

    steps = []
    provider_errors = []
    fallback_used = False
    final_provider = "unknown"
    final_model = "unknown"

    triage_result = run_triage_agent(payload)
    steps.append(triage_result["step"])
    provider_errors.extend(triage_result["providerErrors"])
    fallback_used = fallback_used or triage_result["fallbackUsed"]
    final_provider = triage_result["provider"]
    final_model = triage_result["model"]

    triage_output = triage_result["output"]

    retrieval_result = run_retrieval_agent(payload)
    steps.append(retrieval_result["step"])
    provider_errors.extend(retrieval_result["providerErrors"])
    fallback_used = fallback_used or retrieval_result["fallbackUsed"]
    final_provider = retrieval_result["provider"]
    final_model = retrieval_result["model"]

    retrieval_output = retrieval_result["output"]

    diagnostic_result = run_diagnostic_agent(
        payload=payload,
        triage_output=triage_output,
        retrieval_output=retrieval_output,
    )
    steps.append(diagnostic_result["step"])
    provider_errors.extend(diagnostic_result["providerErrors"])
    fallback_used = fallback_used or diagnostic_result["fallbackUsed"]
    final_provider = diagnostic_result["provider"]
    final_model = diagnostic_result["model"]

    diagnostic_output = diagnostic_result["output"]

    resolution_result = run_resolution_agent(
        payload=payload,
        triage_output=triage_output,
        retrieval_output=retrieval_output,
        diagnostic_output=diagnostic_output,
    )
    steps.append(resolution_result["step"])
    provider_errors.extend(resolution_result["providerErrors"])
    fallback_used = fallback_used or resolution_result["fallbackUsed"]
    final_provider = resolution_result["provider"]
    final_model = resolution_result["model"]

    resolution_output = resolution_result["output"]

    qa_result = run_qa_agent(
        payload=payload,
        resolution_output=resolution_output,
    )
    steps.append(qa_result["step"])
    provider_errors.extend(qa_result["providerErrors"])
    fallback_used = fallback_used or qa_result["fallbackUsed"]
    final_provider = qa_result["provider"]
    final_model = qa_result["model"]

    qa_output = qa_result["output"]

    final = build_final_answer_and_citations(payload, resolution_output)

    approved = bool(qa_output.get("approved", False))

    if settings.agent_require_qa_approval and not approved:
        final["answer"] = "\n".join(
            [
                "## Direct Answer",
                "I found relevant context, but the multi-agent QA check did not approve the generated resolution.",
                "",
                "## Recommended Steps",
                "1. Review the retrieved sources manually.",
                "2. Ask the question again with more specific details.",
                "3. Escalate to a human support lead if this is customer-impacting.",
                "",
                "## Confidence",
                "Low",
            ]
        )
        final["confidence"] = "low"
        final["needsEscalation"] = True
        final["escalationReason"] = qa_output.get("unsupportedReason") or "QA guardrail did not approve the resolution."

    return {
        "answer": final["answer"],
        "agentRunId": agent_run_id,
        "status": "completed" if approved else "completed_with_guardrail_warning",
        "agentsUsed": [
            "triage_agent",
            "retrieval_agent",
            "diagnostic_agent",
            "resolution_agent",
            "qa_agent",
        ],
        "steps": steps,
        "sources": payload.sources,
        "citations": final["citations"],
        "triage": triage_output,
        "retrievalReview": retrieval_output,
        "diagnostic": diagnostic_output,
        "resolution": resolution_output,
        "qa": qa_output,
        "grounded": bool(qa_output.get("grounded", False)) and len(final["citations"]) > 0,
        "confidence": final["confidence"],
        "needsEscalation": final["needsEscalation"],
        "escalationReason": final["escalationReason"],
        "provider": final_provider,
        "model": final_model,
        "promptVersion": settings.agentic_prompt_version,
        "fallbackUsed": fallback_used,
        "providerErrors": provider_errors,
    }