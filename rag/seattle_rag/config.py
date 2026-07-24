"""Runtime configuration, loaded from environment / .env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:  # python-dotenv is optional so offline tooling works without deps installed
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    def load_dotenv(*_args, **_kwargs):  # type: ignore[misc]
        return False

# Load .env sitting next to the package root (rag/.env) if present.
_PACKAGE_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PACKAGE_ROOT / ".env")
load_dotenv()  # also honor a .env in the current working directory


def _resolve_dir(env_value: str | None, default: Path) -> Path:
    if not env_value:
        return default
    p = Path(env_value)
    return p if p.is_absolute() else (_PACKAGE_ROOT / p)


@dataclass
class Settings:
    """All tunables for the RAG pipeline."""

    openai_api_key: str
    embedding_model: str
    chat_model: str
    collection_name: str
    chunk_max_tokens: int
    chunk_overlap_tokens: int
    top_k: int
    documents_dir: Path
    storage_dir: Path

    def require_api_key(self) -> str:
        if not self.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Copy rag/.env.example to rag/.env "
                "and add your key, or export OPENAI_API_KEY in your shell."
            )
        return self.openai_api_key


def load_settings() -> Settings:
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        embedding_model=os.getenv("RAG_EMBEDDING_MODEL", "text-embedding-3-small"),
        chat_model=os.getenv("RAG_CHAT_MODEL", "gpt-4o-mini"),
        collection_name=os.getenv("RAG_COLLECTION", "seattle_middle_housing"),
        chunk_max_tokens=int(os.getenv("RAG_CHUNK_MAX_TOKENS", "500")),
        chunk_overlap_tokens=int(os.getenv("RAG_CHUNK_OVERLAP_TOKENS", "75")),
        top_k=int(os.getenv("RAG_TOP_K", "5")),
        documents_dir=_resolve_dir(os.getenv("RAG_DOCUMENTS_DIR"), _PACKAGE_ROOT / "documents"),
        storage_dir=_resolve_dir(os.getenv("RAG_STORAGE_DIR"), _PACKAGE_ROOT / "storage"),
    )
