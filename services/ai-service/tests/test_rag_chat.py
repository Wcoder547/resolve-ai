from fastapi.testclient import TestClient

from app.main import app
from helpers import SAMPLE_SOURCE, FakeLLMProvider, GROUNDED_RAG_JSON, LOW_CONTEXT_RAG_JSON

client = TestClient(app)


def test_rag_chat_grounded_path_with_mocked_llm(patch_llm_chain):
    patch_llm_chain(FakeLLMProvider(GROUNDED_RAG_JSON), name="openrouter", model="mock-rag")

    response = client.post(
        "/ai/chat/rag",
        json={
            "question": "Payment succeeded but subscription is not activated. What should I check?",
            "context": (
                "Source 1: Billing Runbook\n"
                "If payment is successful but subscription is not activated, "
                "check webhook delivery and retry activation."
            ),
            "sources": [SAMPLE_SOURCE],
            "metadata": {"test": True},
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    payload = data["data"]
    assert payload["provider"] == "openrouter"
    assert payload["model"] == "mock-rag"
    assert payload["grounded"] is True
    assert payload["confidence"] == "high"
    assert payload["needsEscalation"] is False
    assert payload["guardrails"]["approved"] is True
    assert payload["guardrails"]["hasCitations"] is True
    assert len(payload["citations"]) >= 1
    assert "[S1]" in payload["answer"] or payload["citations"][0]["label"] == "S1"
    assert payload["usage"]["totalTokens"] > 0


def test_rag_chat_empty_context_returns_ungrounded_with_mock(patch_llm_chain):
    """Current rag_chat path still invokes the LLM; mock a low-confidence fallback."""
    patch_llm_chain(FakeLLMProvider(LOW_CONTEXT_RAG_JSON))

    response = client.post(
        "/ai/chat/rag",
        json={
            "question": "How do I fix a payment issue?",
            "context": "",
            "sources": [],
            "metadata": {"test": True},
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]

    assert data["grounded"] is False
    assert data["confidence"] == "low"
    assert data["needsEscalation"] is True
    assert data["guardrails"]["approved"] is True
    assert data["provider"] == "openrouter"


def test_rag_chat_validates_required_question():
    response = client.post(
        "/ai/chat/rag",
        json={
            "context": "Some context",
            "sources": [],
            "metadata": {},
        },
    )

    assert response.status_code == 422


def test_rag_chat_returns_500_when_no_providers(monkeypatch):
    monkeypatch.setattr("app.services.rag_chat.get_llm_provider_chain", lambda: [])

    response = client.post(
        "/ai/chat/rag",
        json={
            "question": "Anything",
            "context": "Some context with enough text to answer.",
            "sources": [SAMPLE_SOURCE],
        },
    )

    assert response.status_code == 500
    assert "No configured LLM providers" in response.json()["message"]


def test_rewrite_question_without_history_skips_llm():
    response = client.post(
        "/ai/chat/rewrite-question",
        json={
            "question": "How do I reset MFA?",
            "conversationHistory": [],
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]

    assert data["standaloneQuestion"] == "How do I reset MFA?"
    assert data["wasFollowUp"] is False
    assert data["confidence"] == "high"
    assert data["provider"] == "none"
    assert data["fallbackUsed"] is False


def test_rewrite_question_with_history_uses_mocked_llm(patch_llm_chain):
    provider = FakeLLMProvider(
        '{"standaloneQuestion":"How do I fix subscription activation after Stripe payment?","wasFollowUp":true,"confidence":"high"}'
    )
    patch_llm_chain(provider, name="groq", model="mock-rewrite")

    response = client.post(
        "/ai/chat/rewrite-question",
        json={
            "question": "how do I fix that?",
            "conversationHistory": [
                {"role": "user", "content": "Subscription not activated after Stripe payment"},
                {"role": "assistant", "content": "I can help with activation issues."},
            ],
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]

    assert "subscription" in data["standaloneQuestion"].lower()
    assert data["wasFollowUp"] is True
    assert data["provider"] == "groq"
    assert data["model"] == "mock-rewrite"
    assert data["fallbackUsed"] is False
    assert len(provider.calls) == 1


def test_rewrite_question_falls_back_when_providers_fail(patch_llm_chain):
    def boom(_system, _user):
        raise RuntimeError("provider down")

    patch_llm_chain(FakeLLMProvider(boom))

    response = client.post(
        "/ai/chat/rewrite-question",
        json={
            "question": "what about that?",
            "conversationHistory": [
                {"role": "user", "content": "Invoice PDF missing"},
            ],
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]

    assert data["standaloneQuestion"] == "what about that?"
    assert data["fallbackUsed"] is True
    assert data["provider"] == "fallback"
    assert data["providerErrors"]


def test_rag_stream_emits_tokens_and_done(patch_llm_chain):
    markdown = (
        "## Direct Answer\n"
        "Check webhook delivery after successful payment [S1].\n\n"
        "## Recommended Steps\n"
        "1. Verify Stripe payment status [S1].\n"
    )
    patch_llm_chain(FakeLLMProvider(markdown), name="openrouter", model="mock-stream")

    with client.stream(
        "POST",
        "/ai/chat/rag/stream",
        json={
            "question": "Payment succeeded but subscription inactive",
            "context": "Billing runbook: check webhook delivery and retry activation.",
            "sources": [SAMPLE_SOURCE],
        },
    ) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        body = "".join(response.iter_text())

    assert "data:" in body
    assert '"type": "token"' in body or '"type":"token"' in body
    assert '"type": "done"' in body or '"type":"done"' in body
    assert "webhook" in body.lower() or "S1" in body


def test_rag_stream_errors_when_no_providers(monkeypatch):
    monkeypatch.setattr("app.services.rag_chat.get_llm_provider_chain", lambda: [])

    with client.stream(
        "POST",
        "/ai/chat/rag/stream",
        json={
            "question": "Anything",
            "context": "context",
            "sources": [SAMPLE_SOURCE],
        },
    ) as response:
        assert response.status_code == 200
        body = "".join(response.iter_text())

    assert '"type": "error"' in body or '"type":"error"' in body
    assert "No configured LLM providers" in body
