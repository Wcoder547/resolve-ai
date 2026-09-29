import pytest

from app.schemas.chat import RagSource
from app.services.rag_answer_quality import (
    build_citation_catalog,
    build_citation_catalog_text,
    build_citations,
    build_markdown_answer,
    extract_citation_labels,
    extract_json_object,
    normalize_confidence,
    normalize_steps,
    validate_and_format_rag_answer,
)


def _source(**overrides):
    base = {
        "source_id": "src_1",
        "source_name": "Billing Runbook",
        "document_id": "doc_1",
        "document_title": "Billing Runbook",
        "chunk_id": "chunk_1",
        "chunk_index": 0,
        "score": 0.88,
    }
    base.update(overrides)
    return RagSource(**base)


def test_build_citation_catalog_and_text():
    catalog = build_citation_catalog([_source(), _source(chunk_id="chunk_2", chunk_index=1)])

    assert catalog[0]["label"] == "S1"
    assert catalog[1]["label"] == "S2"

    text = build_citation_catalog_text(catalog)
    assert "[S1]" in text
    assert "[S2]" in text
    assert "Billing Runbook" in text


def test_extract_json_object_from_fenced_block():
    raw = """```json
{"directAnswer": "Hello [S1]", "confidence": "high"}
```"""
    parsed = extract_json_object(raw)
    assert parsed["directAnswer"] == "Hello [S1]"


def test_extract_json_object_from_surrounding_text():
    raw = 'Here you go:\n{"directAnswer": "ok", "confidence": "medium"}\nThanks'
    parsed = extract_json_object(raw)
    assert parsed["confidence"] == "medium"


def test_extract_json_object_raises_without_object():
    with pytest.raises(ValueError, match="JSON object"):
        extract_json_object("not json at all")


def test_normalize_steps_and_confidence():
    assert normalize_steps([" a ", "", "b"]) == ["a", "b"]
    assert normalize_steps("single") == ["single"]
    assert normalize_steps(None) == []
    assert normalize_confidence("HIGH") == "high"
    assert normalize_confidence("nope") == "medium"


def test_extract_citation_labels_dedupes():
    assert extract_citation_labels("See [S1] and [S2] then [S1]") == ["[S1]", "[S2]"]


def test_build_markdown_answer_omits_steps_when_empty():
    markdown = build_markdown_answer(
        {
            "direct_answer": "SSO is supported for Enterprise [S1].",
            "recommended_steps": [],
            "citations": [
                {
                    "label": "S1",
                    "sourceName": "Product FAQ",
                    "documentTitle": "SSO",
                    "chunkIndex": 0,
                }
            ],
            "confidence": "high",
            "needs_escalation": False,
            "escalation_reason": None,
        }
    )

    assert "## Direct Answer" in markdown
    assert "SSO is supported" in markdown
    assert "## Recommended Steps" not in markdown
    assert "## Sources Used" in markdown
    assert "[S1]" in markdown
    assert "## Escalation" not in markdown


def test_build_markdown_answer_includes_escalation_and_steps():
    markdown = build_markdown_answer(
        {
            "direct_answer": "Escalate after retries [S1].",
            "recommended_steps": ["Retry webhook [S1]."],
            "citations": [],
            "confidence": "low",
            "needs_escalation": True,
            "escalation_reason": "Customer impact ongoing",
        }
    )

    assert "## Recommended Steps" in markdown
    assert "1. Retry webhook" in markdown
    assert "No valid source citation was available." in markdown
    assert "## Escalation" in markdown
    assert "Customer impact ongoing" in markdown


def test_validate_and_format_rejects_invalid_citations():
    catalog = build_citation_catalog([_source()])
    raw = """
    {
      "directAnswer": "Use secret internal API [S9].",
      "recommendedSteps": [],
      "sourcesUsed": [{"label": "S9", "reason": "invented"}],
      "confidence": "high",
      "needsEscalation": false,
      "escalationReason": null
    }
    """

    with pytest.raises(ValueError, match="invalid citations"):
        validate_and_format_rag_answer(raw, catalog)


def test_validate_and_format_requires_citations_when_configured(monkeypatch):
    from app.config.settings import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "rag_require_citations", True)

    catalog = build_citation_catalog([_source()])
    raw = """
    {
      "directAnswer": "Something vague without labels.",
      "recommendedSteps": ["Do a thing"],
      "sourcesUsed": [],
      "confidence": "high",
      "needsEscalation": false,
      "escalationReason": null
    }
    """

    with pytest.raises(ValueError, match="required citations"):
        validate_and_format_rag_answer(raw, catalog)


def test_validate_and_format_accepts_grounded_answer():
    catalog = build_citation_catalog([_source()])
    raw = """
    {
      "directAnswer": "Check webhook delivery [S1].",
      "recommendedSteps": ["Retry activation [S1]."],
      "sourcesUsed": [{"label": "S1", "reason": "runbook"}],
      "confidence": "high",
      "needsEscalation": false,
      "escalationReason": null
    }
    """

    result = validate_and_format_rag_answer(raw, catalog)

    assert result["guardrails"]["grounded"] is True
    assert result["guardrails"]["approved"] is True
    assert result["guardrails"]["hasCitations"] is True
    assert result["citations"][0]["label"] == "S1"
    assert result["citations"][0]["reason"] == "runbook"
    assert "## Recommended Steps" in result["answer"]


def test_validate_and_format_low_confidence_without_citations():
    catalog = build_citation_catalog([_source()])
    raw = """
    {
      "directAnswer": "Not enough information in context.",
      "recommendedSteps": [],
      "sourcesUsed": [],
      "confidence": "low",
      "needsEscalation": true,
      "escalationReason": "Missing runbook coverage"
    }
    """

    result = validate_and_format_rag_answer(raw, catalog)

    assert result["guardrails"]["approved"] is True
    assert result["guardrails"]["grounded"] is False
    assert result["needsEscalation"] is True


def test_build_citations_skips_unknown_labels():
    catalog = build_citation_catalog([_source()])
    citations = build_citations(
        used_labels=["[S1]", "[S9]"],
        citation_catalog=catalog,
        reason_map={"S1": "because"},
    )

    assert len(citations) == 1
    assert citations[0]["reason"] == "because"
