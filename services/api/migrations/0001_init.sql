-- Pencil API schema. Postgres 16 with pgvector. Applied by `python -m app.db migrate` (idempotent).
create extension if not exists vector;

-- Knowledge base: one row per markdown document, plus its chunks. Embeddings are jina-embeddings-v3 (1024 dims).
create table if not exists rag_documents (
  source        text primary key,                 -- path under the documents folder
  kind          text not null,                    -- 'rules' or 'test_listing'
  title         text not null,
  content_hash  text not null,
  embedding     vector(1024),
  updated_at    timestamptz not null default now()
);

create table if not exists rag_chunks (
  id          text primary key,
  source      text not null references rag_documents(source) on delete cascade,
  kind        text not null,
  breadcrumb  text not null,
  idx         int  not null,
  text        text not null,
  embedding   vector(1024) not null
);
create index if not exists rag_chunks_source on rag_chunks(source);
create index if not exists rag_chunks_embedding on rag_chunks using hnsw (embedding vector_cosine_ops);

-- Finished assessments, keyed by listing and a hash of the facts: an unchanged listing is never re-run.
create table if not exists assessments (
  mls_id      text not null,
  facts_hash  text not null,
  result      jsonb not null,
  tokens      int not null default 0,
  created_at  timestamptz not null default now(),
  primary key (mls_id, facts_hash)
);
create index if not exists assessments_latest on assessments(mls_id, created_at desc);

-- Tokens used per UTC day, for the daily budget.
create table if not exists token_usage (
  day     date primary key,
  tokens  bigint not null default 0
);

-- Per-client request counts for rate limiting (hour windows).
create table if not exists rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         int not null default 0,
  primary key (key, window_start)
);

-- Thumbs up/down with an optional comment, plus a snapshot of what the app showed.
create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  rating      text not null check (rating in ('up', 'down')),
  comment     text not null default '',
  snapshot    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
