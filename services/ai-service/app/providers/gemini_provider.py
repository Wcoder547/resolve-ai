from typing import Iterator, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from app.providers.base import BaseLLMProvider


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> str:
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY is missing.")

        llm = ChatGoogleGenerativeAI(
            model=self.model,
            google_api_key=self.api_key,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        response = llm.invoke(
            [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]
        )

        content = response.content

        if isinstance(content, list):
            return "\n".join(str(item) for item in content)

        return str(content)

    def generate_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> Iterator[str]:
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY is missing.")

        llm = ChatGoogleGenerativeAI(
            model=self.model,
            google_api_key=self.api_key,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        try:
            yielded = False
            for chunk in llm.stream(messages):
                content = chunk.content
                if isinstance(content, list):
                    text = "\n".join(str(item) for item in content if item)
                else:
                    text = str(content) if content else ""
                if text:
                    yielded = True
                    yield text
        except Exception:
            if yielded:
                raise
            result = self.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if result:
                yield result