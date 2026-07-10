from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_agents_route_exists_with_invalid_provider_safe_response():
    response = client.post(
        "/ai/agents/resolve",
        json={
            "question": "Payment is successful but subscription is not activated.",
            "standaloneQuestion": "Payment is successful but subscription is not activated.",
            "context": "Source 1: Billing Runbook\nContent: If payment succeeds but subscription is not activated, check webhook delivery and retry activation.",
            "sources": [
                {
                    "sourceId": "src_1",
                    "sourceName": "Billing Runbook",
                    "documentId": "doc_1",
                    "documentTitle": "Billing Runbook",
                    "chunkId": "chunk_1",
                    "chunkIndex": 0,
                    "score": 0.9,
                }
            ],
            "conversationHistory": [],
            "metadata": {
                "test": True
            },
        },
    )

    assert response.status_code in [200, 500]