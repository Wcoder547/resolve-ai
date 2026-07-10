from fastapi import APIRouter, HTTPException

from app.agents.tools.executor import execute_approved_tool_call
from app.schemas.tools import ExecuteApprovedToolRequest, ExecuteApprovedToolResponse

router = APIRouter()


@router.post("/tools/execute-approved", response_model=ExecuteApprovedToolResponse)
def execute_approved_tool(payload: ExecuteApprovedToolRequest):
    try:
        data = execute_approved_tool_call(
            {
                "toolCallId": payload.tool_call_id,
                "toolName": payload.tool_name,
                "reason": payload.reason,
                "input": payload.input,
                "metadata": payload.metadata or {},
            }
        )

        return {
            "success": True,
            "message": "Approved tool executed successfully.",
            "data": data,
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Approved tool execution failed: {str(error)}",
        )