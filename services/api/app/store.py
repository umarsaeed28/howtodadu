"""Two-level retrieval on Postgres + pgvector, ported from rag/seattle_rag/query.py.

Level 1 picks the closest documents, level 2 picks chunks inside them. The question and an optional
hypothetical passage (HyDE) are both embedded; each chunk keeps its best distance. For listing records, a
document whose title address appears verbatim in the question wins outright (embeddings are weak on numbers).
"""

from __future__ import annotations

from typing import Literal, Protocol

from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

from .embeddings import Embedder
from .schemas import Passage

Scope = Literal["rules", "test", "all"]
_KINDS: dict[str, list[str]] = {"rules": ["rules"], "test": ["test_listing"], "all": ["rules", "test_listing"]}


class Store(Protocol):
    def search(self, question: str, k: int = 6, hyde: str = "", scope: Scope = "rules") -> list[Passage]: ...


class PgStore:
    def __init__(self, p: ConnectionPool, embedder: Embedder, top_docs: int = 3) -> None:
        self._p = p
        self._e = embedder
        self._top_docs = top_docs

    def search(self, question: str, k: int = 6, hyde: str = "", scope: Scope = "rules") -> list[Passage]:
        queries = [q for q in (question, hyde) if q and q.strip()]
        vecs = self._e.embed(queries, "query")
        kinds = _KINDS[scope]
        with self._p.connection() as c:
            register_vector(c)
            doc_best: dict[str, float] = {}
            for v in vecs:
                for src, d in c.execute(
                    "select source, embedding <=> %s::vector as d from rag_documents where kind = any(%s) and embedding is not null order by d limit %s",
                    (v, kinds, self._top_docs),
                ).fetchall():
                    doc_best[src] = min(d, doc_best.get(src, 9.0))
            forced: list[str] = []
            if "test_listing" in kinds:
                low = " ".join(q.lower() for q in queries)
                for src, title in c.execute("select source, title from rag_documents where kind = 'test_listing'").fetchall():
                    addr = str(title).split(",")[0].strip().lower()
                    if addr and addr in low:
                        doc_best[src] = 0.0
                        forced.append(src)
            if not doc_best:
                return []
            best: dict[str, tuple[float, tuple[str, str, str, str]]] = {}
            for v in vecs:
                for cid, src, crumb, text, d in c.execute(
                    "select id, source, breadcrumb, text, embedding <=> %s::vector as d from rag_chunks where source = any(%s) order by d limit %s",
                    (v, list(doc_best), k),
                ).fetchall():
                    if cid not in best or d < best[cid][0]:
                        best[cid] = (d, (cid, src, crumb, text))
            for src in forced:  # an exact address hit always contributes its best chunks
                for cid, crumb, text in c.execute(
                    "select id, breadcrumb, text from rag_chunks where source = %s order by embedding <=> %s::vector limit 2",
                    (src, vecs[0]),
                ).fetchall():
                    best[cid] = (0.0, (cid, src, crumb, text))
        rows = sorted(best.values(), key=lambda r: r[0])[:k]
        return [
            Passage(label=f"P{i + 1}", id=cid, doc_id=src.removesuffix(".md"), section=crumb, text=text, distance=float(d))
            for i, (d, (cid, src, crumb, text)) in enumerate(rows)
        ]
