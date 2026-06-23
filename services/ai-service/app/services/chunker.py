from typing import Any, Dict, List
from langchain_text_splitters import RecursiveCharacterTextSplitter


def estimate_token_count(text: str) -> int:
    return max(1, len(text.split()))


def chunk_document_text(
    text: str,
    source_id: str,
    document_id: str,
    organization_id: str,
) -> List[Dict[str, Any]]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    raw_chunks = splitter.split_text(text)

    chunks = []

    for index, chunk_text in enumerate(raw_chunks):
        cleaned_text = chunk_text.strip()

        if not cleaned_text:
            continue

        chunks.append(
            {
                "chunkIndex": index,
                "chunkText": cleaned_text,
                "tokenCount": estimate_token_count(cleaned_text),
                "metadata": {
                    "sourceId": source_id,
                    "documentId": document_id,
                    "organizationId": organization_id,
                    "chunkSize": len(cleaned_text),
                },
            }
        )

    return chunks