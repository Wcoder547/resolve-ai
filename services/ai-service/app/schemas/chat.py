from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field




class AiUsage(BaseModel):
    prompt_tokens: int = Field(default=0, alias="promptTokens")
    completion_tokens: int = Field(default=0, alias="completionTokens")
    total_tokens: int = Field(default=0, alias="totalTokens")
    is_estimated: bool = Field(default=True, alias="isEstimated")

    model_config = {
        "populate_by_name": True
    }



class ChatHistoryMessage(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = Field(default=None, alias="createdAt")

    model_config = {
        "populate_by_name": True
    }


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


class RagCitation(BaseModel):
    label: str
    source_id: str = Field(..., alias="sourceId")
    source_name: str = Field(..., alias="sourceName")
    document_id: str = Field(..., alias="documentId")
    document_title: str = Field(..., alias="documentTitle")
    chunk_id: str = Field(..., alias="chunkId")
    chunk_index: int = Field(..., alias="chunkIndex")
    score: float
    reason: Optional[str] = None

    model_config = {
        "populate_by_name": True
    }


class RagGuardrail(BaseModel):
    approved: bool
    grounded: bool
    has_citations: bool = Field(..., alias="hasCitations")
    citation_count: int = Field(..., alias="citationCount")
    risk_level: str = Field(..., alias="riskLevel")
    unsupported_reason: Optional[str] = Field(default=None, alias="unsupportedReason")

    model_config = {
        "populate_by_name": True
    }


class RagChatRequest(BaseModel):
    question: str
    standalone_question: Optional[str] = Field(default=None, alias="standaloneQuestion")
    context: str
    sources: List[RagSource]
    conversation_history: List[ChatHistoryMessage] = Field(
        default_factory=list,
        alias="conversationHistory",
    )
    metadata: Optional[Dict[str, Any]] = None

    model_config = {
        "populate_by_name": True
    }


class RagChatData(BaseModel):
    answer: str
    sources: List[RagSource]
    citations: List[RagCitation]
    model: str
    provider: str
    grounded: bool
    confidence: str
    needs_escalation: bool = Field(..., alias="needsEscalation")
    escalation_reason: Optional[str] = Field(default=None, alias="escalationReason")
    guardrails: RagGuardrail
    prompt_version: str = Field(..., alias="promptVersion")
    fallback_used: bool = Field(default=False, alias="fallbackUsed")
    provider_errors: List[str] = Field(default_factory=list, alias="providerErrors")
    usage: AiUsage

    model_config = {
        "populate_by_name": True
    }


class RagChatResponse(BaseModel):
    success: bool
    message: str
    data: RagChatData


class QuestionRewriteRequest(BaseModel):
    question: str
    conversation_history: List[ChatHistoryMessage] = Field(
        default_factory=list,
        alias="conversationHistory",
    )
    metadata: Optional[Dict[str, Any]] = None

    model_config = {
        "populate_by_name": True
    }


class QuestionRewriteData(BaseModel):
    standalone_question: str = Field(..., alias="standaloneQuestion")
    was_follow_up: bool = Field(..., alias="wasFollowUp")
    confidence: str
    provider: str
    model: str
    prompt_version: str = Field(..., alias="promptVersion")
    fallback_used: bool = Field(default=False, alias="fallbackUsed")
    provider_errors: List[str] = Field(default_factory=list, alias="providerErrors")
    usage: AiUsage

    model_config = {
        "populate_by_name": True
    }


class QuestionRewriteResponse(BaseModel):
    success: bool
    message: str
    data: QuestionRewriteData