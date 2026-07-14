import json
import re
from typing import Any, Dict, List

from app.config.settings import get_settings
from app.schemas.chat import RagSource


VALID_CONFIDENCE_VALUES = {"low", "medium", "high"}


def build_citation_catalog(sources: List[RagSource]) -> List[Dict[str, Any]]:
    catalog = []

    for index, source in enumerate(sources, start=1):
        catalog.append(
            {
                "label": f"S{index}",
                "sourceId": source.source_id,
                "sourceName": source.source_name,
                "documentId": source.document_id,
                "documentTitle": source.document_title,
                "chunkId": source.chunk_id,
                "chunkIndex": source.chunk_index,
                "score": source.score,
            }
        )

    return catalog


def build_citation_catalog_text(citation_catalog: List[Dict[str, Any]]) -> str:
    lines = []

    for citation in citation_catalog:
        lines.append(
            (
                f"[{citation['label']}] "
                f"{citation['sourceName']} / "
                f"{citation['documentTitle']} / "
                f"chunk {citation['chunkIndex']} / "
                f"score {float(citation['score']):.4f}"
            )
        )

    return "\n".join(lines)


def extract_json_object(raw_text: str) -> Dict[str, Any]:
    cleaned = raw_text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("Model did not return a JSON object.")

    return json.loads(cleaned[start : end + 1])


def normalize_steps(value: Any) -> List[str]:
    settings = get_settings()

    if isinstance(value, list):
        steps = [str(item).strip() for item in value if str(item).strip()]
        return steps[: settings.rag_max_answer_steps]

    if isinstance(value, str) and value.strip():
        return [value.strip()]

    return []


def normalize_confidence(value: Any) -> str:
    confidence = str(value or "medium").lower().strip()

    if confidence not in VALID_CONFIDENCE_VALUES:
        return "medium"

    return confidence


def extract_citation_labels(text: str) -> List[str]:
    return sorted(set(re.findall(r"\[S\d+\]", text)))


def map_citation_reasons(structured_response: Dict[str, Any]) -> Dict[str, str]:
    reasons: Dict[str, str] = {}

    sources_used = structured_response.get("sourcesUsed", [])

    if not isinstance(sources_used, list):
        return reasons

    for item in sources_used:
        if not isinstance(item, dict):
            continue

        label = str(item.get("label", "")).strip()
        reason = str(item.get("reason", "")).strip()

        if label and reason:
            reasons[label] = reason

    return reasons


def build_citations(
    used_labels: List[str],
    citation_catalog: List[Dict[str, Any]],
    reason_map: Dict[str, str],
) -> List[Dict[str, Any]]:
    catalog_by_label = {
        f"[{citation['label']}]": citation
        for citation in citation_catalog
    }

    citations = []

    for label in used_labels:
        source = catalog_by_label.get(label)

        if not source:
            continue

        citations.append(
            {
                **source,
                "reason": reason_map.get(source["label"]),
            }
        )

    return citations


def build_markdown_answer(input_data: Dict[str, Any]) -> str:
    direct_answer = input_data["direct_answer"]
    recommended_steps = input_data["recommended_steps"]
    citations = input_data["citations"]
    confidence = input_data["confidence"]
    needs_escalation = input_data["needs_escalation"]
    escalation_reason = input_data["escalation_reason"]

    lines = [
        "## Direct Answer",
        direct_answer,
        "",
        "## Recommended Steps",
    ]

    if recommended_steps:
        for index, step in enumerate(recommended_steps, start=1):
            lines.append(f"{index}. {step}")
    else:
        lines.append("No specific steps were available from the retrieved context.")

    lines.extend(
        [
            "",
            "## Sources Used",
        ]
    )

    if citations:
        for citation in citations:
            lines.append(
                (
                    f"- [{citation['label']}] {citation['sourceName']} — "
                    f"{citation['documentTitle']}, chunk {citation['chunkIndex']}"
                )
            )
    else:
        lines.append("- No valid source citation was available.")

    lines.extend(
        [
            "",
            "## Confidence",
            confidence.capitalize(),
        ]
    )

    if needs_escalation:
        lines.extend(
            [
                "",
                "## Escalation",
                escalation_reason or "Escalation may be required.",
            ]
        )

    return "\n".join(lines)


def validate_and_format_rag_answer(
    raw_model_response: str,
    citation_catalog: List[Dict[str, Any]],
) -> Dict[str, Any]:
    settings = get_settings()

    structured = extract_json_object(raw_model_response)

    direct_answer = str(structured.get("directAnswer", "")).strip()
    recommended_steps = normalize_steps(structured.get("recommendedSteps", []))
    confidence = normalize_confidence(structured.get("confidence", "medium"))

    needs_escalation = bool(structured.get("needsEscalation", False))
    escalation_reason = structured.get("escalationReason")

    if escalation_reason is not None:
        escalation_reason = str(escalation_reason).strip() or None

    if not direct_answer:
        raise ValueError("Model response is missing directAnswer.")

    answer_text_for_citations = " ".join([direct_answer, *recommended_steps])
    used_labels = extract_citation_labels(answer_text_for_citations)

    valid_labels = {f"[{item['label']}]" for item in citation_catalog}
    invalid_labels = [label for label in used_labels if label not in valid_labels]

    if invalid_labels:
        raise ValueError(f"Model used invalid citations: {', '.join(invalid_labels)}")

    # --- FIX: Determine if the model safely backed out due to missing context ---
    is_fallback_response = needs_escalation or confidence == "low"

    # Enforce citation presence only if it is NOT an expected fallback/out-of-context response
    if settings.rag_require_citations and not used_labels and not is_fallback_response:
        raise ValueError("Model response did not include required citations.")

    reason_map = map_citation_reasons(structured)

    citations = build_citations(
        used_labels=used_labels,
        citation_catalog=citation_catalog,
        reason_map=reason_map,
    )

    has_citations = len(citations) > 0
    
    # --- FIX: Route guardrail metrics accurately for out-of-context scenarios ---
    if is_fallback_response:
        approved = True
        grounded = False  # It accurately reported that it lacked source ground truth
    else:
        approved = has_citations if settings.rag_require_citations else True
        grounded = approved

    risk_level = "low" if approved else "medium"
    unsupported_reason = None if approved else "Answer did not pass citation guardrails."

    final_answer = build_markdown_answer(
        {
            "direct_answer": direct_answer,
            "recommended_steps": recommended_steps,
            "citations": citations,
            "confidence": confidence,
            "needs_escalation": needs_escalation,
            "escalation_reason": escalation_reason,
        }
    )

    return {
        "answer": final_answer,
        "citations": citations,
        "confidence": confidence,
        "needsEscalation": needs_escalation,
        "escalationReason": escalation_reason,
        "guardrails": {
            "approved": approved,
            "grounded": grounded,
            "hasCitations": has_citations,
            "citationCount": len(citations),
            "riskLevel": risk_level,
            "unsupportedReason": unsupported_reason,
        },
    }