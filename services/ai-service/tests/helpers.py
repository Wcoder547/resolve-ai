import json
from typing import Callable, Iterator, List, Optional, Union

ResponseSpec = Union[str, Callable[[str, str], str]]


class FakeLLMProvider:
    """In-memory LLM stub — no network calls."""

    def __init__(self, response: ResponseSpec = "{}"):
        self._response = response
        self.calls: List[dict] = []

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> str:
        self.calls.append(
            {
                "system_prompt": system_prompt,
                "user_prompt": user_prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
        )
        if callable(self._response):
            return self._response(system_prompt, user_prompt)
        return self._response

    def generate_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> Iterator[str]:
        result = self.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        mid = max(1, len(result) // 2)
        yield result[:mid]
        if mid < len(result):
            yield result[mid:]


class _FakeEmbeddingVector:
    def __init__(self, values):
        self._values = values

    def tolist(self):
        return list(self._values)


class FakeEmbeddingModel:
    def __init__(self, dimensions: int = 384):
        self.dimensions = dimensions

    def embed(self, texts):
        for text in texts:
            seed = (sum(ord(ch) for ch in text) % 97) / 97.0
            values = [seed + (i * 0.001) for i in range(self.dimensions)]
            yield _FakeEmbeddingVector(values)


def make_provider_chain(
    provider: FakeLLMProvider,
    name: str = "openrouter",
    model: str = "mock-model",
):
    return [
        {
            "name": name,
            "model": model,
            "provider": provider,
            "is_primary": True,
        }
    ]


SAMPLE_SOURCE = {
    "sourceId": "src_1",
    "sourceName": "Billing Runbook",
    "documentId": "doc_1",
    "documentTitle": "Billing Runbook",
    "chunkId": "chunk_1",
    "chunkIndex": 0,
    "score": 0.91,
}


GROUNDED_RAG_JSON = json.dumps(
    {
        "directAnswer": "If payment succeeds but subscription is not activated, check webhook delivery [S1].",
        "recommendedSteps": [
            "Verify Stripe payment status [S1].",
            "Re-run the subscription sync job [S1].",
        ],
        "sourcesUsed": [
            {"label": "S1", "reason": "Runbook covers activation after successful payment."}
        ],
        "confidence": "high",
        "needsEscalation": False,
        "escalationReason": None,
    }
)

LOW_CONTEXT_RAG_JSON = json.dumps(
    {
        "directAnswer": "I could not find enough information in the retrieved context to answer safely.",
        "recommendedSteps": [],
        "sourcesUsed": [],
        "confidence": "low",
        "needsEscalation": True,
        "escalationReason": "Retrieved context is empty or insufficient.",
    }
)


def agent_resolve_llm_response(system_prompt: str, user_prompt: str) -> str:
    """Return agent-specific JSON based on the system prompt identity."""
    if "Triage Agent" in system_prompt:
        return json.dumps(
            {
                "category": "billing",
                "priority": "high",
                "issueType": "subscription_not_activated",
                "customerImpact": "Paid customer without access",
                "needsToolAction": False,
                "needsHumanEscalation": False,
                "reasoning": "Payment succeeded but subscription inactive.",
            }
        )

    if "Retrieval Review Agent" in system_prompt:
        return json.dumps(
            {
                "contextAdequate": True,
                "relevantSourceLabels": ["S1"],
                "retrievalSummary": "Runbook explains webhook and activation retry steps.",
                "missingInformation": [],
                "reasoning": "Context covers the reported billing issue.",
            }
        )

    if "Diagnostic Agent" in system_prompt:
        return json.dumps(
            {
                "likelyCause": "Webhook delivery or activation worker failure [S1]",
                "confidence": "high",
                "missingInformation": [],
                "escalationSignals": [],
                "diagnosticReasoning": "Matches billing runbook symptoms.",
            }
        )

    if "Tool Planning Agent" in system_prompt:
        return json.dumps(
            {
                "toolCalls": [
                    {
                        "toolName": "create_escalation_summary",
                        "arguments": {
                            "issue": "Subscription not activated after payment",
                            "likelyCause": "Webhook delivery or activation retry needed",
                            "missingInformation": [],
                        },
                        "reason": "Summarize for support handoff",
                    }
                ],
                "reasoning": "Safe draft tool is enough.",
            }
        )

    if "Resolution Agent" in system_prompt:
        return json.dumps(
            {
                "directAnswer": "Check webhook delivery and retry activation [S1].",
                "recommendedSteps": [
                    "Verify payment status in Stripe [S1].",
                    "Confirm webhook delivery and re-run sync [S1].",
                ],
                "customerReply": "We are checking activation after your successful payment.",
                "internalNotes": "Follow billing runbook webhook steps.",
                "sourcesUsed": [
                    {"label": "S1", "reason": "Billing runbook activation path"}
                ],
                "toolsUsed": [
                    {
                        "toolName": "create_escalation_summary",
                        "reason": "Prepared internal summary",
                    }
                ],
                "confidence": "high",
                "needsEscalation": False,
                "escalationReason": None,
            }
        )

    if "QA and Guardrail Agent" in system_prompt:
        return json.dumps(
            {
                "approved": True,
                "grounded": True,
                "hasCitations": True,
                "citationCount": 1,
                "riskLevel": "low",
                "unsupportedReason": None,
                "recommendedFix": None,
            }
        )

    return "{}"
