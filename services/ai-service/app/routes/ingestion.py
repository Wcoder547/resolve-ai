from fastapi import APIRouter, HTTPException
from app.schemas.ingestion import IngestDocumentRequest, IngestDocumentResponse
from app.services.document_loader import load_text_from_file
from app.services.chunker import chunk_document_text

router = APIRouter()


@router.post("/ingest", response_model=IngestDocumentResponse)
def ingest_document(payload: IngestDocumentRequest):
    try:
        text = load_text_from_file(payload.file_path)

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="No extractable text found in the uploaded document.",
            )

        chunks = chunk_document_text(
            text=text,
            source_id=payload.source_id,
            document_id=payload.document_id,
            organization_id=payload.organization_id,
        )

        return {
            "success": True,
            "message": "Document ingested successfully.",
            "data": {
                "sourceId": payload.source_id,
                "documentId": payload.document_id,
                "organizationId": payload.organization_id,
                "textLength": len(text),
                "chunksCount": len(chunks),
                "chunks": chunks,
            },
        }

    except HTTPException:
        raise

    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Document ingestion failed: {str(error)}",
        )