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