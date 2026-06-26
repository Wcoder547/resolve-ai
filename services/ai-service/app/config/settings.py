from functools import lru_cache
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "test", "production"] = "development"
    service_name: str = "ResolveAI AI Service"
    api_version: str = "1.0.0"

    cors_origin: str = "http://localhost:3000"

    llm_provider: Literal["openrouter", "groq", "gemini"] = "openrouter"

    openrouter_api_key: str = ""
    openrouter_model: str = "openrouter/free"

    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    google_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"

    enable_metrics: bool = True
    metrics_token: str = ""

    request_timeout_seconds: int = Field(default=60, ge=5, le=300)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def allowed_origins(self) -> list[str]:
        if self.cors_origin.strip() == "*":
            return ["*"]

        return [
            origin.strip()
            for origin in self.cors_origin.split(",")
            if origin.strip()
        ]

    @property
    def selected_model(self) -> str:
        if self.llm_provider == "openrouter":
            return self.openrouter_model

        if self.llm_provider == "groq":
            return self.groq_model

        if self.llm_provider == "gemini":
            return self.gemini_model

        return "unknown"

    @property
    def selected_provider_has_key(self) -> bool:
        if self.llm_provider == "openrouter":
            return bool(self.openrouter_api_key)

        if self.llm_provider == "groq":
            return bool(self.groq_api_key)

        if self.llm_provider == "gemini":
            return bool(self.google_api_key)

        return False


@lru_cache
def get_settings() -> Settings:
    return Settings()