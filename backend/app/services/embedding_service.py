"""Wraps OpenAI's embeddings endpoint, used for both document ingestion and query embedding."""

from app.core.config import settings
from app.core.openai_client import get_openai_client, with_openai_retry


@with_openai_retry
async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    client = get_openai_client()
    response = await client.embeddings.create(model=settings.openai_embedding_model, input=texts)
    return [item.embedding for item in response.data]


async def embed_text(text: str) -> list[float]:
    return (await embed_texts([text]))[0]
