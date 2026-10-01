"""Retrieval and grounded answer generation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from .config import Settings
from .store import get_collection, get_doc_collection

_SYSTEM_PROMPT = (
    "You are a precise assistant answering questions about Seattle middle-housing "
    "rules, zoning, and development guidance. Answer ONLY using the provided "
    "context passages. Cite the passages you use with bracketed numbers like [1], "
    "[2] that match the sources. If the context does not contain the answer, say "
    "you don't have that information in the provided documents. Do not invent code "
    "sections, numbers, or citations. Be concise and specific."
)


@dataclass
class RetrievedChunk:
    text: str
    source: str
    breadcrumb: str
    index: int
    distance: float
    chunk_id: str = ""

    @property
    def citation(self) -> str:
        loc = f"{self.source}" + (f" — {self.breadcrumb}" if self.breadcrumb else "")
        return loc


@dataclass
class Answer:
    question: str
    text: str
    sources: List[RetrievedChunk]


def retrieve(settings: Settings, question: str, top_k: Optional[int] = None) -> List[RetrievedChunk]:
    collection = get_collection(settings)

    if collection.count() == 0:
        return []

    k = top_k or settings.top_k
    res = collection.query(
        query_texts=[question],
        n_results=min(k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]

    out: List[RetrievedChunk] = []
    for doc, meta, dist in zip(docs, metas, dists):
        meta = meta or {}
        out.append(
            RetrievedChunk(
                text=doc,
                source=str(meta.get("source", "unknown")),
                breadcrumb=str(meta.get("breadcrumb", "")),
                index=int(meta.get("index", 0)),
                distance=float(dist),
            )
        )
    return out


def retrieve_hierarchical(
    settings: Settings, queries: List[str], top_docs: int = 3, k: int = 6, scope: str = "rules"
) -> List[RetrievedChunk]:
    """Two-level retrieval. Level 1 picks the most relevant documents, level 2 picks paragraph chunks inside them.

    ``queries`` can mix the user's question with a hypothetical answer (HyDE); each is embedded and searched,
    and a chunk keeps its best (lowest) distance across queries.
    """
    chunks_col = get_collection(settings)
    docs_col = get_doc_collection(settings)
    if chunks_col.count() == 0:
        return []
    queries = [q for q in queries if q and q.strip()]

    # scope "rules" keeps test listing records out of rule lookups; "test" searches the test property dataset; "all" searches both.
    doc_where = {"kind": "rules"} if scope == "rules" else {"kind": "test_listing"} if scope == "test" else None
    doc_best: dict = {}
    if docs_col.count():
        r = docs_col.query(query_texts=queries, n_results=min(top_docs, docs_col.count()), include=["metadatas", "distances"], **({"where": doc_where} if doc_where else {}))
        for metas, dists in zip(r["metadatas"], r["distances"]):
            for m, d in zip(metas, dists):
                src = (m or {}).get("source")
                if src and d < doc_best.get(src, 9):
                    doc_best[src] = d
    forced: List[str] = []
    # Hybrid step: embeddings are weak on street numbers, so a document whose title address appears verbatim in a query wins outright.
    if scope in ("test", "all") and docs_col.count():
        titles = docs_col.get(include=["metadatas"])
        for m in titles["metadatas"]:
            addr = str((m or {}).get("title", "")).split(",")[0].strip().lower()
            if addr and any(addr in q.lower() for q in queries):
                doc_best[(m or {})["source"]] = 0.0
                forced.append((m or {})["source"])
    where = {"source": {"$in": list(doc_best)}} if doc_best else None

    kwargs = {"where": where} if where else {}
    r = chunks_col.query(
        query_texts=queries,
        n_results=min(k, chunks_col.count()),
        include=["documents", "metadatas", "distances"],
        **kwargs,
    )
    best: dict = {}
    for ids, docs, metas, dists in zip(r["ids"], r["documents"], r["metadatas"], r["distances"]):
        for cid, doc, meta, dist in zip(ids, docs, metas, dists):
            meta = meta or {}
            if cid not in best or dist < best[cid].distance:
                best[cid] = RetrievedChunk(
                    text=doc,
                    source=str(meta.get("source", "unknown")),
                    breadcrumb=str(meta.get("breadcrumb", "")),
                    index=int(meta.get("index", 0)),
                    distance=float(dist),
                    chunk_id=cid,
                )
    for src in forced:  # an exact address hit always contributes its best chunks
        fr = chunks_col.query(query_texts=queries[:1], n_results=2, where={"source": src}, include=["documents", "metadatas", "distances"])
        for cid, doc, meta in zip(fr["ids"][0], fr["documents"][0], fr["metadatas"][0]):
            meta = meta or {}
            best[cid] = RetrievedChunk(text=doc, source=src, breadcrumb=str(meta.get("breadcrumb", "")), index=int(meta.get("index", 0)), distance=0.0, chunk_id=cid)
    return sorted(best.values(), key=lambda c: c.distance)[:k]


def _build_context(chunks: List[RetrievedChunk]) -> str:
    blocks = []
    for i, c in enumerate(chunks, start=1):
        header = f"[{i}] Source: {c.citation}"
        blocks.append(f"{header}\n{c.text}")
    return "\n\n---\n\n".join(blocks)


def answer(settings: Settings, question: str, top_k: Optional[int] = None) -> Answer:
    chunks = retrieve(settings, question, top_k=top_k)
    if not chunks:
        return Answer(
            question=question,
            text=(
                "No indexed documents were found (or the store is empty). Add markdown "
                "files to the documents/ folder and run `ingest` first."
            ),
            sources=[],
        )

    import anthropic

    client = anthropic.Anthropic(api_key=settings.require_api_key())
    context = _build_context(chunks)
    user_prompt = (
        f"Context passages:\n\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer using only the context above, with bracketed citations."
    )

    resp = client.messages.create(
        model=settings.chat_model,
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text")
    return Answer(question=question, text=text.strip(), sources=chunks)
