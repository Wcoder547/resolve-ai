import json

from app.config.settings import get_settings
from app.agents.agent_utils import run_json_agent
from app.agents.tools.registry import list_available_tools
from app.schemas.agents import AgentResolveRequest


SYSTEM_PROMPT = """
You are the ResolveAI Tool Planning Agent.

Your job:
- Decide whether safe tools should be called.
- Only choose tools from the available tool list.
- Do not invent tool names.
- Do not call tools unnecessarily.
- Prefer draft/read-only tools.
- If required identifiers are missing, choose a tool only if it can safely report missing identifiers.
- Return only valid JSON.

Required JSON shape:
{
  "toolCalls": [
    {
      "toolName": "tool_name_from_available_tools",
      "arguments": {},
      "reason": "why this tool is useful"
    }
  ],
  "reasoning": "brief explanation"
}
"""


def run_tool_agent(
    payload: AgentResolveRequest,
    triage_output: dict,
    retrieval_output: dict,
    diagnostic_output: dict,
):
    settings = get_settings()

    if not settings.agent_tools_enabled:
        return {
            "output": {
                "toolCalls": [],
                "reasoning": "Agent tools are disabled.",
            },
            "step": {
                "agentName": "tool_agent",
                "status": "skipped",
                "provider": None,
                "model": None,
                "latencyMs": 0,
                "input": {
                    "promptVersion": settings.agentic_prompt_version,
                },
                "output": {
                    "toolCalls": [],
                    "reasoning": "Agent tools are disabled.",
                },
                "error": None,
            },
            "provider": "none",
            "model": "none",
            "fallbackUsed": False,
            "providerErrors": [],
        }

    available_tools = list_available_tools()

    standalone_question = payload.standalone_question or payload.question

    user_prompt = f"""
Latest user question:
{payload.question}

Standalone question:
{standalone_question}

Available tools:
{json.dumps(available_tools, indent=2)}

Triage output:
{json.dumps(triage_output, indent=2)}

Retrieval review output:
{json.dumps(retrieval_output, indent=2)}

Diagnostic output:
{json.dumps(diagnostic_output, indent=2)}

Plan safe tool calls.
"""

    return run_json_agent(
        {
            "agent_name": "tool_agent",
            "system_prompt": SYSTEM_PROMPT,
            "user_prompt": user_prompt,
            "temperature": 0.0,
            "max_tokens": 700,
            "prompt_version": settings.agentic_prompt_version,
        }
    )