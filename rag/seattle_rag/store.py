"""ChromaDB persistent vector store."""

from __future__ import annotations

from typing import TYPE_CHECKING

import chromadb
from chromadb.config import Settings as ChromaSettings

if TYPE_CHECKING:
    from .config import Settings


def get_collection(settings: "Settings"):
    """Return the persistent collection, creating it if needed."""
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(
        path=str(settings.storage_dir),
        settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
    )
    return client.get_or_create_collection(
        name=settings.collection_name,
        metadata={"hnsw:space": "cosine"},
    )


def reset_collection(settings: "Settings") -> None:
    """Delete and recreate the collection (drops all vectors)."""
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(
        path=str(settings.storage_dir),
        settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
    )
    try:
        client.delete_collection(settings.collection_name)
    except Exception:
        pass
    client.get_or_create_collection(
        name=settings.collection_name,
        metadata={"hnsw:space": "cosine"},
    )
