from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ExecuteApprovedToolRequest(BaseModel):
    tool_call_id: Optional[str] = Field(default=None, alias="toolCallId")
    tool_name: str = Field(..., alias="toolName")
    reason: Optional[str] = None
    input: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

    model_config = {
        "populate_by_name": True
    }


class ExecuteApprovedToolData(BaseModel):
    tool_call_id: Optional[str] = Field(default=None, alias="toolCallId")
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


class ExecuteApprovedToolResponse(BaseModel):
    success: bool
    message: str
    data: ExecuteApprovedToolData