import os
from dotenv import load_dotenv

from app.providers.base import BaseLLMProvider
from app.providers.gemini_provider import GeminiProvider
from app.providers.groq_provider import GroqProvider
from app.providers.openrouter_provider import OpenRouterProvider

load_dotenv()


def get_llm_provider() -> BaseLLMProvider:
    provider = os.getenv("LLM_PROVIDER", "openrouter").lower().strip()

    if provider == "openrouter":
        return OpenRouterProvider(
            api_key=os.getenv("OPENROUTER_API_KEY", ""),
            model=os.getenv(
                "OPENROUTER_MODEL",
                "mistralai/mistral-7b-instruct:free",
            ),
        )

    if provider == "groq":
        return GroqProvider(
            api_key=os.getenv("GROQ_API_KEY", ""),
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        )

    if provider == "gemini":
        return GeminiProvider(
            api_key=os.getenv("GOOGLE_API_KEY", ""),
            model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
        )

    raise RuntimeError(
        f"Unsupported LLM_PROVIDER: {provider}. Use openrouter, groq, or gemini."
    )


def get_current_model_name() -> str:
    provider = os.getenv("LLM_PROVIDER", "openrouter").lower().strip()

    if provider == "openrouter":
        return os.getenv("OPENROUTER_MODEL", "mistralai/mistral-7b-instruct:free")

    if provider == "groq":
        return os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    if provider == "gemini":
        return os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")

    return "unknown"


def get_current_provider_name() -> str:
    return os.getenv("LLM_PROVIDER", "openrouter").lower().strip()