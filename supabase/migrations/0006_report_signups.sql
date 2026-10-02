-- Report email wall: sign-ups that unlocked a feasibility report. Idempotent.
alter table signups drop constraint if exists signups_kind_check;
alter table signups add constraint signups_kind_check check (kind in ('newsletter', 'contact', 'report'));
