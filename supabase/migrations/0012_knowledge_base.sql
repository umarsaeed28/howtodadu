-- Knowledge base for the feasibility RAG. Idempotent: safe to re-run.
--
-- Extends 0005's rag_documents / rag_chunks (jina-embeddings-v3, 1024 dims), so the Python service still works:
--   * each source carries its citation (code section, link, publisher, effective date),
--   * each chunk can carry one line of context that places it in its document (contextual retrieval),
--   * each chunk gets a keyword index beside its vector,
--   * one function, kb_hybrid_search, fuses keyword and vector rankings with reciprocal rank fusion.
-- RLS stays on with no policies: only the server's secret key reads or writes these tables.

alter table public.rag_documents
  add column if not exists source_url     text,
  add column if not exists citation       text,         -- e.g. 'SMC 23.44.041'
  add column if not exists publisher      text,         -- e.g. 'City of Seattle, SDCI'
  add column if not exists effective_date date,         -- when the rule or document took effect
  add column if not exists retrieved_at   timestamptz;  -- when Pencil copied it

alter table public.rag_chunks
  add column if not exists context text;

-- A chunk can be stored before it is embedded (keyword search works at once; the vector is filled in when an
-- embedding key is available). The vector side of the search skips chunks without one.
alter table public.rag_chunks
  alter column embedding drop not null;

-- Keyword search over the section path (weight A), the context line (B) and the passage (D): a match in a section
-- title says more than one in the body. Generated, so writers never maintain it.
alter table public.rag_chunks
  add column if not exists fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(breadcrumb, '')), 'A')
    || setweight(to_tsvector('english', coalesce(context, '')), 'B')
    || setweight(to_tsvector('english', coalesce(text, '')), 'D')
  ) stored;

create index if not exists rag_chunks_fts on public.rag_chunks using gin (fts);
create index if not exists rag_chunks_kind on public.rag_chunks (kind);

-- Hybrid search. The question is matched as an OR of its words (a natural-language question rarely contains every
-- word of the right passage), ranked by weighted term frequency over log length; the embedding, when given, is ranked by cosine distance.
-- Each list contributes 1 / (rrf_k + rank). With no embedding it is plain keyword search.
create or replace function public.kb_hybrid_search(
  query_text       text,
  query_embedding  extensions.vector(1024) default null,
  match_count      int default 8,
  kinds            text[] default array['rules'],
  full_text_weight double precision default 1,
  semantic_weight  double precision default 1,
  rrf_k            int default 50
)
returns table (
  id             text,
  source         text,
  kind           text,
  breadcrumb     text,
  content        text,
  context        text,
  title          text,
  source_url     text,
  citation       text,
  effective_date date,
  score          double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select pg_catalog.to_tsquery(
      'english',
      coalesce(
        pg_catalog.array_to_string(
          pg_catalog.array_remove(
            pg_catalog.regexp_split_to_array(
              pg_catalog.lower(pg_catalog.regexp_replace(coalesce(query_text, ''), '[^A-Za-z0-9]+', ' ', 'g')),
              '\s+'
            ),
            ''
          ),
          ' | '
        ),
        ''
      )
    ) as tsq
  ),
  full_text as (
    select c.id,
           row_number() over (order by pg_catalog.ts_rank(c.fts, q.tsq, 1) desc) as rank_ix
    from public.rag_chunks c, q
    where c.kind = any (kinds)
      and c.fts @@ q.tsq
    order by rank_ix
    limit least(greatest(match_count, 1), 50) * 2
  ),
  semantic as (
    select c.id,
           row_number() over (order by c.embedding operator(extensions.<=>) query_embedding) as rank_ix
    from public.rag_chunks c
    where query_embedding is not null
      and c.embedding is not null
      and c.kind = any (kinds)
    order by rank_ix
    limit least(greatest(match_count, 1), 50) * 2
  )
  select c.id, c.source, c.kind, c.breadcrumb, c.text, c.context,
         d.title, d.source_url, d.citation, d.effective_date,
         coalesce(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight
           + coalesce(1.0 / (rrf_k + s.rank_ix), 0.0) * semantic_weight as score
  from full_text ft
  full outer join semantic s on s.id = ft.id
  join public.rag_chunks c on c.id = coalesce(ft.id, s.id)
  join public.rag_documents d on d.source = c.source
  order by score desc, c.id
  limit least(greatest(match_count, 1), 50);
$$;

-- Server only. PostgREST exposes public functions to every role unless execute is taken away.
revoke execute on function public.kb_hybrid_search(text, extensions.vector, int, text[], double precision, double precision, int) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.kb_hybrid_search(text, extensions.vector, int, text[], double precision, double precision, int) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.kb_hybrid_search(text, extensions.vector, int, text[], double precision, double precision, int) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.kb_hybrid_search(text, extensions.vector, int, text[], double precision, double precision, int) to service_role;
  end if;
end $$;
