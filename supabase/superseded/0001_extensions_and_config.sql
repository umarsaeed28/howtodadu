-- Extensions
create extension if not exists postgis;
create extension if not exists vector;
create extension if not exists pg_trgm;

-- Sync bookkeeping: every GIS value traces to a layer and a pull date (non-negotiable 4)
create table gis_layer_sync (
  layer_key        text primary key,          -- e.g. 'parcel_geo', 'eca_steep_slope'
  service          text not null,             -- ArcGIS service name
  layer_id         int  not null,             -- resolved from ?f=pjson at sync time, never hard-coded
  feature_count    int,
  layer_last_edit  timestamptz,               -- "Data Last Edit Date" from the service
  pulled_at        timestamptz not null default now()
);

-- Tunable numbers. Code thresholds live in `rules`, not here.
create table config (
  key         text primary key,
  value       jsonb not null,
  note        text,
  updated_at  timestamptz not null default now()
);
insert into config (key, value, note) values
  ('cost_per_sf', '350', 'USD per buildable sf, construction only'),
  ('min_access_width_ft', '12', 'Construction heuristic, not code'),
  ('exceptional_tree_diameter_in', '30', 'PLACEHOLDER: confirm against SMC 25.11 before use'),
  ('slope_thresholds', '{"moderate_pct": 15, "steep_pct": 40}', 'PLACEHOLDER: confirm against SMC ECA steep slope definition'),
  ('deductions', '{}', 'Scoring deductions per risk key; populated with the scoring work'),
  ('score_bands', '{"feasible_min": 70, "conditional_min": 40}', null);

-- Code thresholds, current SMC only. ADUniverse-era rules never enter this table.
create table rules (
  id              bigserial primary key,
  zone            text not null,
  rule_key        text not null,
  value           numeric not null,
  unit            text not null,
  smc_section     text not null,
  effective_from  date not null,
  effective_to    date,
  unique (zone, rule_key, effective_from)
);
create index rules_lookup on rules (zone, rule_key, effective_from desc);
