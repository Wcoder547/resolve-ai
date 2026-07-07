from app.config.settings import get_settings
from app.agents.agent_utils import compact_text, run_json_agent
from app.schemas.agents import AgentResolveRequest


SYSTEM_PROMPT = """
You are the ResolveAI Diagnostic Agent.

Your job:
- Analyze the user's issue using triage output and retrieved context.
- Identify likely cause.
- Identify missing information.
- Decide whether escalation may be needed.
- Do not create the final support response.
- Use citations when referring to retrieved context.
- Return only valid JSON.

Required JSON shape:
{
  "likelyCause": "likely cause with citation if supported",
  "confidence": "low | medium | high",
  "missingInformation": [],
  "escalationSignals": [],
  "diagnosticReasoning": "brief reasoning"
}
"""


def run_diagnostic_agent(
    payload: AgentResolveRequest,
    triage_output: dict,
    retrieval_output: dict,
):
    settings = get_settings()

    standalone_question = payload.standalone_question or payload.question

    user_prompt = f"""
Latest user question:
{payload.question}

Standalone question:
{standalone_question}

Triage output:
{triage_output}

Retrieval review output:
{retrieval_output}

Retrieved context:
{compact_text(payload.context, 9000)}

Diagnose the likely cause.
"""

    return run_json_agent(
        {
            "agent_name": "diagnostic_agent",
            "system_prompt": SYSTEM_PROMPT,
            "user_prompt": user_prompt,
            "temperature": 0.1,
            "max_tokens": 800,
            "prompt_version": settings.agentic_prompt_version,
        }
    )