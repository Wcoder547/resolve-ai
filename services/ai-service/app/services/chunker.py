from typing import Any, Dict, List

from langchain_text_splitters import RecursiveCharacterTextSplitter


def estimate_token_count(text: str) -> int:
    """
    Simple token estimation.
    Roughly 1 token = 4 characters for English text.
    This is enough for metadata and chunk tracking.
    """
    return max(1, len(text) // 4)


def chunk_text(
    text: str,
    metadata: Dict[str, Any] | None = None,
    chunk_size: int = 512,
    chunk_overlap: int = 80,
) -> List[Dict[str, Any]]:
    """
    Split extracted document text into RAG-ready chunks.

    Returns chunks in the format expected by Node API:
    {
      chunkIndex: number,
      chunkText: string,
      tokenCount: number,
      metadata: object
    }
    """

    cleaned_text = text.strip()

    if not cleaned_text:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",
            "\n",
            ". ",
            "? ",
            "! ",
            " ",
            "",
        ],
    )

    split_texts = splitter.split_text(cleaned_text)

    chunks = []

    for index, chunk in enumerate(split_texts):
        chunk_content = chunk.strip()

        if not chunk_content:
            continue

        chunks.append(
            {
                "chunkIndex": index,
                "chunkText": chunk_content,
                "tokenCount": estimate_token_count(chunk_content),
                "metadata": {
                    **(metadata or {}),
                    "chunkSize": chunk_size,
                    "chunkOverlap": chunk_overlap,
                },
            }
        )

    return chunks