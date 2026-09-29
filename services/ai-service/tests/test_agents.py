from fastapi.testclient import TestClient

from app.main import app
from helpers import SAMPLE_SOURCE, FakeLLMProvider, agent_resolve_llm_response

client = TestClient(app)

RESOLVE_PAYLOAD = {
    "question": "Payment is successful but subscription is not activated.",
    "standaloneQuestion": "Payment is successful but subscription is not activated.",
    "context": (
        "Source 1: Billing Runbook\n"
        "Content: If payment succeeds but subscription is not activated, "
        "check webhook delivery and retry activation."
    ),
    "sources": [SAMPLE_SOURCE],
    "conversationHistory": [],
    "metadata": {"test": True},
}


def test_agents_resolve_succeeds_with_mocked_provider_chain(patch_llm_chain):
    patch_llm_chain(
        FakeLLMProvider(agent_resolve_llm_response),
        name="openrouter",
        model="mock-agents",
    )

    response = client.post("/ai/agents/resolve", json=RESOLVE_PAYLOAD)

    assert response.status_code == 200, response.text
    body = response.json()

    assert body["success"] is True
    data = body["data"]
    assert data["status"] in {"completed", "completed_with_guardrail_warning"}
    assert data["provider"] == "openrouter"
    assert data["model"] == "mock-agents"
    assert "triage_agent" in data["agentsUsed"]
    assert "resolution_agent" in data["agentsUsed"]
    assert "qa_agent" in data["agentsUsed"]
    assert len(data["steps"]) >= 5
    assert data["triage"]["category"] == "billing"
    assert data["resolution"]["confidence"] == "high"
    assert data["grounded"] is True
    assert len(data["citations"]) >= 1
    assert data["qa"]["approved"] is True


def test_agents_resolve_returns_500_when_runtime_disabled(monkeypatch):
    from app.config.settings import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "agentic_runtime_enabled", False)

    response = client.post("/ai/agents/resolve", json=RESOLVE_PAYLOAD)

    assert response.status_code == 500
    assert "disabled" in response.json()["message"].lower()


def test_agents_resolve_validates_payload():
    response = client.post(
        "/ai/agents/resolve",
        json={"context": "x", "sources": []},
    )

    assert response.status_code == 422
