-- Client portal: accounts, projects and the four stages (acquire, feasibility, permit, build). Idempotent.
--
-- Roles live on profiles.role: client (owns projects), admin (sees and edits everything), gc (a partner
-- contractor who sees only the projects referred to them). A row in portal_admins or gc_partners makes a
-- new sign-up an admin or a GC; everyone else is a client. Row-level security enforces the roles; the
-- website's server actions use the signed-in user's client, and the secret key only for storage and seeds.

-- ---------------------------------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'client' check (role in ('client', 'admin', 'gc')),
  created_at  timestamptz not null default now()
);

-- Emails that become admins when they sign up (seeded by scripts/seed-portal.ts).
create table if not exists portal_admins (
  email  text primary key
);

create table if not exists gc_partners (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete set null,
  company       text not null,
  contact_name  text not null default '',
  email         text not null unique,
  phone         text not null default '',
  -- Lead routing tags: which budgets, parts of town and cottage sizes this builder takes.
  budget_tiers  text[] not null default '{}',
  areas         text[] not null default '{}',
  size_tiers    text[] not null default '{}',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when exists (select 1 from public.portal_admins a where lower(a.email) = lower(coalesce(new.email, ''))) then 'admin'
      when exists (select 1 from public.gc_partners g where lower(g.email) = lower(coalesce(new.email, ''))) then 'gc'
      else 'client'
    end
  )
  on conflict (id) do nothing;
  update public.gc_partners set user_id = new.id
    where lower(email) = lower(coalesce(new.email, '')) and user_id is null;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The signed-in user's role, for policies. Security definer so it can read profiles under RLS.
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_gc_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.gc_partners where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------------------------------
-- Projects and stages
-- ---------------------------------------------------------------------------------------------------
create table if not exists projects (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  address             text,                 -- null while the client is asking for help finding a lot
  parcel_id           text,
  stage               text not null default 'acquire' check (stage in ('acquire', 'feasibility', 'permit', 'build')),
  lot_help_requested  boolean not null default false,
  lot_help_notes      text not null default '',
  brokerage_fee_cents int not null default 0,  -- revenue when Pencil helped buy the lot
  selected_gc_id      uuid references gc_partners(id) on delete set null,
  build_status        text check (build_status in ('contract_signed', 'foundation', 'framing', 'mep', 'inspections', 'final', 'certificate_of_occupancy')),
  latest_update       text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists projects_owner on projects(owner_id);
create index if not exists projects_stage on projects(stage);

create table if not exists feasibility_reports (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects(id) on delete cascade,
  score             int not null,
  verdict           text not null,
  max_dadu_sf       int,
  buildable_area_sf int,
  summary           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists feasibility_reports_project on feasibility_reports(project_id, created_at desc);

create table if not exists permit_packages (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null unique references projects(id) on delete cascade,
  status            text not null default 'kickoff' check (status in ('kickoff', 'design_options', 'client_approval', 'drawings', 'submitted', 'corrections', 'approved')),
  fee_cents         int not null,
  payment_id        text,
  paid_at           timestamptz,
  correction_rounds int not null default 0,
  submitted_at      timestamptz,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  name         text not null,
  path         text not null,                -- object path in the project-files bucket
  kind         text not null default 'other' check (kind in ('drawing', 'city_letter', 'other')),
  size_bytes   int not null default 0,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists files_project on files(project_id, created_at desc);

create table if not exists design_options (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  file_id      uuid references files(id) on delete set null,
  status       text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected')),
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists design_options_project on design_options(project_id);

create table if not exists build_requests (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null unique references projects(id) on delete cascade,
  budget_tier        text not null check (budget_tier in ('under_250k', '250k_400k', 'over_400k')),
  timeline           text not null default '',
  finishes           text not null default '',
  financing          text not null default '',
  area               text not null default '' ,
  size_tier          text not null default 'medium' check (size_tier in ('small', 'medium', 'large')),
  disclosure_ack_at  timestamptz not null,   -- the referral-fee disclosure checkbox, with its time
  created_at         timestamptz not null default now()
);

create table if not exists referrals (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  gc_id                 uuid not null references gc_partners(id) on delete cascade,
  agreement_note        text not null default '',
  contract_value_cents  int,
  fee_type              text not null default 'percent' check (fee_type in ('percent', 'flat')),
  fee_value             numeric not null default 0,  -- percent of the contract, or flat dollars
  status                text not null default 'referred' check (status in ('referred', 'bid', 'won', 'lost', 'paid')),
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  unique (project_id, gc_id)
);

create table if not exists bids (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  gc_id           uuid not null references gc_partners(id) on delete cascade,
  amount_cents    int not null,
  timeline_weeks  int not null,
  notes           text not null default '',
  status          text not null default 'submitted' check (status in ('submitted', 'selected', 'declined')),
  created_at      timestamptz not null default now(),
  unique (project_id, gc_id)
);

create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  kind        text not null,       -- stage_change, status_change, file, bid, approval, payment, note
  message     text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists activity_log_project on activity_log(project_id, created_at desc);

-- ---------------------------------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------------------------------
alter table profiles            enable row level security;
alter table portal_admins       enable row level security;
alter table gc_partners         enable row level security;
alter table projects            enable row level security;
alter table feasibility_reports enable row level security;
alter table permit_packages     enable row level security;
alter table files               enable row level security;
alter table design_options      enable row level security;
alter table build_requests      enable row level security;
alter table referrals           enable row level security;
alter table bids                enable row level security;
alter table activity_log        enable row level security;

-- Can the signed-in user see this project? Owner, admin, or a GC it was referred to.
create or replace function public.can_see_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects pr
    where pr.id = p
      and (pr.owner_id = auth.uid()
           or public.app_role() = 'admin'
           or exists (select 1 from public.referrals r where r.project_id = p and r.gc_id = public.my_gc_id()))
  )
$$;

create or replace function public.owns_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects pr where pr.id = p and (pr.owner_id = auth.uid() or public.app_role() = 'admin'))
$$;

drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (id = auth.uid() or app_role() = 'admin');
drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for update using (app_role() = 'admin');

drop policy if exists portal_admins_read on portal_admins;
create policy portal_admins_read on portal_admins for select using (app_role() = 'admin');

drop policy if exists gc_partners_read on gc_partners;
-- Everyone signed in can read builders: clients compare bids by company name.
create policy gc_partners_read on gc_partners for select using (auth.uid() is not null);
drop policy if exists gc_partners_admin on gc_partners;
create policy gc_partners_admin on gc_partners for all using (app_role() = 'admin') with check (app_role() = 'admin');

drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (can_see_project(id));
drop policy if exists projects_insert on projects;
create policy projects_insert on projects for insert with check (owner_id = auth.uid() or app_role() = 'admin');
drop policy if exists projects_update on projects;
create policy projects_update on projects for update using (owns_project(id));
drop policy if exists projects_gc_update on projects;
-- A referred GC updates the build tracker on the projects they won.
create policy projects_gc_update on projects for update using (selected_gc_id = my_gc_id());

drop policy if exists feas_select on feasibility_reports;
create policy feas_select on feasibility_reports for select using (can_see_project(project_id));
drop policy if exists feas_insert on feasibility_reports;
create policy feas_insert on feasibility_reports for insert with check (owns_project(project_id));

drop policy if exists permit_select on permit_packages;
create policy permit_select on permit_packages for select using (can_see_project(project_id));
drop policy if exists permit_write on permit_packages;
create policy permit_write on permit_packages for all using (owns_project(project_id)) with check (owns_project(project_id));

drop policy if exists files_select on files;
create policy files_select on files for select using (can_see_project(project_id));
drop policy if exists files_write on files;
create policy files_write on files for all using (owns_project(project_id)) with check (owns_project(project_id));

drop policy if exists design_select on design_options;
create policy design_select on design_options for select using (can_see_project(project_id));
drop policy if exists design_write on design_options;
create policy design_write on design_options for all using (owns_project(project_id)) with check (owns_project(project_id));

drop policy if exists build_req_select on build_requests;
create policy build_req_select on build_requests for select using (can_see_project(project_id));
drop policy if exists build_req_write on build_requests;
create policy build_req_write on build_requests for all using (owns_project(project_id)) with check (owns_project(project_id));

drop policy if exists referrals_select on referrals;
create policy referrals_select on referrals for select using (can_see_project(project_id));
drop policy if exists referrals_admin on referrals;
create policy referrals_admin on referrals for all using (app_role() = 'admin') with check (app_role() = 'admin');

drop policy if exists bids_select on bids;
create policy bids_select on bids for select using (can_see_project(project_id));
drop policy if exists bids_gc_insert on bids;
create policy bids_gc_insert on bids for insert with check (gc_id = my_gc_id() and can_see_project(project_id));
drop policy if exists bids_gc_update on bids;
create policy bids_gc_update on bids for update using (gc_id = my_gc_id());
drop policy if exists bids_owner_update on bids;
create policy bids_owner_update on bids for update using (owns_project(project_id));

drop policy if exists activity_select on activity_log;
create policy activity_select on activity_log for select using (can_see_project(project_id));
drop policy if exists activity_insert on activity_log;
create policy activity_insert on activity_log for insert with check (can_see_project(project_id));

-- ---------------------------------------------------------------------------------------------------
-- Files live in a private bucket; the server signs every upload and download after the RLS check above.
-- ---------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;
