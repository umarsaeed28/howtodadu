"""OpenAI embedding helpers."""

from __future__ import annotations

from typing import List

from openai import OpenAI

# OpenAI accepts large batches; keep well under limits for stability.
_BATCH_SIZE = 96


def get_client(api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key)


def embed_texts(client: OpenAI, model: str, texts: List[str]) -> List[List[float]]:
    """Embed a list of texts, batching requests."""
    vectors: List[List[float]] = []
    for start in range(0, len(texts), _BATCH_SIZE):
        batch = texts[start : start + _BATCH_SIZE]
        resp = client.embeddings.create(model=model, input=batch)
        # Preserve request order.
        for item in sorted(resp.data, key=lambda d: d.index):
            vectors.append(item.embedding)
    return vectors


def embed_query(client: OpenAI, model: str, text: str) -> List[float]:
    return embed_texts(client, model, [text])[0]
