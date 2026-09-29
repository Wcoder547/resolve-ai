from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_embeddings_with_mocked_model(patch_embeddings):
    patch_embeddings(dimensions=384)

    response = client.post(
        "/ai/embeddings",
        json={
            "texts": ["hello world", "billing runbook"],
            "metadata": {"test": True},
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    payload = data["data"]
    assert payload["provider"] == "fastembed"
    assert payload["dimensions"] == 384
    assert len(payload["embeddings"]) == 2
    assert payload["embeddings"][0]["index"] == 0
    assert len(payload["embeddings"][0]["embedding"]) == 384
    assert payload["embeddings"][1]["index"] == 1
    assert payload["usage"]["promptTokens"] > 0
    assert payload["usage"]["completionTokens"] == 0


def test_embeddings_rejects_empty_texts():
    response = client.post(
        "/ai/embeddings",
        json={"texts": []},
    )

    assert response.status_code == 422


def test_embeddings_requires_texts_field():
    response = client.post(
        "/ai/embeddings",
        json={},
    )

    assert response.status_code == 422


def test_embeddings_dimension_mismatch_returns_500(monkeypatch, patch_embeddings):
    patch_embeddings(dimensions=8)

    from app.config.settings import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "embedding_dimensions", 384)

    response = client.post(
        "/ai/embeddings",
        json={"texts": ["mismatch"]},
    )

    assert response.status_code == 500
    assert "Embedding generation failed" in response.json()["message"]
