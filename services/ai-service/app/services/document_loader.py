import os
import tempfile
from pathlib import Path
from typing import Optional

import httpx
from docx import Document as DocxDocument
from pypdf import PdfReader


def get_extension(file_path: str, mime_type: Optional[str] = None) -> str:
    extension = Path(file_path).suffix.lower()

    if extension:
        return extension

    if mime_type == "application/pdf":
        return ".pdf"

    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return ".docx"

    if mime_type in ["text/plain", "text/markdown"]:
        return ".txt"

    return ""


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    pages = []

    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)

    return "\n\n".join(pages)


def extract_text_from_docx(file_path: str) -> str:
    document = DocxDocument(file_path)

    paragraphs = [
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text and paragraph.text.strip()
    ]

    return "\n\n".join(paragraphs)


def extract_text_from_text_file(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
        return file.read()


def load_document_text(file_path: str, mime_type: Optional[str] = None) -> str:
    extension = get_extension(file_path, mime_type)

    if extension == ".pdf":
        return extract_text_from_pdf(file_path)

    if extension == ".docx":
        return extract_text_from_docx(file_path)

    if extension in [".txt", ".md", ".markdown"]:
        return extract_text_from_text_file(file_path)

    raise ValueError(
        "Unsupported document type. Allowed files: PDF, DOCX, TXT, MD, MARKDOWN."
    )


def download_file_to_temp(file_url: str, mime_type: Optional[str] = None) -> str:
    suffix = ".tmp"

    if mime_type == "application/pdf":
        suffix = ".pdf"

    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        suffix = ".docx"

    if mime_type in ["text/plain", "text/markdown"]:
        suffix = ".txt"

    temporary_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)

    try:
        with httpx.stream("GET", file_url, timeout=60) as response:
            response.raise_for_status()

            for chunk in response.iter_bytes():
                if chunk:
                    temporary_file.write(chunk)

        temporary_file.close()
        return temporary_file.name

    except Exception:
        temporary_file.close()
        os.unlink(temporary_file.name)
        raise