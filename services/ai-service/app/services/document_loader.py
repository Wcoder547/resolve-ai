from pathlib import Path
from pypdf import PdfReader
from docx import Document


SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".markdown", ".docx"}


def load_text_from_file(file_path: str) -> str:
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    extension = path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            "Unsupported file type. Supported files: PDF, TXT, MD, MARKDOWN, DOCX."
        )

    if extension == ".pdf":
        return _load_pdf(path)

    if extension in {".txt", ".md", ".markdown"}:
        return _load_text_file(path)

    if extension == ".docx":
        return _load_docx(path)

    raise ValueError("Unsupported file type.")


def _load_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore").strip()


def _load_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    pages_text = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""

        if text.strip():
            pages_text.append(f"\n\n--- Page {page_number} ---\n{text}")

    return "\n".join(pages_text).strip()


def _load_docx(path: Path) -> str:
    document = Document(str(path))
    paragraphs = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()

        if text:
            paragraphs.append(text)

    return "\n".join(paragraphs).strip()