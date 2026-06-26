import os
from fastapi import APIRouter, HTTPException

from app.schemas.ingestion import IngestRequest, IngestResponse
from app.services.chunker import chunk_text
from app.services.document_loader import (
    download_file_to_temp,
    load_document_text,
)

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
def ingest_document(payload: IngestRequest):
    temporary_download_path = None

    try:
        if payload.file_url:
            temporary_download_path = download_file_to_temp(
                payload.file_url,
                payload.mime_type,
            )
            file_path = temporary_download_path
        else:
            file_path = payload.file_path

        if not file_path:
            raise HTTPException(
                status_code=400,
                detail="Either filePath or fileUrl is required.",
            )

        text = load_document_text(file_path, payload.mime_type)
        cleaned_text = text.strip()

        if not cleaned_text:
            raise HTTPException(
                status_code=400,
                detail="No readable text found in document.",
            )

        chunks = chunk_text(
            text=cleaned_text,
            metadata={
                **payload.metadata,
                "sourceId": payload.source_id,
                "documentId": payload.document_id,
                "organizationId": payload.organization_id,
            },
        )

        return {
            "success": True,
            "message": "Document ingested successfully.",
            "data": {
                "sourceId": payload.source_id,
                "documentId": payload.document_id,
                "organizationId": payload.organization_id,
                "textLength": len(cleaned_text),
                "chunksCount": len(chunks),
                "chunks": chunks,
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Document ingestion failed: {str(error)}",
        )

    finally:
        if temporary_download_path:
            try:
                os.unlink(temporary_download_path)
            except FileNotFoundError:
                pass