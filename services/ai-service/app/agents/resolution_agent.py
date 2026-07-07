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
- Use only retrieved context for factual claims.
- Every important factual claim must include citation labels like [S1].
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
{triage_output}

Retrieval review output:
{retrieval_output}

Diagnostic output:
{diagnostic_output}

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
            "max_tokens": 1200,
            "prompt_version": settings.agentic_prompt_version,
        }
    )