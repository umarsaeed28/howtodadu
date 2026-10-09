-- Service orders: the four priced products (feasibility instant / reviewed, custom plan, permit) and
-- pre-approved plan requests. Guests can buy (owner_id null, matched by email when they sign up). Idempotent.
-- All writes go through server routes with the secret key; RLS only grants reads to the owner and admins.

create extension if not exists pgcrypto with schema extensions;

create table if not exists service_orders (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references auth.users(id) on delete set null,
  project_id        uuid references projects(id) on delete set null,
  email             text not null,
  parcel_pin        text not null,
  address           text not null default '',
  kind              text not null check (kind in ('feasibility_instant', 'feasibility_reviewed', 'custom_plan', 'permit', 'plan_request')),
  status            text not null default 'pending' check (status in ('pending', 'paid', 'in_progress', 'delivered', 'cancelled', 'failed')),
  amount_cents      int not null default 0,
  payment_provider  text,
  payment_id        text unique,
  paid_at           timestamptz,
  due_date          date,
  queue_week        date,          -- custom plans: the Monday their drafting week starts
  plan_id           text,          -- pre-approved plan id (plan requests) or the plan a permit uses
  firm              text,
  access_token      text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  data              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists service_orders_owner on service_orders(owner_id);
create index if not exists service_orders_email on service_orders(lower(email));
create index if not exists service_orders_pin on service_orders(parcel_pin);
create index if not exists service_orders_queue on service_orders(queue_week) where kind = 'custom_plan' and status <> 'cancelled';

alter table service_orders enable row level security;
drop policy if exists service_orders_read on service_orders;
create policy service_orders_read on service_orders for select using (owner_id = auth.uid() or public.app_role() = 'admin');
