-- Plan library: architectural drawing sets the admin uploads (src/lib/server/plan-library.ts), their files in a
-- private bucket, and what extraction read from them. Admin-only: RLS on with no policies, so only the server's
-- secret key reads or writes. Also a small admin audit log for actions on it. Idempotent.

create table if not exists public.plan_sets (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  title            text not null,
  folder_path      text not null default '',        -- the uploaded folder, e.g. '2024/Ballard/123 Main St'
  tags             text[] not null default '{}',     -- folder segments, plus anything the admin adds
  address          text,
  neighborhood     text,
  lat              double precision,
  lng              double precision,
  permit_number    text,
  built            boolean,
  build_cost_cents bigint check (build_cost_cents is null or build_cost_cents >= 0),
  permit_days      int check (permit_days is null or permit_days >= 0),
  -- internal: reference only; precedent: may be shown as a precedent; template: may be the basis for new plans
  license          text not null default 'internal' check (license in ('internal', 'precedent', 'template')),
  status           text not null default 'uploaded' check (status in ('uploaded', 'extracting', 'needs_correction', 'verified', 'failed')),
  status_note      text,
  draft_model      jsonb,                            -- what extraction read (BuildingModel)
  model            jsonb,                            -- the corrected model; the corpus reads this once verified
  verified_at      timestamptz,
  created_by       text
);
create index if not exists plan_sets_status on public.plan_sets (status, created_at desc);
create index if not exists plan_sets_location on public.plan_sets (lat, lng) where lat is not null and lng is not null;

create table if not exists public.plan_files (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid not null references public.plan_sets (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  name          text not null,
  rel_path      text not null,                      -- path inside the uploaded folder
  storage_path  text not null unique,               -- object path in the plan-library bucket
  size_bytes    bigint not null check (size_bytes >= 0),
  uploaded      boolean not null default false,
  page_count    int,
  pdf_kind      text check (pdf_kind in ('vector', 'scanned', 'mixed')),
  sheets        jsonb not null default '[]'::jsonb, -- [{page, kind, title, by}]
  extracted     jsonb,                              -- this file's BuildingModel
  status        text not null default 'uploaded' check (status in ('uploaded', 'extracting', 'needs_correction', 'verified', 'failed')),
  error         text
);
create index if not exists plan_files_set on public.plan_files (set_id);
create index if not exists plan_files_status on public.plan_files (status) where status in ('uploaded', 'extracting');

-- Who did what in the admin, for the actions that change data.
create table if not exists public.admin_audit (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  actor   text not null,
  action  text not null,
  target  text,
  meta    jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_at on public.admin_audit (at desc);

alter table public.plan_sets   enable row level security;
alter table public.plan_files  enable row level security;
alter table public.admin_audit enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.plan_sets, public.plan_files, public.admin_audit from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.plan_sets, public.plan_files, public.admin_audit from authenticated;
  end if;
end $$;

-- Private bucket: PDFs only, up to 100 MB each. Reached only through signed URLs the server issues to the admin.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('plan-library', 'plan-library', false, 104857600, array['application/pdf'])
    on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;
