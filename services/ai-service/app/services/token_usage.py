import math
from typing import List


def estimate_tokens_from_text(text: str) -> int:
    if not text:
        return 0

    return max(1, math.ceil(len(text) / 4))


def estimate_tokens_from_texts(texts: List[str]) -> int:
    return sum(estimate_tokens_from_text(text) for text in texts)


def build_usage(prompt_text: str = "", completion_text: str = ""):
    prompt_tokens = estimate_tokens_from_text(prompt_text)
    completion_tokens = estimate_tokens_from_text(completion_text)

    return {
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": prompt_tokens + completion_tokens,
        "isEstimated": True,
    }


def build_embedding_usage(texts: List[str]):
    prompt_tokens = estimate_tokens_from_texts(texts)

    return {
        "promptTokens": prompt_tokens,
        "completionTokens": 0,
        "totalTokens": prompt_tokens,
        "isEstimated": True,
    }