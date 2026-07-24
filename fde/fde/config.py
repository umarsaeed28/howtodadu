"""Configuration + wiring to the sibling RAG package."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    def load_dotenv(*_args, **_kwargs):  # type: ignore[misc]
        return False

# Repo layout:  <repo>/fde/fde/config.py  and  <repo>/rag/seattle_rag
_PACKAGE_ROOT = Path(__file__).resolve().parent.parent  # <repo>/fde
_REPO_ROOT = _PACKAGE_ROOT.parent  # <repo>
RAG_DIR = _REPO_ROOT / "rag"

# Make `import seattle_rag` work without installing the rag package.
if RAG_DIR.exists() and str(RAG_DIR) not in sys.path:
    sys.path.insert(0, str(RAG_DIR))

load_dotenv(_PACKAGE_ROOT / ".env")
load_dotenv(RAG_DIR / ".env")
load_dotenv()

WEB_DIR = _PACKAGE_ROOT / "web"


def _truthy(value: str | None) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    openai_api_key: str
    chat_model: str
    max_tool_steps: int
    host: str
    port: int
    mock: bool

    @property
    def rag_available(self) -> bool:
        return RAG_DIR.exists()


def load_settings() -> Settings:
    key = os.getenv("OPENAI_API_KEY", "")
    forced_mock = _truthy(os.getenv("FDE_MOCK"))
    return Settings(
        openai_api_key=key,
        chat_model=os.getenv("FDE_CHAT_MODEL", "gpt-4o-mini"),
        max_tool_steps=int(os.getenv("FDE_MAX_TOOL_STEPS", "6")),
        host=os.getenv("FDE_HOST", "127.0.0.1"),
        port=int(os.getenv("FDE_PORT", "8000")),
        # Mock when explicitly forced, or when there's no key to call the LLM.
        mock=forced_mock or not key,
    )
