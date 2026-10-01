# Supabase

Project region: us-west-2. Apply migrations in order with `supabase db push`.
RLS is on for every table with no policies, so only the service role key (Railway only) can access data.
Migrations are unverified against a live Postgres: run them on a scratch project first.
