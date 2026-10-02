# Pencil API

FastAPI service that runs the DADU assessment as a LangGraph graph, searches the knowledge base in
Postgres + pgvector (Jina embeddings), and stores assessments, token usage, rate limits and feedback.

- Graph: `app/graph.py` (gate → extract → hyde → retrieve → plan → analyze → validate → decide → render)
- Token rules: `app/agents.py` and `app/config.py` (budgets, cache TTL, tiers)
- Models: Groq for small jobs, Claude Haiku for the read, Claude Sonnet when the case is close (`app/llm.py`)
- Tracing: Opik (every LLM call), errors: Sentry. Both switch on when their keys are set.

## Develop

```bash
uv sync                      # Python 3.12 + deps
uv run pytest                # tests (no network, no database)
uv run ruff check . && uv run ruff format --check . && uv run mypy app
docker compose up --build    # Postgres + API on :8000 (reads ../../.env.credentials)
uv run python -m app.db migrate
uv run python -m app.ingest  # load ../../rag/documents (set DOCUMENTS_DIR) with Jina embeddings
```

## Endpoints (all but /health need the `x-api-key` header)

- `GET /health`
- `POST /v1/assess` — body: facts + rules baseline from the website; returns the checked assessment
- `POST /v1/search` — knowledge-base search (evals, debugging)
- `POST /v1/feedback` — thumbs up/down with an optional comment

## Deploy
Not deployed yet: the website runs its built-in AI chain when `PENCIL_API_URL` is unset. To add this service later, deploy
it (Vercel Services, Railway, Fly) with `DATABASE_URL` set to the Supabase session pooler, then set `PENCIL_API_URL` and
`PENCIL_API_KEY` on the website.
