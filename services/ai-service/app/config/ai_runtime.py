import os
from dataclasses import dataclass


def parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default

    return value.strip().lower() in ["1", "true", "yes", "y", "on"]


def parse_int(value: str | None, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value or default)
    except ValueError:
        return default

    return max(minimum, min(parsed, maximum))


def parse_float(value: str | None, default: float, minimum: float, maximum: float) -> float:
    try:
        parsed = float(value or default)
    except ValueError:
        return default

    return max(minimum, min(parsed, maximum))


@dataclass(frozen=True)
class AIRuntimeConfig:
    agentic_rag_enabled: bool
    max_context_chars: int
    max_sources: int
    response_max_tokens: int
    temperature: float
    min_context_chars: int


def get_ai_runtime_config() -> AIRuntimeConfig:
    return AIRuntimeConfig(
        agentic_rag_enabled=parse_bool(
            os.getenv("AGENTIC_RAG_ENABLED"),
            default=True,
        ),
        max_context_chars=parse_int(
            os.getenv("AI_MAX_CONTEXT_CHARS"),
            default=14000,
            minimum=1000,
            maximum=50000,
        ),
        max_sources=parse_int(
            os.getenv("AI_MAX_SOURCES"),
            default=8,
            minimum=1,
            maximum=20,
        ),
        response_max_tokens=parse_int(
            os.getenv("AI_RESPONSE_MAX_TOKENS"),
            default=1200,
            minimum=200,
            maximum=4000,
        ),
        temperature=parse_float(
            os.getenv("AI_TEMPERATURE"),
            default=0.2,
            minimum=0.0,
            maximum=1.0,
        ),
        min_context_chars=parse_int(
            os.getenv("AI_MIN_CONTEXT_CHARS"),
            default=80,
            minimum=0,
            maximum=2000,
        ),
    )