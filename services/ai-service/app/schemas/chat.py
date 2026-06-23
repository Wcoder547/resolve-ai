from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RagSource(BaseModel):
    source_id: str = Field(..., alias="sourceId")
    source_name: str = Field(..., alias="sourceName")
    document_id: str = Field(..., alias="documentId")
    document_title: str = Field(..., alias="documentTitle")
    chunk_id: str = Field(..., alias="chunkId")
    chunk_index: int = Field(..., alias="chunkIndex")
    score: float

    model_config = {
        "populate_by_name": True
    }


class RagChatRequest(BaseModel):
    question: str
    context: str
    sources: List[RagSource]
    metadata: Optional[Dict[str, Any]] = None

    model_config = {
        "populate_by_name": True
    }


class RagChatData(BaseModel):
    answer: str
    sources: List[RagSource]
    model: str
    provider: str
    grounded: bool


class RagChatResponse(BaseModel):
    success: bool
    message: str
    data: RagChatData