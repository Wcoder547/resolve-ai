from app.config.settings import get_settings
from app.agents.agent_utils import build_history_text, run_json_agent
from app.schemas.agents import AgentResolveRequest


SYSTEM_PROMPT = """
You are the ResolveAI Triage Agent.

Your job:
- Classify the user's support or incident request.
- Identify category, priority, issue type, customer impact, and escalation need.
- Do not solve the issue.
- Return only valid JSON.

Required JSON shape:
{
  "category": "billing | authentication | technical | product | unknown",
  "priority": "low | medium | high | urgent",
  "issueType": "short_snake_case_issue_type",
  "customerImpact": "short description",
  "needsToolAction": false,
  "needsHumanEscalation": false,
  "reasoning": "brief reason"
}
"""


def run_triage_agent(payload: AgentResolveRequest):
    settings = get_settings()

    history_text = build_history_text(payload.conversation_history)
    standalone_question = payload.standalone_question or payload.question

    user_prompt = f"""
Conversation history:
{history_text}

Latest user question:
{payload.question}

Standalone question:
{standalone_question}

Classify this request.
"""

    return run_json_agent(
        {
            "agent_name": "triage_agent",
            "system_prompt": SYSTEM_PROMPT,
            "user_prompt": user_prompt,
            "temperature": 0.0,
            "max_tokens": 600,
            "prompt_version": settings.agentic_prompt_version,
        }
    )