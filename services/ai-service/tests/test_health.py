from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["service"] == "ai-service"
    assert "environment" in data
    assert "version" in data


def test_provider_endpoint():
    response = client.get("/ai/provider")

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert "provider" in data
    assert "model" in data
    assert "providerApiKeyConfigured" in data