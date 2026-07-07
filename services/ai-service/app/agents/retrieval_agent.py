from app.config.settings import get_settings
from app.agents.agent_utils import (
    build_source_catalog,
    build_source_catalog_text,
    compact_text,
    run_json_agent,
)
from app.schemas.agents import AgentResolveRequest


SYSTEM_PROMPT = """
You are the ResolveAI Retrieval Review Agent.

Your job:
- Review the retrieved RAG context.
- Decide whether the context is enough to answer the user.
- Select the most relevant citation labels.
- Identify missing information.
- Do not invent facts.
- Return only valid JSON.

Required JSON shape:
{
  "contextAdequate": true,
  "relevantSourceLabels": ["S1", "S2"],
  "retrievalSummary": "brief summary of what the context says",
  "missingInformation": [],
  "reasoning": "brief reason"
}
"""


def run_retrieval_agent(payload: AgentResolveRequest):
    settings = get_settings()

    source_catalog = build_source_catalog(payload.sources)
    source_catalog_text = build_source_catalog_text(source_catalog)
    standalone_question = payload.standalone_question or payload.question

    user_prompt = f"""
Latest user question:
{payload.question}

Standalone retrieval question:
{standalone_question}

Source catalog:
{source_catalog_text}

Retrieved context:
{compact_text(payload.context, 9000)}

Review whether this context is enough to answer the user.
"""

    return run_json_agent(
        {
            "agent_name": "retrieval_agent",
            "system_prompt": SYSTEM_PROMPT,
            "user_prompt": user_prompt,
            "temperature": 0.0,
            "max_tokens": 700,
            "prompt_version": settings.agentic_prompt_version,
        }
    )