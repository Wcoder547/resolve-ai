from app.config.settings import get_settings
from app.providers.base import BaseLLMProvider
from app.providers.gemini_provider import GeminiProvider
from app.providers.groq_provider import GroqProvider
from app.providers.openrouter_provider import OpenRouterProvider


def get_provider_model_name(provider_name: str) -> str:
    settings = get_settings()

    if provider_name == "openrouter":
        return settings.openrouter_model

    if provider_name == "groq":
        return settings.groq_model

    if provider_name == "gemini":
        return settings.gemini_model

    return "unknown"


def create_provider(provider_name: str) -> BaseLLMProvider:
    settings = get_settings()

    if provider_name == "openrouter":
        return OpenRouterProvider(
            api_key=settings.openrouter_api_key,
            model=settings.openrouter_model,
        )

    if provider_name == "groq":
        return GroqProvider(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
        )

    if provider_name == "gemini":
        return GeminiProvider(
            api_key=settings.google_api_key,
            model=settings.gemini_model,
        )

    raise RuntimeError(f"Unsupported LLM provider: {provider_name}")


def provider_has_key(provider_name: str) -> bool:
    settings = get_settings()

    if provider_name == "openrouter":
        return bool(settings.openrouter_api_key)

    if provider_name == "groq":
        return bool(settings.groq_api_key)

    if provider_name == "gemini":
        return bool(settings.google_api_key)

    return False


def get_llm_provider() -> BaseLLMProvider:
    settings = get_settings()
    return create_provider(settings.llm_provider)


def get_llm_provider_chain():
    settings = get_settings()

    priority = [settings.llm_provider, "openrouter", "groq", "gemini"]

    unique_priority = []
    for provider_name in priority:
        if provider_name not in unique_priority:
            unique_priority.append(provider_name)

    chain = []

    for provider_name in unique_priority:
        if provider_has_key(provider_name):
            chain.append(
                {
                    "name": provider_name,
                    "model": get_provider_model_name(provider_name),
                    "provider": create_provider(provider_name),
                    "is_primary": provider_name == settings.llm_provider,
                }
            )

    return chain


def get_current_model_name() -> str:
    settings = get_settings()
    return settings.selected_model


def get_current_provider_name() -> str:
    settings = get_settings()
    return settings.llm_provider