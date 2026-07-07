from fastapi import APIRouter, HTTPException

from app.schemas.agents import AgentResolveRequest, AgentResolveResponse
from app.agents.supervisor import resolve_with_agents

router = APIRouter()


@router.post("/agents/resolve", response_model=AgentResolveResponse)
def resolve_agentic_case(payload: AgentResolveRequest):
    try:
        data = resolve_with_agents(payload)

        return {
            "success": True,
            "message": "Agentic resolution generated successfully.",
            "data": data,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Agentic resolution failed: {str(error)}",
        )