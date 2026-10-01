create type source_type as enum
  ('smc','rcw','commerce','ordinance','sdci_tip','directors_rule','opcd','aduniverse');

create table chunks (
  id              uuid primary key default gen_random_uuid(),
  section         text not null,              -- 'SMC 23.44.041.C.2'
  parent_path     text not null,              -- 'SMC 23.44.041 > C > 2'
  source_type     source_type not null,
  ordinance       text,
  effective_from  date not null,
  effective_to    date,                       -- aduniverse rows: day the 2025 NR code took effect
  zones           text[] not null default '{}',
  content         text not null,
  raw_path        text,                       -- Supabase Storage object of the source file
  fts             tsvector generated always as
                    (to_tsvector('english', parent_path || ' ' || content)) stored,
  embedding       vector(1024)                -- voyage-law-2
);
create index chunks_embedding_hnsw on chunks using hnsw (embedding vector_cosine_ops);
create index chunks_fts_gin        on chunks using gin (fts);
create index chunks_dates          on chunks (effective_from, effective_to);
create index chunks_zones_gin      on chunks using gin (zones);
create index chunks_section        on chunks (section);

-- Hybrid retrieval: vector + full text fused with RRF, filtered by zone and as_of_date, top 30.
-- Cross-reference expansion and rerank to 8 happen in packages/tools.
create or replace function match_chunks(
  query_text       text,
  query_embedding  vector(1024),
  zone_filter      text,
  as_of_date       date,
  match_count      int default 30,
  rrf_k            int default 60
)
returns table (id uuid, section text, parent_path text, source_type source_type,
               effective_from date, effective_to date, content text, rrf_score float)
language sql stable
as $$
  with live as (
    select * from chunks c
    where c.effective_from <= as_of_date
      and (c.effective_to is null or c.effective_to > as_of_date)
      and (zone_filter is null or cardinality(c.zones) = 0 or zone_filter = any (c.zones))
  ),
  vec as (
    select id, row_number() over (order by embedding <=> query_embedding) as r
    from live where embedding is not null
    order by embedding <=> query_embedding
    limit match_count * 2
  ),
  fts as (
    select id, row_number() over (order by ts_rank_cd(fts, q) desc) as r
    from live, websearch_to_tsquery('english', query_text) q
    where fts @@ q
    order by ts_rank_cd(fts, q) desc
    limit match_count * 2
  ),
  fused as (
    select coalesce(vec.id, fts.id) as id,
           coalesce(1.0 / (rrf_k + vec.r), 0) + coalesce(1.0 / (rrf_k + fts.r), 0) as rrf_score
    from vec full outer join fts on vec.id = fts.id
  )
  select l.id, l.section, l.parent_path, l.source_type, l.effective_from, l.effective_to,
         l.content, f.rrf_score
  from fused f join live l on l.id = f.id
  order by f.rrf_score desc
  limit match_count;
$$;
