# Seattle Middle Housing — RAG System

A small, self-contained Retrieval-Augmented Generation (RAG) pipeline over local
markdown documents about Seattle middle-housing rules, zoning, and development
guidance. You add markdown, it indexes it, and you can ask grounded, cited
questions.

**Stack:** Python · Claude (answers) · local embeddings · ChromaDB (persistent vector store)

```
markdown files ─▶ heading-aware chunking ─▶ local embeddings (Chroma) ─▶ ChromaDB
                                                                     │
                        cited answer ◀─ Claude ◀─ top-k retrieval
```

## Layout

```
rag/
├── documents/            # ← put your Seattle markdown files here (recursive)
├── storage/              # ChromaDB persistence (auto-created, gitignored)
├── seattle_rag/          # the package
│   ├── config.py         # settings from env / .env
│   ├── chunking.py       # heading-aware markdown chunker (+ tokenizer)
│   ├── embeddings.py     # (removed: Chroma embeds locally)
│   ├── store.py          # ChromaDB collection
│   ├── ingest.py         # documents -> chunks -> vectors
│   ├── query.py          # retrieval + grounded answer generation
│   └── cli.py            # command-line interface
├── tests/                # offline chunker tests (no API needed)
├── requirements.txt
└── .env.example
```

## Setup

From the `rag/` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

Add your markdown files to `documents/`, then:

```bash
# Index everything in documents/
python -m seattle_rag ingest

# Ask a question and get a cited answer
python -m seattle_rag ask "How many units are allowed on an NR2 lot near frequent transit?"

# Raw semantic search (see the passages that would be retrieved)
python -m seattle_rag query "DADU height limit" -k 8

# Interactive loop
python -m seattle_rag chat

# Inspect the index
python -m seattle_rag stats

# Rebuild from scratch
python -m seattle_rag ingest --reset
```

Run all commands from the `rag/` directory (or set `PYTHONPATH=rag`).

## Adding documents

- Drop `.md` files into `documents/` (subfolders allowed).
- Files are chunked by markdown headings; each chunk keeps its heading
  breadcrumb (e.g. `Zoning > NR2 > FAR`) for better retrieval and citations.
- Re-running `ingest` re-indexes edited files idempotently (old chunks for a
  file are replaced).

## Configuration

All optional, via environment or `.env` (defaults shown):

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | Needed only for `ask` and `chat`. |
| `RAG_CHAT_MODEL` | `claude-sonnet-5-5` | Answer-generation model. |
| `RAG_COLLECTION` | `seattle_middle_housing` | Chroma collection name. |
| `RAG_CHUNK_MAX_TOKENS` | `500` | Max tokens per chunk. |
| `RAG_CHUNK_OVERLAP_TOKENS` | `75` | Overlap between chunks. |
| `RAG_TOP_K` | `5` | Passages retrieved per query. |
| `RAG_DOCUMENTS_DIR` | `documents` | Source folder. |
| `RAG_STORAGE_DIR` | `storage` | Vector store folder. |

## Tests

Offline (no API key needed) — verifies the markdown chunker:

```bash
python tests/test_chunking.py
# or, if pytest is installed:
python -m pytest tests
```

## Notes

- Answers are grounded: the model is instructed to use only retrieved passages
  and to say when the documents don't contain the answer.
- Verify anything legal/code-related against the Seattle Municipal Code. The
  included `documents/01-sample-*.md` is a placeholder — replace it.
