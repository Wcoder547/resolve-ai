from typing import List

from app.config.settings import get_settings
from app.providers.llm_factory import get_llm_provider_chain
from app.schemas.chat import ChatHistoryMessage, QuestionRewriteRequest
from app.services.rag_answer_quality import extract_json_object
from app.services.token_usage import build_usage


SYSTEM_PROMPT = """
You are ResolveAI's conversation memory rewriter.

Your job:
- Rewrite the user's latest question into a standalone RAG search question.
- Use the conversation history only to resolve references like "it", "that issue", "the customer", "same problem", or "what should I tell them".
- Do not answer the question.
- Do not add facts that are not present in the latest question or conversation history.
- Keep the rewritten question clear, specific, and useful for knowledge base retrieval.
- Return only valid JSON.

Required JSON shape:
{
  "standaloneQuestion": "The rewritten standalone question.",
  "wasFollowUp": true,
  "confidence": "low | medium | high"
}
"""


def build_history_text(history: List[ChatHistoryMessage]) -> str:
    if not history:
        return "No previous conversation history."

    lines = []

    for message in history:
        role = message.role.upper()
        content = " ".join(message.content.split()).strip()

        if len(content) > 1200:
            content = content[:1200] + "..."

        lines.append(f"{role}: {content}")

    return "\n".join(lines)


def normalize_confidence(value: str) -> str:
    confidence = str(value or "medium").lower().strip()

    if confidence not in {"low", "medium", "high"}:
        return "medium"

    return confidence


def fallback_rewrite(payload: QuestionRewriteRequest, provider_errors=None):
    settings = get_settings()

    return {
        "standaloneQuestion": payload.question,
        "wasFollowUp": False,
        "confidence": "low",
        "provider": "fallback",
        "model": "none",
        "promptVersion": settings.question_rewrite_prompt_version,
        "fallbackUsed": True,
        "usage": build_usage(prompt_text=payload.question, completion_text=payload.question),
        "providerErrors": provider_errors or [],
    }


def rewrite_question_for_rag(payload: QuestionRewriteRequest):
    settings = get_settings()

    if not payload.conversation_history:
        return {
            "standaloneQuestion": payload.question,
            "wasFollowUp": False,
            "confidence": "high",
            "provider": "none",
            "model": "none",
            "promptVersion": settings.question_rewrite_prompt_version,
            "fallbackUsed": False,
            "providerErrors": [],
        }

    provider_chain = get_llm_provider_chain()

    if not provider_chain:
        return fallback_rewrite(
            payload,
            ["No configured LLM providers found for question rewrite."],
        )

    history_text = build_history_text(payload.conversation_history)

    user_prompt = f"""
Conversation history:
{history_text}

Latest user question:
{payload.question}

Return only valid JSON.
"""

    provider_errors = []

    for index, provider_config in enumerate(provider_chain):
        provider_name = provider_config["name"]
        model_name = provider_config["model"]
        provider = provider_config["provider"]

        try:
            raw_response = provider.generate(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.0,
                max_tokens=400,
            )

            parsed = extract_json_object(raw_response)

            standalone_question = str(parsed.get("standaloneQuestion", "")).strip()

            if not standalone_question:
                raise ValueError("standaloneQuestion is missing.")

            return {
            "standaloneQuestion": standalone_question,
            "wasFollowUp": bool(parsed.get("wasFollowUp", True)),
            "confidence": normalize_confidence(parsed.get("confidence", "medium")),
            "provider": provider_name,
            "model": model_name,
            "promptVersion": settings.question_rewrite_prompt_version,
            "usage": build_usage(
                prompt_text=SYSTEM_PROMPT + "\n\n" + user_prompt,
                completion_text=raw_response,
            ),
            "fallbackUsed": index > 0,
            "providerErrors": provider_errors,
            }

        except Exception as error:
            provider_errors.append(f"{provider_name}: {str(error)}")

    return fallback_rewrite(payload, provider_errors)