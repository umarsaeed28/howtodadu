-- Purchases: one row every time money changes hands (an order paid, a permit package paid, a subscription invoice,
-- a refund as a negative amount). service_orders stays the order record; this is the money ledger the admin's
-- revenue page reads. Written by server routes with the secret key; admins read it through RLS. Idempotent.

create table if not exists purchases (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  -- order (a priced product bought at checkout), permit (the portal's permit package), subscription (a newsletter
  -- invoice), refund (negative amount, refers to the original by payment_id in meta)
  kind             text not null check (kind in ('order', 'permit', 'subscription', 'refund')),
  -- the product sold: feasibility_instant, feasibility_reviewed, custom_plan, permit, permit_package, newsletter
  product          text not null,
  amount_cents     bigint not null,
  currency         text not null default 'usd',
  email            text,
  user_id          uuid references auth.users(id) on delete set null,
  order_id         uuid references service_orders(id) on delete set null,
  project_id       uuid references projects(id) on delete set null,
  payment_provider text,
  -- the provider's payment id (Stripe payment intent / invoice, or the mock id): one purchase per payment
  payment_id       text unique,
  meta             jsonb not null default '{}'::jsonb
);
create index if not exists purchases_created on purchases(created_at desc);
create index if not exists purchases_email on purchases(lower(email));
create index if not exists purchases_user on purchases(user_id);
create index if not exists purchases_product on purchases(product);

alter table purchases enable row level security;
drop policy if exists purchases_admin_read on purchases;
create policy purchases_admin_read on purchases for select using (public.app_role() = 'admin');
