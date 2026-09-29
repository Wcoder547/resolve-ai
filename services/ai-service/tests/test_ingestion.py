from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ingest_text_document(tmp_path: Path):
    test_file = tmp_path / "billing-runbook.md"

    test_file.write_text(
        """
# Billing Runbook

If payment is successful but subscription is not activated:

1. Check Stripe payment status.
2. Verify webhook event delivery.
3. Check subscription update worker.
4. Re-run subscription sync job.
5. Escalate to engineering if webhook retries fail.
""",
        encoding="utf-8",
    )

    response = client.post(
        "/ai/ingest",
        json={
            "sourceId": "source-test-id",
            "documentId": "document-test-id",
            "organizationId": "organization-test-id",
            "filePath": str(test_file),
            "mimeType": "text/markdown",
            "metadata": {
                "test": True
            },
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["message"] == "Document ingested successfully."
    assert data["data"]["sourceId"] == "source-test-id"
    assert data["data"]["documentId"] == "document-test-id"
    assert data["data"]["organizationId"] == "organization-test-id"
    assert data["data"]["textLength"] > 0
    assert data["data"]["chunksCount"] > 0
    assert len(data["data"]["chunks"]) > 0


def test_ingest_requires_file_path_or_url():
    response = client.post(
        "/ai/ingest",
        json={
            "sourceId": "source-test-id",
            "documentId": "document-test-id",
            "organizationId": "organization-test-id",
            "mimeType": "text/markdown",
            "metadata": {},
        },
    )

    assert response.status_code == 422


def test_ingest_empty_document_returns_400(tmp_path: Path):
    empty_file = tmp_path / "empty.txt"
    empty_file.write_text("   \n\t\n", encoding="utf-8")

    response = client.post(
        "/ai/ingest",
        json={
            "sourceId": "source-empty",
            "documentId": "document-empty",
            "organizationId": "organization-empty",
            "filePath": str(empty_file),
            "mimeType": "text/plain",
        },
    )

    assert response.status_code == 400
    assert "No readable text" in response.json()["message"]


def test_ingest_unsupported_type_returns_500(tmp_path: Path):
    binary = tmp_path / "notes.csv"
    binary.write_text("a,b\n1,2\n", encoding="utf-8")

    response = client.post(
        "/ai/ingest",
        json={
            "sourceId": "source-csv",
            "documentId": "document-csv",
            "organizationId": "organization-csv",
            "filePath": str(binary),
            "mimeType": "text/csv",
        },
    )

    assert response.status_code == 500
    assert "Unsupported document type" in response.json()["message"]


def test_ingest_missing_file_returns_500():
    response = client.post(
        "/ai/ingest",
        json={
            "sourceId": "source-missing",
            "documentId": "document-missing",
            "organizationId": "organization-missing",
            "filePath": "/tmp/resolveai-does-not-exist-12345.md",
            "mimeType": "text/markdown",
        },
    )

    assert response.status_code == 500


def test_ingest_from_url_with_mocked_download(tmp_path: Path, monkeypatch):
    downloaded = tmp_path / "from-url.md"
    downloaded.write_text(
        "# From URL\n\nWebhook retries should be verified before escalation.\n",
        encoding="utf-8",
    )

    monkeypatch.setattr(
        "app.routes.ingestion.download_file_to_temp",
        lambda file_url, mime_type=None: str(downloaded),
    )

    response = client.post(
        "/ai/ingest",
        json={
            "sourceId": "source-url",
            "documentId": "document-url",
            "organizationId": "organization-url",
            "fileUrl": "https://example.com/docs/runbook.md",
            "mimeType": "text/markdown",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["chunksCount"] > 0
    assert data["textLength"] > 0


def test_ingest_url_download_failure(monkeypatch):
    def fail_download(file_url, mime_type=None):
        raise RuntimeError("network unreachable")

    monkeypatch.setattr(
        "app.routes.ingestion.download_file_to_temp",
        fail_download,
    )

    response = client.post(
        "/ai/ingest",
        json={
            "sourceId": "source-url-fail",
            "documentId": "document-url-fail",
            "organizationId": "organization-url-fail",
            "fileUrl": "https://example.com/missing.md",
            "mimeType": "text/markdown",
        },
    )

    assert response.status_code == 500
    assert "network unreachable" in response.json()["message"]
