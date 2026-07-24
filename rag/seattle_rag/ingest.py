"""Ingest markdown documents into the vector store.

Ingestion is idempotent per file: before adding a file's chunks we delete any
existing chunks for that ``source`` path, so re-running after edits keeps the
store in sync. Chunk IDs are content-stable hashes.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import List

from .chunking import Chunk, Tokenizer, chunk_markdown
from .config import Settings
from .embeddings import embed_texts, get_client
from .store import get_collection


@dataclass
class IngestReport:
    files: int
    chunks: int
    skipped_files: List[str]
    tokenizer_backend: str


def _chunk_id(source: str, index: int, text: str) -> str:
    digest = hashlib.sha1(f"{source}:{index}:{text}".encode("utf-8")).hexdigest()
    return f"{source}::{index}::{digest[:12]}"


def _discover(documents_dir: Path) -> List[Path]:
    if not documents_dir.exists():
        return []
    return sorted(p for p in documents_dir.rglob("*.md") if p.is_file())


def ingest(settings: Settings, verbose: bool = True) -> IngestReport:
    api_key = settings.require_api_key()
    tokenizer = Tokenizer()
    collection = get_collection(settings)
    client = get_client(api_key)

    files = _discover(settings.documents_dir)
    skipped: List[str] = []
    total_chunks = 0

    if not files:
        if verbose:
            print(f"No markdown files found in {settings.documents_dir}")
        return IngestReport(0, 0, skipped, tokenizer.backend)

    for path in files:
        rel = str(path.relative_to(settings.documents_dir))
        raw = path.read_text(encoding="utf-8", errors="replace")
        chunks: List[Chunk] = chunk_markdown(
            raw,
            source=rel,
            tokenizer=tokenizer,
            max_tokens=settings.chunk_max_tokens,
            overlap_tokens=settings.chunk_overlap_tokens,
        )
        if not chunks:
            skipped.append(rel)
            if verbose:
                print(f"  - {rel}: no content, skipped")
            continue

        # Keep the store in sync: drop old chunks for this file first.
        collection.delete(where={"source": rel})

        texts = [c.text for c in chunks]
        embeddings = embed_texts(client, settings.embedding_model, texts)
        ids = [_chunk_id(rel, c.index, c.text) for c in chunks]
        metadatas = [
            {
                "source": rel,
                "index": c.index,
                "heading": c.heading_path[-1] if c.heading_path else "",
                "breadcrumb": c.breadcrumb,
            }
            for c in chunks
        ]
        collection.upsert(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
        total_chunks += len(chunks)
        if verbose:
            print(f"  - {rel}: {len(chunks)} chunks")

    if verbose:
        print(
            f"Ingested {total_chunks} chunks from {len(files) - len(skipped)} file(s). "
            f"(tokenizer: {tokenizer.backend})"
        )
    return IngestReport(len(files), total_chunks, skipped, tokenizer.backend)
