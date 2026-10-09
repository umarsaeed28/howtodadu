-- Rollback for 0011_purchases.sql. Run by hand; the Supabase GitHub integration only applies the up migrations.
drop policy if exists purchases_admin_read on purchases;
drop table if exists purchases;
