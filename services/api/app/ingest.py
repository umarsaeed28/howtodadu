"""Load the knowledge base into Postgres: chunk each markdown file, embed with Jina, upsert. Unchanged files are skipped.

python -m app.ingest [--reset] [--documents PATH]
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

from pgvector.psycopg import register_vector

from .chunking import Tokenizer, chunk_markdown
from .config import get_settings
from .db import migrate, pool
from .embeddings import JinaEmbedder


def kind_of(rel: str) -> str:
    return "test_listing" if rel.startswith("test-listings") else "rules"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true")
    ap.add_argument("--documents", default=None)
    args = ap.parse_args()
    s = get_settings()
    root = Path(args.documents or s.documents_dir)
    migrate(s)
    emb = JinaEmbedder(s)
    tok = Tokenizer()
    files = sorted(p for p in root.rglob("*.md") if p.is_file())
    done = skipped = chunks_total = 0
    with pool(s).connection() as c:
        register_vector(c)
        if args.reset:
            c.execute("delete from rag_documents")
        known: dict[str, str] = dict(c.execute("select source, content_hash from rag_documents").fetchall())
        for path in files:
            rel = str(path.relative_to(root))
            text = path.read_text(encoding="utf-8")
            h = hashlib.sha1(text.encode()).hexdigest()
            if known.get(rel) == h:
                skipped += 1
                continue
            chunks = chunk_markdown(text, source=rel, tokenizer=tok)
            if not chunks:
                continue
            title = next((ln.lstrip("# ").strip() for ln in text.splitlines() if ln.startswith("#")), rel)
            vecs = emb.embed([text[:8000], *[f"{ch.breadcrumb}\n{ch.text}" for ch in chunks]], "passage")
            c.execute(
                "insert into rag_documents (source, kind, title, content_hash, embedding) values (%s, %s, %s, %s, %s) "
                "on conflict (source) do update set kind = excluded.kind, title = excluded.title, content_hash = excluded.content_hash, "
                "embedding = excluded.embedding, updated_at = now()",
                (rel, kind_of(rel), title, h, vecs[0]),
            )
            c.execute("delete from rag_chunks where source = %s", (rel,))
            for ch, v in zip(chunks, vecs[1:], strict=True):
                cid = f"{rel}::{ch.index}::{hashlib.sha1(ch.text.encode()).hexdigest()[:12]}"
                c.execute(
                    "insert into rag_chunks (id, source, kind, breadcrumb, idx, text, embedding) values (%s, %s, %s, %s, %s, %s, %s)",
                    (cid, rel, kind_of(rel), ch.breadcrumb, ch.index, ch.text, v),
                )
            done += 1
            chunks_total += len(chunks)
        gone = set(known) - {str(p.relative_to(root)) for p in files}
        for rel in gone:
            c.execute("delete from rag_documents where source = %s", (rel,))
    print(f"ingested {done} files ({chunks_total} chunks), {skipped} unchanged, {len(gone)} removed")


if __name__ == "__main__":
    main()
