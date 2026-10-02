-- App data in Supabase. Idempotent: safe to re-run.
-- The Pencil API tables match services/api/migrations/0001_init.sql, so `python -m app.db migrate` against
-- this database is a no-op after this file. RLS is on with no policies: only the server-side secret key
-- (Next.js API routes) and the Postgres connection string (Python service) can read or write.

create extension if not exists vector with schema extensions;  -- Supabase keeps extensions out of public

-- Knowledge base (Pencil API): jina-embeddings-v3, 1024 dims.
create table if not exists rag_documents (
  source        text primary key,
  kind          text not null,
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

-- Finished AI assessments, keyed by listing and a hash of its facts.
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

-- Thumbs up/down from the website and the API, with a snapshot of what the person saw.
create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  rating      text not null check (rating in ('up', 'down')),
  comment     text not null default '',
  snapshot    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table feedback add column if not exists negative_reason text;
alter table feedback add column if not exists app_version text;
alter table feedback add column if not exists client_id text;
create index if not exists feedback_created on feedback(created_at desc);

-- Newsletter and contact-form sign-ups.
create table if not exists signups (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  kind         text not null check (kind in ('newsletter', 'contact')),
  name         text,
  message      text,
  source_path  text,
  created_at   timestamptz not null default now()
);
create index if not exists signups_email on signups(lower(email));
create index if not exists signups_created on signups(created_at desc);

-- Listings feed cache (Redfin via HasData), refreshed at most every 12 hours.
create table if not exists listing_cache (
  key         text primary key,
  value       jsonb not null,
  fetched_at  timestamptz not null default now()
);

alter table rag_documents enable row level security;
alter table rag_chunks    enable row level security;
alter table assessments   enable row level security;
alter table token_usage   enable row level security;
alter table rate_limits   enable row level security;
alter table feedback      enable row level security;
alter table signups       enable row level security;
alter table listing_cache enable row level security;
