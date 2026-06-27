from functools import lru_cache
from typing import List

from fastembed import TextEmbedding

from app.config.settings import get_settings
from app.services.token_usage import build_embedding_usage


@lru_cache(maxsize=1)
def get_embedding_model():
    settings = get_settings()

    if settings.embedding_provider != "fastembed":
        raise RuntimeError(
            f"Unsupported embedding provider: {settings.embedding_provider}"
        )

    return TextEmbedding(model_name=settings.embedding_model)


def clean_embedding_text(text: str) -> str:
    settings = get_settings()

    cleaned = " ".join((text or "").split()).strip()

    if not cleaned:
        cleaned = "empty"

    return cleaned[: settings.embedding_max_text_chars]


def generate_text_embeddings(texts: List[str]):
    settings = get_settings()

    cleaned_texts = [clean_embedding_text(text) for text in texts]
    model = get_embedding_model()

    embeddings = []

    for start_index in range(0, len(cleaned_texts), settings.embedding_batch_size):
        batch = cleaned_texts[start_index : start_index + settings.embedding_batch_size]
        batch_embeddings = list(model.embed(batch))

        for local_index, embedding in enumerate(batch_embeddings):
            vector = embedding.tolist()

            if len(vector) != settings.embedding_dimensions:
                raise RuntimeError(
                    f"Embedding dimension mismatch. Expected {settings.embedding_dimensions}, got {len(vector)}."
                )

            embeddings.append(
                {
                    "index": start_index + local_index,
                    "embedding": [float(value) for value in vector],
                }
            )

    return {
    "provider": settings.embedding_provider,
    "model": settings.embedding_model,
    "dimensions": settings.embedding_dimensions,
    "embeddings": embeddings,
    "usage": build_embedding_usage(cleaned_texts),
}