-- The browser never talks to Supabase (non-negotiable 5): RLS on, no policies, so only the
-- service role key held by Railway services can read or write.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'spatial_ref_sys'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
