import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.chat import (
    QuestionRewriteRequest,
    QuestionRewriteResponse,
    RagChatRequest,
    RagChatResponse,
)
from app.services.question_rewriter import rewrite_question_for_rag
from app.services.rag_chat import generate_rag_answer, stream_rag_answer

router = APIRouter()


@router.post("/chat/rewrite-question", response_model=QuestionRewriteResponse)
def rewrite_question(payload: QuestionRewriteRequest):
    try:
        data = rewrite_question_for_rag(payload)

        return {
            "success": True,
            "message": "Question rewritten successfully.",
            "data": data,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Question rewrite failed: {str(error)}",
        )


@router.post("/chat/rag", response_model=RagChatResponse)
def rag_chat(payload: RagChatRequest):
    try:
        data = generate_rag_answer(payload)

        return {
            "success": True,
            "message": "RAG answer generated successfully.",
            "data": data,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"RAG chat failed: {str(error)}",
        )


@router.post("/chat/rag/stream")
def rag_chat_stream(payload: RagChatRequest):
    def event_gen():
        for event in stream_rag_answer(payload):
            yield f"data: {json.dumps(event, default=str)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )