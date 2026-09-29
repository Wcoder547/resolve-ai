from abc import ABC, abstractmethod
from typing import Iterator, Optional


class ModelNotFoundError(RuntimeError):
    """Raised when the provider rejects the configured model id (HTTP 404)."""


class BaseLLMProvider(ABC):
    @abstractmethod
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> str:
        pass

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
        if result:
            yield result