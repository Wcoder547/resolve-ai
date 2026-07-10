import json

from app.config.settings import get_settings
from app.agents.agent_utils import (
    build_source_catalog,
    build_source_catalog_text,
    compact_text,
    run_json_agent,
)
from app.schemas.agents import AgentResolveRequest


SYSTEM_PROMPT = """
You are the ResolveAI Resolution Agent.

Your job:
- Create the final support-ready resolution.
- Use only retrieved context for factual support/runbook claims.
- Tool results may be used as workflow assistance, but mock tool output must not be presented as real customer/system data.
- Every important factual claim from retrieved context must include citation labels like [S1].
- Use only citation labels from the source catalog.
- Include clear recommended steps.
- Include escalation if required.
- Return only valid JSON.

Required JSON shape:
{
  "directAnswer": "clear answer with citations like [S1]",
  "recommendedSteps": [
    "step with citation [S1]"
  ],
  "customerReply": "short customer-facing message",
  "internalNotes": "short internal support notes",
  "sourcesUsed": [
    {
      "label": "S1",
      "reason": "why this source supports the answer"
    }
  ],
  "toolsUsed": [
    {
      "toolName": "tool name",
      "reason": "how the tool result helped"
    }
  ],
  "confidence": "low | medium | high",
  "needsEscalation": false,
  "escalationReason": null
}
"""


def run_resolution_agent(
    payload: AgentResolveRequest,
    triage_output: dict,
    retrieval_output: dict,
    diagnostic_output: dict,
    tool_plan_output: dict | None = None,
    tool_results: list | None = None,
):
    settings = get_settings()

    source_catalog = build_source_catalog(payload.sources)
    source_catalog_text = build_source_catalog_text(source_catalog)
    standalone_question = payload.standalone_question or payload.question

    user_prompt = f"""
Latest user question:
{payload.question}

Standalone question:
{standalone_question}

Source catalog:
{source_catalog_text}

Triage output:
{json.dumps(triage_output, indent=2)}

Retrieval review output:
{json.dumps(retrieval_output, indent=2)}

Diagnostic output:
{json.dumps(diagnostic_output, indent=2)}

Tool plan output:
{json.dumps(tool_plan_output or {}, indent=2)}

Tool execution results:
{json.dumps(tool_results or [], indent=2)}

Retrieved context:
{compact_text(payload.context, 9000)}

Create the final resolution JSON.
"""

    return run_json_agent(
        {
            "agent_name": "resolution_agent",
            "system_prompt": SYSTEM_PROMPT,
            "user_prompt": user_prompt,
            "temperature": 0.1,
            "max_tokens": 1300,
            "prompt_version": settings.agentic_prompt_version,
        }
    )