from fastapi import APIRouter, HTTPException
from app.schemas.chat import RagChatRequest, RagChatResponse
from app.services.rag_chat import generate_rag_answer

router = APIRouter()


@router.post("/rag", response_model=RagChatResponse)
def rag_chat(payload: RagChatRequest):
    try:
        result = generate_rag_answer(payload)

        return {
            "success": True,
            "message": "RAG answer generated successfully.",
            "data": result
        }

    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error))

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"RAG chat generation failed: {str(error)}"
        )