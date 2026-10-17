-- Rolls back 0013_plan_library.sql. Files in the plan-library bucket are not deleted here; empty the bucket first.
drop table if exists public.plan_files;
drop table if exists public.plan_sets;
drop table if exists public.admin_audit;
