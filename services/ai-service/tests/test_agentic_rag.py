"""Unit tests for agentic_rag helpers (HTTP route now uses rag_chat)."""

from app.schemas.chat import RagChatRequest, RagSource
from app.services.agentic_rag import (
    build_agent_plan,
    classify_intent,
    dedupe_sources,
    detect_missing_info,
    no_context_response,
    should_escalate,
    truncate_text,
)


def _source(chunk_id="chunk_1", **kwargs):
    base = dict(
        source_id="src_1",
        source_name="Billing Runbook",
        document_id="doc_1",
        document_title="Billing Runbook",
        chunk_id=chunk_id,
        chunk_index=0,
        score=0.9,
    )
    base.update(kwargs)
    return RagSource(**base)


def test_classify_intent_billing_and_incident():
    assert classify_intent("Payment failed for subscription") == "billing_support"
    assert classify_intent("Production is down with timeout errors") == "incident_troubleshooting"
    assert classify_intent("How do I configure SSO?") == "how_to_guidance"
    assert classify_intent("Is this policy allowed?") == "policy_question"
    assert classify_intent("Hello there") == "general_support"


def test_detect_missing_info_and_escalation():
    missing = detect_missing_info("payment failed", "short")
    assert missing

    assert should_escalate("billing_support", "subscription not activated", missing) is True
    assert should_escalate("general_support", "hello", []) is False


def test_dedupe_sources():
    sources = [
        _source(chunk_id="a"),
        _source(chunk_id="a"),
        _source(chunk_id="b"),
    ]
    deduped = dedupe_sources(sources)
    assert len(deduped) == 2


def test_truncate_text():
    assert truncate_text("short", 100) == "short"
    long = "x" * 50
    truncated = truncate_text(long, 20)
    assert truncated.startswith("x" * 20)
    assert "trimmed" in truncated.lower()


def test_no_context_response_shape():
    payload = RagChatRequest(
        question="How do I fix a payment issue?",
        context="",
        sources=[],
        metadata={"test": True},
    )
    plan = build_agent_plan(payload.question, payload.context, payload.sources)
    result = no_context_response(payload, plan)

    assert result["grounded"] is False
    assert result["provider"] == "none"
    assert result["model"] == "none"
    assert result["agentPlan"]["intent"] == "billing_support"
    assert result["quality"]["guardrail"] == "NO_CONTEXT_RESPONSE"
    assert "Direct Answer" in result["answer"]
