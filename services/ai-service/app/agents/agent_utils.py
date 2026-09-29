from time import perf_counter
from typing import Any, Dict, List, Set, Tuple

from app.providers.base import ModelNotFoundError
from app.providers.llm_factory import get_llm_provider_chain
from app.services.rag_answer_quality import extract_json_object


class AgentRuntimeError(Exception):
    pass


# Process-local: once a (provider, model) 404s, skip it for later agents/requests
# until the service restarts (avoids 6× Groq 404 spam per chat turn).
_UNAVAILABLE_MODELS: Set[Tuple[str, str]] = set()


def compact_text(value: str, max_chars: int = 4000) -> str:
    text = " ".join((value or "").split()).strip()

    if len(text) > max_chars:
        return text[:max_chars] + "..."

    return text


def build_history_text(history: List[Any]) -> str:
    if not history:
        return "No previous conversation history."

    lines = []

    for message in history:
        role = str(message.role).upper()
        content = compact_text(message.content, 1200)
        lines.append(f"{role}: {content}")

    return "\n".join(lines)


def build_source_catalog(sources: List[Any]) -> List[Dict[str, Any]]:
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


def build_source_catalog_text(catalog: List[Dict[str, Any]]) -> str:
    if not catalog:
        return "No sources available."

    lines = []

    for item in catalog:
        lines.append(
            (
                f"[{item['label']}] "
                f"{item['sourceName']} / "
                f"{item['documentTitle']} / "
                f"chunk {item['chunkIndex']} / "
                f"score {float(item['score']):.4f}"
            )
        )

    return "\n".join(lines)


def run_json_agent(input_data: Dict[str, Any]) -> Dict[str, Any]:
    agent_name = input_data["agent_name"]
    system_prompt = input_data["system_prompt"]
    user_prompt = input_data["user_prompt"]
    max_tokens = input_data.get("max_tokens", 800)
    temperature = input_data.get("temperature", 0.1)

    provider_chain = get_llm_provider_chain()

    if not provider_chain:
        raise AgentRuntimeError("No configured LLM providers found.")

    provider_errors = []

    for index, provider_config in enumerate(provider_chain):
        provider_name = provider_config["name"]
        model_name = provider_config["model"]
        provider = provider_config["provider"]
        model_key = (provider_name, model_name)

        if model_key in _UNAVAILABLE_MODELS:
            provider_errors.append(
                f"{provider_name}: skipped unavailable model {model_name}"
            )
            continue

        started_at = perf_counter()

        try:
            raw_response = provider.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            parsed_output = extract_json_object(raw_response)
            latency_ms = int((perf_counter() - started_at) * 1000)

            step = {
                "agentName": agent_name,
                "status": "completed",
                "provider": provider_name,
                "model": model_name,
                "latencyMs": latency_ms,
                "input": {
                    "promptVersion": input_data.get("prompt_version"),
                    "temperature": temperature,
                    "maxTokens": max_tokens,
                },
                "output": parsed_output,
                "error": None,
            }

            return {
                "output": parsed_output,
                "step": step,
                "provider": provider_name,
                "model": model_name,
                "fallbackUsed": index > 0 or bool(provider_errors),
                "providerErrors": provider_errors,
            }

        except Exception as error:
            latency_ms = int((perf_counter() - started_at) * 1000)
            provider_errors.append(f"{provider_name}: {str(error)}")

            if isinstance(error, ModelNotFoundError):
                _UNAVAILABLE_MODELS.add(model_key)

            remaining = [
                p
                for i, p in enumerate(provider_chain)
                if i > index
                and (p["name"], p["model"]) not in _UNAVAILABLE_MODELS
            ]

            if not remaining:
                return {
                    "output": {},
                    "step": {
                        "agentName": agent_name,
                        "status": "failed",
                        "provider": provider_name,
                        "model": model_name,
                        "latencyMs": latency_ms,
                        "input": {
                            "promptVersion": input_data.get("prompt_version"),
                            "temperature": temperature,
                            "maxTokens": max_tokens,
                        },
                        "output": {},
                        "error": str(error),
                    },
                    "provider": provider_name,
                    "model": model_name,
                    "fallbackUsed": index > 0 or bool(provider_errors),
                    "providerErrors": provider_errors,
                }

    raise AgentRuntimeError("Agent execution failed.")
