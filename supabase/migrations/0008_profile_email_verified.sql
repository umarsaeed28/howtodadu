-- Sign-up no longer sends a confirmation email (accounts are created confirmed). Verifying the email is an
-- optional step on the Account page; this records when the user did it. Idempotent.
alter table profiles add column if not exists email_verified_at timestamptz;

-- Users may edit their own name (and nothing else) from the Account page.
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.app_role());  -- app_role() is security definer: no RLS recursion, and the role cannot change
