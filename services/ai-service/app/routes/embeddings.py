from fastapi import APIRouter, HTTPException

from app.schemas.embeddings import EmbeddingRequest, EmbeddingResponse
from app.services.embeddings import generate_text_embeddings

router = APIRouter()


@router.post("/embeddings", response_model=EmbeddingResponse)
def create_embeddings(payload: EmbeddingRequest):
    try:
        data = generate_text_embeddings(payload.texts)

        return {
            "success": True,
            "message": "Embeddings generated successfully.",
            "data": data,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding generation failed: {str(error)}",
        )