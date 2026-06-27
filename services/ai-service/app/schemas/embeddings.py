from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AiUsage(BaseModel):
    prompt_tokens: int = Field(default=0, alias="promptTokens")
    completion_tokens: int = Field(default=0, alias="completionTokens")
    total_tokens: int = Field(default=0, alias="totalTokens")
    is_estimated: bool = Field(default=True, alias="isEstimated")

    model_config = {
        "populate_by_name": True
    }


class EmbeddingRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=128)
    metadata: Optional[Dict[str, Any]] = None


class EmbeddingItem(BaseModel):
    index: int
    embedding: List[float]


class EmbeddingData(BaseModel):
    provider: str
    model: str
    dimensions: int
    embeddings: List[EmbeddingItem]
    usage: AiUsage


class EmbeddingResponse(BaseModel):
    success: bool
    message: str
    data: EmbeddingData