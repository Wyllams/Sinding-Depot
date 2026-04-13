alter table public.jobs
  add column if not exists is_flagged boolean not null default false;
