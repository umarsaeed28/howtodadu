"""Jina AI embeddings (jina-embeddings-v3). Passages and queries use different task adapters, as Jina recommends."""

from __future__ import annotations

from typing import Literal, Protocol

import httpx

from .config import Settings

JINA_URL = "https://api.jina.ai/v1/embeddings"


class Embedder(Protocol):
    def embed(self, texts: list[str], task: Literal["passage", "query"]) -> list[list[float]]: ...


class JinaEmbedder:
    def __init__(self, s: Settings) -> None:
        if not s.jina_api_key:
            raise RuntimeError("JINA_API_KEY is not set.")
        self._key = s.jina_api_key
        self._model = s.embedding_model
        self._dims = s.embedding_dims

    def embed(self, texts: list[str], task: Literal["passage", "query"]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), 64):
            batch = [t[:8000] for t in texts[i : i + 64]]
            r = httpx.post(
                JINA_URL,
                headers={"Authorization": f"Bearer {self._key}"},
                json={
                    "model": self._model,
                    "task": "retrieval.passage" if task == "passage" else "retrieval.query",
                    "dimensions": self._dims,
                    "normalized": True,
                    "input": batch,
                },
                timeout=60,
            )
            r.raise_for_status()
            data = sorted(r.json()["data"], key=lambda d: d["index"])
            out.extend(d["embedding"] for d in data)
        return out
