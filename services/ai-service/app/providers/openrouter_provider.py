from app.providers.openai_compatible import OpenAICompatibleProvider


class OpenRouterProvider(OpenAICompatibleProvider):
    def __init__(self, api_key: str, model: str):
        super().__init__(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            model=model,
            provider_name="OpenRouter",
            extra_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-OpenRouter-Title": "ResolveAI",
            },
        )