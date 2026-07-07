import re

from app.config.settings import get_settings
from app.agents.agent_utils import (
    build_source_catalog,
    build_source_catalog_text,
    compact_text,
    run_json_agent,
)
from app.schemas.agents import AgentResolveRequest


SYSTEM_PROMPT = """
You are the ResolveAI QA and Guardrail Agent.

Your job:
- Check if the resolution is grounded in retrieved context.
- Check if citations are present and valid.
- Check if the response is safe and support-ready.
- Do not rewrite the full answer unless it is unsafe.
- Return only valid JSON.

Required JSON shape:
{
  "approved": true,
  "grounded": true,
  "hasCitations": true,
  "citationCount": 1,
  "riskLevel": "low | medium | high",
  "unsupportedReason": null,
  "recommendedFix": null
}
"""


def extract_citation_labels_from_resolution(resolution_output: dict):
    text = " ".join(
        [
            str(resolution_output.get("directAnswer", "")),
            " ".join(resolution_output.get("recommendedSteps", []))
            if isinstance(resolution_output.get("recommendedSteps", []), list)
            else "",
            str(resolution_output.get("customerReply", "")),
            str(resolution_output.get("internalNotes", "")),
        ]
    )

    return sorted(set(re.findall(r"\[S\d+\]", text)))


def deterministic_qa_check(payload: AgentResolveRequest, resolution_output: dict):
    source_catalog = build_source_catalog(payload.sources)
    valid_labels = {f"[{item['label']}]" for item in source_catalog}

    used_labels = extract_citation_labels_from_resolution(resolution_output)
    invalid_labels = [label for label in used_labels if label not in valid_labels]

    has_citations = len(used_labels) > 0
    approved = has_citations and not invalid_labels

    return {
        "approved": approved,
        "grounded": approved,
        "hasCitations": has_citations,
        "citationCount": len(used_labels),
        "riskLevel": "low" if approved else "medium",
        "unsupportedReason": None
        if approved
        else "Resolution is missing citations or contains invalid citations.",
        "recommendedFix": None
        if approved
        else "Regenerate the resolution with valid citation labels from the source catalog.",
    }


def run_qa_agent(payload: AgentResolveRequest, resolution_output: dict):
    settings = get_settings()

    deterministic = deterministic_qa_check(payload, resolution_output)

    source_catalog = build_source_catalog(payload.sources)
    source_catalog_text = build_source_catalog_text(source_catalog)

    user_prompt = f"""
Source catalog:
{source_catalog_text}

Retrieved context:
{compact_text(payload.context, 9000)}

Resolution output:
{resolution_output}

Deterministic citation check:
{deterministic}

Review the resolution quality.
"""

    llm_result = run_json_agent(
        {
            "agent_name": "qa_agent",
            "system_prompt": SYSTEM_PROMPT,
            "user_prompt": user_prompt,
            "temperature": 0.0,
            "max_tokens": 700,
            "prompt_version": settings.agentic_prompt_version,
        }
    )

    llm_output = llm_result["output"]

    final_output = {
        "approved": bool(deterministic["approved"]) and bool(llm_output.get("approved", False)),
        "grounded": bool(deterministic["grounded"]) and bool(llm_output.get("grounded", False)),
        "hasCitations": bool(deterministic["hasCitations"]) and bool(llm_output.get("hasCitations", False)),
        "citationCount": deterministic["citationCount"],
        "riskLevel": llm_output.get("riskLevel", deterministic["riskLevel"]),
        "unsupportedReason": llm_output.get("unsupportedReason")
        or deterministic["unsupportedReason"],
        "recommendedFix": llm_output.get("recommendedFix")
        or deterministic["recommendedFix"],
    }

    llm_result["output"] = final_output
    llm_result["step"]["output"] = final_output

    return llm_result