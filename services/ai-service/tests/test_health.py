from fastapi.testclient import TestClient

from app.config.settings import get_settings
from app.main import app

client = TestClient(app)


def test_live_endpoint():
    response = client.get("/live")

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert "service" in data


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert data["service"] == "ai-service"


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["status"] == "running"
    assert "service" in data
    assert "version" in data


def test_ready_endpoint_reports_provider_config():
    response = client.get("/ready")

    assert response.status_code == 200
    data = response.json()

    settings = get_settings()
    assert data["service"] == "ai-service"
    assert data["provider"] == settings.llm_provider
    assert data["model"] == settings.selected_model
    assert data["providerApiKeyConfigured"] is settings.selected_provider_has_key
    assert data["status"] in {"ready", "not_ready"}
    assert data["success"] is data["providerApiKeyConfigured"]


def test_ai_health_endpoint():
    response = client.get("/ai/health")

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert data["service"] == "ai-service"


def test_ai_provider_endpoint():
    response = client.get("/ai/provider")

    assert response.status_code == 200
    data = response.json()

    settings = get_settings()
    assert data["success"] is True
    assert data["provider"] == settings.llm_provider
    assert data["model"] == settings.selected_model
    assert "providerApiKeyConfigured" in data


def test_metrics_endpoint_when_enabled(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "enable_metrics", True)
    monkeypatch.setattr(settings, "metrics_token", "")

    response = client.get("/metrics")

    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    assert "resolveai_ai_http_requests_total" in response.text or response.text.startswith("#")


def test_metrics_requires_bearer_when_token_configured(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "enable_metrics", True)
    monkeypatch.setattr(settings, "metrics_token", "secret-metrics-token")

    unauthorized = client.get("/metrics")
    assert unauthorized.status_code == 401

    authorized = client.get(
        "/metrics",
        headers={"Authorization": "Bearer secret-metrics-token"},
    )
    assert authorized.status_code == 200


def test_metrics_disabled_returns_404(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "enable_metrics", False)

    response = client.get("/metrics")
    assert response.status_code == 404
