from pathlib import Path

import pytest

from app.services.chunker import chunk_text, estimate_token_count
from app.services.document_loader import (
    get_extension,
    load_document_text,
)


def test_estimate_token_count():
    assert estimate_token_count("abcd") == 1
    assert estimate_token_count("a" * 40) == 10


def test_chunk_text_empty_returns_empty():
    assert chunk_text("   ") == []


def test_chunk_text_splits_and_attaches_metadata():
    text = ("Webhook delivery must be verified. " * 40).strip()
    chunks = chunk_text(
        text,
        metadata={"sourceId": "src", "documentId": "doc"},
        chunk_size=120,
        chunk_overlap=20,
    )

    assert len(chunks) > 1
    assert chunks[0]["chunkIndex"] == 0
    assert chunks[0]["chunkText"]
    assert chunks[0]["tokenCount"] >= 1
    assert chunks[0]["metadata"]["sourceId"] == "src"
    assert chunks[0]["metadata"]["chunkSize"] == 120
    assert chunks[0]["metadata"]["chunkOverlap"] == 20


def test_get_extension_from_path_and_mime():
    assert get_extension("/tmp/file.PDF") == ".pdf"
    assert get_extension("/tmp/noext", "application/pdf") == ".pdf"
    assert get_extension(
        "/tmp/noext",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ) == ".docx"
    assert get_extension("/tmp/noext", "text/markdown") == ".txt"
    assert get_extension("/tmp/noext", "application/octet-stream") == ""


def test_load_document_text_markdown(tmp_path: Path):
    path = tmp_path / "notes.md"
    path.write_text("# Title\n\nBody content here.\n", encoding="utf-8")

    text = load_document_text(str(path), "text/markdown")
    assert "Title" in text
    assert "Body content" in text


def test_load_document_text_unsupported(tmp_path: Path):
    path = tmp_path / "data.json"
    path.write_text("{}", encoding="utf-8")

    with pytest.raises(ValueError, match="Unsupported document type"):
        load_document_text(str(path), "application/json")


def test_download_file_to_temp_writes_bytes(tmp_path: Path, monkeypatch):
    from app.services import document_loader

    class FakeResponse:
        def raise_for_status(self):
            return None

        def iter_bytes(self):
            yield b"hello from url"

    class FakeStream:
        def __enter__(self):
            return FakeResponse()

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(
        document_loader.httpx,
        "stream",
        lambda *args, **kwargs: FakeStream(),
    )

    path = document_loader.download_file_to_temp(
        "https://example.com/file.md",
        "text/markdown",
    )

    try:
        assert Path(path).exists()
        assert Path(path).read_text(encoding="utf-8") == "hello from url"
        assert path.endswith(".txt")
    finally:
        Path(path).unlink(missing_ok=True)
