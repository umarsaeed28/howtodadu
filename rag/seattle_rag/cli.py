"""Command-line interface for the Seattle middle-housing RAG system.

Usage:
    python -m seattle_rag ingest [--reset]
    python -m seattle_rag ask "how many units on an NR2 lot near transit?"
    python -m seattle_rag query "DADU height limit" [-k 8]
    python -m seattle_rag chat
    python -m seattle_rag stats
    python -m seattle_rag reset
"""

from __future__ import annotations

import argparse
import sys
from typing import List

from .config import load_settings
from .ingest import ingest as run_ingest
from .query import answer as run_answer
from .query import retrieve as run_retrieve
from .query import retrieve_hierarchical
from .store import get_collection, reset_collection


def _print_sources(sources) -> None:
    if not sources:
        return
    print("\nSources:")
    for i, c in enumerate(sources, start=1):
        print(f"  [{i}] {c.citation}  (distance {c.distance:.3f})")


def cmd_ingest(args) -> int:
    settings = load_settings()
    if args.reset:
        print("Resetting collection...")
        reset_collection(settings)
    run_ingest(settings, verbose=True)
    return 0


def cmd_ask(args) -> int:
    settings = load_settings()
    question = " ".join(args.question).strip()
    if not question:
        print("Provide a question, e.g. ask \"what is the max FAR in NR3?\"")
        return 2
    result = run_answer(settings, question, top_k=args.k)
    print(f"\n{result.text}\n")
    _print_sources(result.sources)
    return 0


def cmd_query(args) -> int:
    settings = load_settings()
    question = " ".join(args.question).strip()
    if not question:
        print("Provide a search query.")
        return 2
    if args.json:
        import json

        # Hierarchical retrieval; --hyde adds a hypothetical answer as a second query (HyDE).
        queries = [question] + ([args.hyde] if args.hyde else [])
        chunks = retrieve_hierarchical(settings, queries, top_docs=args.docs, k=args.k or settings.top_k, scope=args.scope)
        print(json.dumps([{"id": c.chunk_id, "source": c.source, "breadcrumb": c.breadcrumb, "text": c.text, "distance": c.distance} for c in chunks]))
        return 0
    chunks = run_retrieve(settings, question, top_k=args.k)
    if not chunks:
        print("No results. Is the store empty? Run `ingest` first.")
        return 0
    for i, c in enumerate(chunks, start=1):
        print(f"\n[{i}] {c.citation}  (distance {c.distance:.3f})")
        print("-" * 60)
        print(c.text)
    return 0


def cmd_chat(args) -> int:
    settings = load_settings()
    print("Seattle middle-housing RAG. Ask a question (Ctrl-C or 'exit' to quit).")
    try:
        while True:
            question = input("\n> ").strip()
            if question.lower() in {"exit", "quit", ":q"}:
                break
            if not question:
                continue
            result = run_answer(settings, question, top_k=args.k)
            print(f"\n{result.text}")
            _print_sources(result.sources)
    except (KeyboardInterrupt, EOFError):
        print()
    return 0


def cmd_stats(args) -> int:
    settings = load_settings()
    collection = get_collection(settings)
    count = collection.count()
    print(f"Collection : {settings.collection_name}")
    print(f"Storage    : {settings.storage_dir}")
    print(f"Documents  : {settings.documents_dir}")
    print(f"Chunks     : {count}")
    if count:
        sample = collection.get(include=["metadatas"], limit=count)
        sources = sorted({(m or {}).get("source", "?") for m in sample.get("metadatas", [])})
        print(f"Files      : {len(sources)}")
        for s in sources:
            print(f"  - {s}")
    return 0


def cmd_reset(args) -> int:
    settings = load_settings()
    reset_collection(settings)
    print(f"Collection '{settings.collection_name}' reset (all vectors dropped).")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="seattle_rag",
        description="RAG over Seattle middle-housing markdown documents.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_ingest = sub.add_parser("ingest", help="Index markdown files from documents/")
    p_ingest.add_argument("--reset", action="store_true", help="Drop the collection first")
    p_ingest.set_defaults(func=cmd_ingest)

    p_ask = sub.add_parser("ask", help="Ask a question, get a cited answer")
    p_ask.add_argument("question", nargs="+")
    p_ask.add_argument("-k", type=int, default=None, help="Number of passages to retrieve")
    p_ask.set_defaults(func=cmd_ask)

    p_query = sub.add_parser("query", help="Semantic search (show raw passages)")
    p_query.add_argument("question", nargs="+")
    p_query.add_argument("-k", type=int, default=None, help="Number of passages to retrieve")
    p_query.add_argument("--hyde", default=None, help="Hypothetical answer text to embed as an extra query")
    p_query.add_argument("--scope", choices=["rules", "test", "all"], default="rules", help="Which records to search (test = the sample listings)")
    p_query.add_argument("--docs", type=int, default=3, help="Documents to keep at level 1")
    p_query.add_argument("--json", action="store_true", help="Print passages as JSON (used by the web app)")
    p_query.set_defaults(func=cmd_query)

    p_chat = sub.add_parser("chat", help="Interactive Q&A loop")
    p_chat.add_argument("-k", type=int, default=None, help="Number of passages to retrieve")
    p_chat.set_defaults(func=cmd_chat)

    p_stats = sub.add_parser("stats", help="Show collection stats")
    p_stats.set_defaults(func=cmd_stats)

    p_reset = sub.add_parser("reset", help="Drop all indexed vectors")
    p_reset.set_defaults(func=cmd_reset)

    return parser


def main(argv: List[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
