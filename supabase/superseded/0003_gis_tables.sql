-- All geometry stored in EPSG:2926 (WA State Plane North, US feet). Area and distance math stays in 2926.
-- Every table carries pulled_at; gis_layer_sync holds the layer's last edit date.

create table parcels (
  objectid      bigint,
  pin           text not null,
  zone          text,
  lot_area_sf   numeric,
  ex_area       numeric,                      -- respect when dissolving split polygons
  basement_sf   numeric,
  year_built    int,
  geom          geometry(MultiPolygon, 2926) not null,
  pulled_at     timestamptz not null default now()
);
create index parcels_pin  on parcels (pin);
create index parcels_geom on parcels using gist (geom);

create table zoning (
  objectid   bigint,
  zone       text not null,
  geom       geometry(MultiPolygon, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index zoning_geom on zoning using gist (geom);

create table building_outlines (
  objectid   bigint,
  geom       geometry(MultiPolygon, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index building_outlines_geom on building_outlines using gist (geom);

create type street_kind as enum ('arterial','residential','alley','other');
create table streets (
  objectid   bigint,
  name       text,
  kind       street_kind not null default 'other',
  geom       geometry(MultiLineString, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index streets_geom on streets using gist (geom);

create table right_of_way (
  objectid   bigint,
  geom       geometry(MultiPolygon, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index right_of_way_geom on right_of_way using gist (geom);

-- One table for all ECA types so eca_overlap() can report % per type
create type eca_type as enum
  ('steep_slope','known_slide','potential_slide','riparian','wetland',
   'liquefaction','peat_settlement','flood','landfill','fish_wildlife');
create table eca (
  objectid   bigint,
  eca_type   eca_type not null,
  geom       geometry(MultiPolygon, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index eca_type_idx on eca (eca_type);
create index eca_geom on eca using gist (geom);

create table tree_canopy (
  objectid   bigint,
  source     text not null,                   -- 'sdci_protected' | 'sdot' | 'canopy'
  geom       geometry(MultiPolygon, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index tree_canopy_geom on tree_canopy using gist (geom);

create table transit_areas (
  kind       text not null check (kind in ('hb1110_half_mile','frequent_transit')),
  geom       geometry(MultiPolygon, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index transit_areas_geom on transit_areas using gist (geom);

create table shoreline (
  objectid   bigint,
  environment text,
  geom       geometry(MultiPolygon, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index shoreline_geom on shoreline using gist (geom);

-- Site risk extras
create table utility_layers (
  kind       text not null check (kind in ('low_fire_flow','retaining_wall','side_sewer')),
  geom       geometry(Geometry, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index utility_layers_geom on utility_layers using gist (geom);

-- Existing permitted ADUs, used as market comps
create table existing_adus (
  objectid   bigint,
  kind       text not null check (kind in ('dadu','aadu')),
  geom       geometry(Point, 2926) not null,
  pulled_at  timestamptz not null default now()
);
create index existing_adus_geom on existing_adus using gist (geom);

-- Precomputed from the WA DNR Lidar DEM, one row per parcel
create table parcel_slope (
  pin              text primary key,
  rear_avg_pct     numeric,
  rear_max_pct     numeric,
  dem_resolution_ft numeric,
  pulled_at        timestamptz not null default now()
);

-- Legacy cross-check only. Never a source of truth.
create table aduniverse_parcels (
  pin        text primary key,
  factors    jsonb not null,
  frozen_as_of date not null default '2021-01-01'
);

create table report_cache (
  pin           text not null,
  data_as_of    timestamptz not null,
  report        jsonb not null,
  created_at    timestamptz not null default now(),
  primary key (pin, data_as_of)
);
create index report_cache_created on report_cache (created_at);
-- 7-day TTL is enforced on read: created_at > now() - interval '7 days'
