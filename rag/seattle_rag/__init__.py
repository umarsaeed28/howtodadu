"""Seattle middle-housing RAG system.

A small, self-contained retrieval-augmented-generation pipeline over local
markdown documents describing Seattle middle-housing rules, code, and guidance.

Pipeline: markdown -> heading-aware chunks -> local embeddings -> ChromaDB
-> semantic retrieval -> grounded, cited answer from Claude.
"""

from .config import Settings, load_settings

__all__ = ["Settings", "load_settings"]
__version__ = "0.1.0"
