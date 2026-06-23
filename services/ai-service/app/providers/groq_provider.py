from app.providers.openai_compatible import OpenAICompatibleProvider


class GroqProvider(OpenAICompatibleProvider):
    def __init__(self, api_key: str, model: str):
        super().__init__(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
            model=model,
            provider_name="Groq",
        )