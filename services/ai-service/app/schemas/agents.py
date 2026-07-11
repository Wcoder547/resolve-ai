from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.tools import AgentToolCall


class AgentChatHistoryMessage(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = Field(default=None, alias="createdAt")

    model_config = {
        "populate_by_name": True
    }


class AgentSource(BaseModel):
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


class AgentCitation(BaseModel):
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


class AgentStep(BaseModel):
    agent_name: str = Field(..., alias="agentName")
    status: str
    provider: Optional[str] = None
    model: Optional[str] = None
    latency_ms: int = Field(..., alias="latencyMs")
    input: Dict[str, Any]
    output: Dict[str, Any]
    error: Optional[str] = None

    model_config = {
        "populate_by_name": True
    }


class AgentResolveRequest(BaseModel):
    question: str
    standalone_question: Optional[str] = Field(default=None, alias="standaloneQuestion")
    context: str
    sources: List[AgentSource]
    conversation_history: List[AgentChatHistoryMessage] = Field(
        default_factory=list,
        alias="conversationHistory",
    )
    metadata: Optional[Dict[str, Any]] = None

    model_config = {
        "populate_by_name": True
    }


class AgentResolveData(BaseModel):
    answer: str
    agent_run_id: str = Field(..., alias="agentRunId")
    status: str
    agents_used: List[str] = Field(..., alias="agentsUsed")
    steps: List[AgentStep]
    tool_calls: List[AgentToolCall] = Field(default_factory=list, alias="toolCalls")

    sources: List[AgentSource]
    citations: List[AgentCitation]

    triage: Dict[str, Any]
    retrieval_review: Dict[str, Any] = Field(..., alias="retrievalReview")
    diagnostic: Dict[str, Any]
    resolution: Dict[str, Any]
    qa: Dict[str, Any]

    grounded: bool
    confidence: str
    needs_escalation: bool = Field(..., alias="needsEscalation")
    escalation_reason: Optional[str] = Field(default=None, alias="escalationReason")

    provider: str
    model: str
    prompt_version: str = Field(..., alias="promptVersion")
    fallback_used: bool = Field(default=False, alias="fallbackUsed")
    provider_errors: List[str] = Field(default_factory=list, alias="providerErrors")

    model_config = {
        "populate_by_name": True
    }


class AgentResolveResponse(BaseModel):
    success: bool
    message: str
    data: AgentResolveData

class AgentToolCall(BaseModel):
    tool_call_id: str = Field(..., alias="toolCallId")
    tool_name: str = Field(..., alias="toolName")
    tool_category: str = Field(..., alias="toolCategory")
    requires_approval: bool = Field(..., alias="requiresApproval")
    approval_status: str = Field(..., alias="approvalStatus")
    status: str
    reason: Optional[str] = None
    latency_ms: int = Field(..., alias="latencyMs")
    input: Dict[str, Any]
    output: Dict[str, Any]
    error: Optional[str] = None

    model_config = {
        "populate_by_name": True
    }