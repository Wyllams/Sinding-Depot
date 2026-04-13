-- Migration 010: Module 9 - Document Storage and Secure Views

-- 1. Insert bucket 'documents' if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- 2. Partner secure views without financial info
create or replace view public.partner_visible_change_orders as
  select
    id,
    job_id,
    job_service_id,
    title,
    description,
    status,
    requested_by_profile_id,
    requested_at,
    decided_at,
    created_at,
    updated_at
  from public.change_orders;

grant select on public.partner_visible_change_orders to authenticated;

create or replace view public.partner_visible_job_services as
  select
    id,
    job_id,
    service_type_id,
    scope_of_work,
    status,
    quantity,
    unit_of_measure,
    sort_order,
    created_at,
    updated_at
  from public.job_services;

grant select on public.partner_visible_job_services to authenticated;
