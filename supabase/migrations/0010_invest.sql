-- Invest feed: editable underwriting assumptions, daily feed snapshots, and the opportunities each client watches.
-- Idempotent. Reads of settings and snapshots are public (the feed is public); writes go through the server
-- (secret key) or, for settings, an admin. Watchlist rows belong to their owner.

create table if not exists invest_settings (
  id          int primary key default 1 check (id = 1),
  data        jsonb not null default '{}'::jsonb,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);
alter table invest_settings enable row level security;
drop policy if exists invest_settings_read on invest_settings;
create policy invest_settings_read on invest_settings for select using (true);
drop policy if exists invest_settings_admin on invest_settings;
create policy invest_settings_admin on invest_settings for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- One row per day: the ranked feed as of that run, so tiles can say "as of" and the next run can spot changes.
create table if not exists invest_snapshots (
  day           date primary key,
  generated_at  timestamptz not null default now(),
  source        text not null default '',
  data          jsonb not null default '[]'::jsonb
);
alter table invest_snapshots enable row level security;
drop policy if exists invest_snapshots_read on invest_snapshots;
create policy invest_snapshots_read on invest_snapshots for select using (true);

-- "Add to my project": an opportunity a client is watching, with the numbers as they were when saved.
create table if not exists watchlist (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  listing_id    text not null,
  parcel_pin    text,
  address       text not null default '',
  photo         text,
  status        text not null default 'watching' check (status in ('watching', 'archived')),
  snapshot      jsonb not null default '{}'::jsonb,   -- price, cash_on_cash_pct, cash_required, dadu_sqft, as_of
  alert         text check (alert in ('price_changed', 'off_market')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, listing_id)
);
create index if not exists watchlist_owner on watchlist(owner_id);
alter table watchlist enable row level security;
drop policy if exists watchlist_owner_all on watchlist;
create policy watchlist_owner_all on watchlist for all using (owner_id = auth.uid() or public.app_role() = 'admin') with check (owner_id = auth.uid());
