-- Rolls back 0012_knowledge_base.sql. The 0005 tables and their data stay.
drop function if exists public.kb_hybrid_search(text, extensions.vector, int, text[], double precision, double precision, int);
drop index if exists public.rag_chunks_kind;
drop index if exists public.rag_chunks_fts;
alter table public.rag_chunks drop column if exists fts;
delete from public.rag_chunks where embedding is null;
alter table public.rag_chunks alter column embedding set not null;
alter table public.rag_chunks drop column if exists context;
alter table public.rag_documents
  drop column if exists retrieved_at,
  drop column if exists effective_date,
  drop column if exists publisher,
  drop column if exists citation,
  drop column if exists source_url;
