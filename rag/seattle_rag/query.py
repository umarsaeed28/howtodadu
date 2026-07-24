"""Retrieval and grounded answer generation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from .config import Settings
from .embeddings import embed_query, get_client
from .store import get_collection

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
    api_key = settings.require_api_key()
    client = get_client(api_key)
    collection = get_collection(settings)

    if collection.count() == 0:
        return []

    k = top_k or settings.top_k
    q_emb = embed_query(client, settings.embedding_model, question)
    res = collection.query(
        query_embeddings=[q_emb],
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

    client = get_client(settings.require_api_key())
    context = _build_context(chunks)
    user_prompt = (
        f"Context passages:\n\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer using only the context above, with bracketed citations."
    )

    resp = client.chat.completions.create(
        model=settings.chat_model,
        temperature=0.1,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    text = resp.choices[0].message.content or ""
    return Answer(question=question, text=text.strip(), sources=chunks)
