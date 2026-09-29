import json
from typing import Iterator, Optional

import httpx

from app.config.settings import get_settings
from app.providers.base import BaseLLMProvider, ModelNotFoundError


class OpenAICompatibleProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        provider_name: str,
        extra_headers: Optional[dict[str, str]] = None,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.provider_name = provider_name
        self.extra_headers = extra_headers or {}

    def _auth_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            **self.extra_headers,
        }

    def _completion_payload(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: Optional[int],
        stream: bool = False,
    ) -> dict:
        payload: dict = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
            "temperature": temperature,
            "stream": stream,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        return payload

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> str:
        if not self.api_key:
            raise RuntimeError(f"{self.provider_name} API key is missing.")

        settings = get_settings()

        try:
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers=self._auth_headers(),
                json=self._completion_payload(
                    system_prompt,
                    user_prompt,
                    temperature,
                    max_tokens,
                ),
                timeout=settings.request_timeout_seconds,
            )
        except httpx.TimeoutException:
            raise RuntimeError(
                f"{self.provider_name} request timed out."
            )
        except httpx.RequestError as error:
            raise RuntimeError(
                f"{self.provider_name} request failed: {str(error)}"
            )

        if response.status_code == 404:
            raise ModelNotFoundError(
                f"{self.provider_name} model not found (404): {self.model}. "
                f"{response.text[:300]}"
            )

        if response.status_code >= 400:
            raise RuntimeError(
                f"{self.provider_name} error {response.status_code}: {response.text}"
            )

        data = response.json()

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise RuntimeError(
                f"Invalid response from {self.provider_name}: {data}"
            )

    def generate_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> Iterator[str]:
        if not self.api_key:
            raise RuntimeError(f"{self.provider_name} API key is missing.")

        settings = get_settings()
        timeout = httpx.Timeout(
            connect=10.0,
            read=float(settings.request_timeout_seconds),
            write=10.0,
            pool=10.0,
        )

        try:
            with httpx.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self._auth_headers(),
                json=self._completion_payload(
                    system_prompt,
                    user_prompt,
                    temperature,
                    max_tokens,
                    stream=True,
                ),
                timeout=timeout,
            ) as response:
                if response.status_code == 404:
                    body = response.read().decode("utf-8", errors="replace")
                    raise ModelNotFoundError(
                        f"{self.provider_name} model not found (404): {self.model}. "
                        f"{body[:300]}"
                    )

                if response.status_code >= 400:
                    body = response.read().decode("utf-8", errors="replace")
                    raise RuntimeError(
                        f"{self.provider_name} error {response.status_code}: {body}"
                    )

                for line in response.iter_lines():
                    if not line:
                        continue

                    if isinstance(line, bytes):
                        line = line.decode("utf-8", errors="replace")

                    if not line.startswith("data:"):
                        continue

                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        continue

                    try:
                        payload = json.loads(data)
                    except json.JSONDecodeError:
                        continue

                    try:
                        delta = payload["choices"][0].get("delta") or {}
                        content = delta.get("content")
                    except (KeyError, IndexError, TypeError):
                        continue

                    if content:
                        yield content
        except httpx.TimeoutException:
            raise RuntimeError(
                f"{self.provider_name} request timed out."
            )
        except httpx.RequestError as error:
            raise RuntimeError(
                f"{self.provider_name} request failed: {str(error)}"
            )