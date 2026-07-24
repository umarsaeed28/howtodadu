"""Pencil FDE — a forward-deployed feasibility framework.

Takes a property address and produces a structured feasibility report by
orchestrating pluggable *tools* (data sources) and *knowledge* (the RAG system)
through an LLM agent.

The framework is intentionally thin and extensible: drop new tools into
``fde.tools`` and register them, add knowledge markdown into ``../rag/documents``
and ingest it. The agent and UI pick them up automatically.
"""

from .config import Settings, load_settings
from .schema import FeasibilityReport

__all__ = ["Settings", "load_settings", "FeasibilityReport"]
__version__ = "0.1.0"
