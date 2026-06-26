from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_rag_chat_returns_safe_no_context_response():
    response = client.post(
        "/ai/chat/rag",
        json={
            "question": "How do I fix a payment issue?",
            "context": "",
            "sources": [],
            "metadata": {
                "test": True
            },
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["data"]["grounded"] is False
    assert data["data"]["provider"] == "none"
    assert data["data"]["model"] == "none"
    assert data["data"]["agentPlan"]["intent"] == "billing_support"
    assert data["data"]["quality"]["guardrail"] == "NO_CONTEXT_RESPONSE"


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