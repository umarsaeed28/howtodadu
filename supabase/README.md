# Supabase

Project: `afinrgvsfepcedmzhmrp` (us-west-2).

## What lives here
`migrations/0005_app_data.sql` is the schema in use. Apply it with `psql "$DATABASE_URL" -f supabase/migrations/0005_app_data.sql`
(or paste it into the dashboard SQL editor). It is idempotent.

| Table | Written by |
|---|---|
| `feedback` | `/api/feedback` (website thumbs up/down) and the Pencil API `/v1/feedback` |
| `signups` | `/api/subscribe` (newsletter and contact form) |
| `listing_cache` | the listings feed cache (`src/lib/listings/refresh-cache.ts`) |
| `assessments`, `token_usage`, `rate_limits` | the Pencil API (`services/api`) |
| `rag_documents`, `rag_chunks` | `python -m app.ingest` (jina-embeddings-v3) |

RLS is on for every table with no policies: the publishable key can read or write nothing. The website writes with
`SUPABASE_SECRET_KEY` (server only) and the Pencil API connects with `DATABASE_URL`.

Not stored here on purpose: the lot library and alleys (bundled JSON, rebuilt by scripts) and favorites / recent
addresses (in the browser until there are user accounts).

## Connected to this repo
With the Supabase GitHub integration on this repo (working directory `supabase`, production branch `main`), every
migration in `supabase/migrations/` is applied to the project when it is merged to `main`. Only add migrations there
that should run in production. `config.toml` is the CLI project config (`supabase link --project-ref afinrgvsfepcedmzhmrp`).

## Superseded
`superseded/0001`-`0004` (GIS tables, a voyage-law-2 `chunks` store, `report_cache`, `config`, `rules`) are not applied and no code
uses them. The knowledge base is the Pencil API's Jina store in `0005`. Kept for reference only.
