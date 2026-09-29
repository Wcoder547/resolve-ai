import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
TESTS = Path(__file__).resolve().parent
for path in (ROOT, TESTS):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from helpers import FakeEmbeddingModel, FakeLLMProvider, make_provider_chain


@pytest.fixture
def fake_llm():
    return FakeLLMProvider("{}")


@pytest.fixture
def patch_llm_chain(monkeypatch):
    """Factory: patch get_llm_provider_chain wherever it is imported from."""

    def _patch(provider: FakeLLMProvider, name: str = "openrouter", model: str = "mock-model"):
        chain = make_provider_chain(provider, name=name, model=model)

        def _chain():
            return chain

        monkeypatch.setattr("app.providers.llm_factory.get_llm_provider_chain", _chain)
        monkeypatch.setattr("app.services.rag_chat.get_llm_provider_chain", _chain)
        monkeypatch.setattr("app.services.question_rewriter.get_llm_provider_chain", _chain)
        monkeypatch.setattr("app.services.agentic_rag.get_llm_provider_chain", _chain)
        monkeypatch.setattr("app.agents.agent_utils.get_llm_provider_chain", _chain)
        return provider

    return _patch


@pytest.fixture
def patch_embeddings(monkeypatch):
    def _patch(dimensions: int = 384):
        model = FakeEmbeddingModel(dimensions=dimensions)
        monkeypatch.setattr("app.services.embeddings.get_embedding_model", lambda: model)
        return model

    return _patch
