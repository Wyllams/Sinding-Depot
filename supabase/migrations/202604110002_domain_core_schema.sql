create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'job_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.job_status as enum (
      'draft',
      'active',
      'on_hold',
      'completed',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'job_service_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.job_service_status as enum (
      'contracted',
      'pending_scheduling',
      'scheduled',
      'in_progress',
      'completed',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'assignment_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.assignment_status as enum (
      'planned',
      'assigned',
      'scheduled',
      'in_progress',
      'blocked',
      'completed',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'dependency_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.dependency_type as enum (
      'blocks_start',
      'blocks_completion',
      'recommended_sequence'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'specialty_proficiency'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.specialty_proficiency as enum (
      'primary',
      'secondary',
      'backup'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'blocker_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.blocker_type as enum (
      'customer',
      'permit',
      'material',
      'weather',
      'crew',
      'dependency',
      'document',
      'other'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'blocker_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.blocker_status as enum (
      'open',
      'resolved',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'document_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.document_type as enum (
      'contract',
      'permit',
      'insurance',
      'invoice',
      'change_order',
      'approval_attachment',
      'completion_certificate',
      'other'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'document_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.document_status as enum (
      'draft',
      'active',
      'archived',
      'voided'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'photo_category'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.photo_category as enum (
      'before',
      'during',
      'after',
      'issue',
      'completion',
      'change_order',
      'other'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'change_order_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.change_order_status as enum (
      'draft',
      'pending_customer_approval',
      'approved',
      'rejected',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'approval_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.approval_type as enum (
      'change_order',
      'schedule_window',
      'document_signature',
      'completion_certificate',
      'other'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'approval_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.approval_status as enum (
      'pending',
      'approved',
      'rejected',
      'expired',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'completion_certificate_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.completion_certificate_status as enum (
      'draft',
      'pending_customer_signature',
      'signed',
      'voided'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'sales_goal_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.sales_goal_type as enum (
      'revenue',
      'jobs_sold',
      'average_ticket'
    );
  end if;
end
$$;

create or replace function public.set_domain_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.validate_service_dependency()
returns trigger
language plpgsql
as $$
declare
  predecessor_job_id uuid;
  dependent_job_id uuid;
  predecessor_allows_dependencies boolean;
  dependent_allows_dependencies boolean;
begin
  if new.predecessor_job_service_id = new.dependent_job_service_id then
    raise exception 'Service dependency cannot reference the same job service twice';
  end if;

  select js.job_id, st.allows_dependencies
    into predecessor_job_id, predecessor_allows_dependencies
  from public.job_services js
  join public.service_types st on st.id = js.service_type_id
  where js.id = new.predecessor_job_service_id;

  select js.job_id, st.allows_dependencies
    into dependent_job_id, dependent_allows_dependencies
  from public.job_services js
  join public.service_types st on st.id = js.service_type_id
  where js.id = new.dependent_job_service_id;

  if predecessor_job_id is null or dependent_job_id is null then
    raise exception 'Both dependency endpoints must exist';
  end if;

  if predecessor_job_id <> dependent_job_id then
    raise exception 'Service dependencies must stay within the same job';
  end if;

  if coalesce(predecessor_allows_dependencies, false) is false
     or coalesce(dependent_allows_dependencies, false) is false then
    raise exception 'Dependencies are allowed only for dependency-capable service types';
  end if;

  return new;
end;
$$;

create or replace function public.validate_service_assignment_specialty()
returns trigger
language plpgsql
as $$
begin
  if new.specialty_id is null then
    raise exception 'Service assignments must declare the required specialty';
  end if;

  if new.crew_id is not null and not exists (
    select 1
    from public.crew_specialties cs
    where cs.crew_id = new.crew_id
      and cs.specialty_id = new.specialty_id
  ) then
    raise exception 'Assigned crew does not have the required specialty';
  end if;

  return new;
end;
$$;

create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  allows_dependencies boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint service_types_code_chk check (code = lower(code)),
  constraint service_types_code_key unique (code),
  constraint service_types_name_key unique (name)
);

create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint specialties_code_chk check (code = lower(code)),
  constraint specialties_code_key unique (code),
  constraint specialties_name_key unique (name)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  company_name text,
  email text not null,
  phone text not null,
  alternate_phone text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.salespersons (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  active boolean not null default true,
  hired_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  code text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint crews_code_key unique (code)
);

create table if not exists public.crew_specialties (
  crew_id uuid not null references public.crews (id) on delete cascade,
  specialty_id uuid not null references public.specialties (id) on delete cascade,
  proficiency public.specialty_proficiency not null default 'primary',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (crew_id, specialty_id)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  salesperson_id uuid references public.salespersons (id) on delete set null,
  job_number text not null,
  title text not null,
  description text,
  status public.job_status not null default 'draft',
  service_address_line_1 text not null,
  service_address_line_2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  contract_signed_at date,
  requested_start_date date,
  target_completion_date date,
  contract_amount numeric(12, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint jobs_job_number_key unique (job_number),
  constraint jobs_contract_amount_chk check (contract_amount is null or contract_amount >= 0),
  constraint jobs_target_date_chk check (
    target_completion_date is null
    or requested_start_date is null
    or target_completion_date >= requested_start_date
  )
);

create table if not exists public.job_services (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  service_type_id uuid not null references public.service_types (id) on delete restrict,
  scope_of_work text not null,
  status public.job_service_status not null default 'contracted',
  quantity numeric(10, 2),
  unit_of_measure text,
  contracted_amount numeric(12, 2),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint job_services_quantity_chk check (quantity is null or quantity > 0),
  constraint job_services_amount_chk check (contracted_amount is null or contracted_amount >= 0)
);

create table if not exists public.service_assignments (
  id uuid primary key default gen_random_uuid(),
  job_service_id uuid not null references public.job_services (id) on delete cascade,
  crew_id uuid references public.crews (id) on delete set null,
  specialty_id uuid not null references public.specialties (id) on delete restrict,
  status public.assignment_status not null default 'planned',
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  internal_notes text,
  customer_visible_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint service_assignments_schedule_chk check (
    scheduled_end_at is null
    or scheduled_start_at is null
    or scheduled_end_at >= scheduled_start_at
  ),
  constraint service_assignments_actual_chk check (
    actual_end_at is null
    or actual_start_at is null
    or actual_end_at >= actual_start_at
  )
);

create table if not exists public.service_dependencies (
  id uuid primary key default gen_random_uuid(),
  predecessor_job_service_id uuid not null references public.job_services (id) on delete cascade,
  dependent_job_service_id uuid not null references public.job_services (id) on delete cascade,
  dependency_type public.dependency_type not null default 'blocks_start',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint service_dependencies_unique_pair_key unique (
    predecessor_job_service_id,
    dependent_job_service_id,
    dependency_type
  )
);

create table if not exists public.blockers (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  job_service_id uuid references public.job_services (id) on delete cascade,
  service_assignment_id uuid references public.service_assignments (id) on delete cascade,
  type public.blocker_type not null,
  status public.blocker_status not null default 'open',
  title text not null,
  description text,
  customer_visible boolean not null default false,
  reported_by_profile_id uuid references public.profiles (id) on delete set null,
  resolved_by_profile_id uuid references public.profiles (id) on delete set null,
  reported_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blockers_resolution_chk check (
    resolved_at is null or resolved_at >= reported_at
  )
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  job_service_id uuid references public.job_services (id) on delete cascade,
  document_type public.document_type not null,
  status public.document_status not null default 'draft',
  title text not null,
  storage_path text not null,
  content_type text,
  uploaded_by_profile_id uuid references public.profiles (id) on delete set null,
  visible_to_customer boolean not null default false,
  visible_to_partner boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  job_service_id uuid references public.job_services (id) on delete cascade,
  service_assignment_id uuid references public.service_assignments (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  category public.photo_category not null default 'other',
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  uploaded_by_profile_id uuid references public.profiles (id) on delete set null,
  customer_visible boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  job_service_id uuid references public.job_services (id) on delete set null,
  title text not null,
  description text not null,
  status public.change_order_status not null default 'draft',
  requested_by_profile_id uuid references public.profiles (id) on delete set null,
  proposed_amount numeric(12, 2),
  approved_amount numeric(12, 2),
  requested_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint change_orders_proposed_amount_chk check (
    proposed_amount is null or proposed_amount >= 0
  ),
  constraint change_orders_approved_amount_chk check (
    approved_amount is null or approved_amount >= 0
  ),
  constraint change_orders_decided_at_chk check (
    decided_at is null or decided_at >= requested_at
  )
);

create table if not exists public.completion_certificates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  job_service_id uuid references public.job_services (id) on delete set null,
  certificate_number text not null,
  status public.completion_certificate_status not null default 'draft',
  summary text,
  issued_by_profile_id uuid references public.profiles (id) on delete set null,
  document_id uuid references public.documents (id) on delete set null,
  issued_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint completion_certificates_number_key unique (certificate_number),
  constraint completion_certificates_signed_at_chk check (
    signed_at is null or issued_at is null or signed_at >= issued_at
  )
);

create table if not exists public.customer_approvals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  job_service_id uuid references public.job_services (id) on delete set null,
  change_order_id uuid references public.change_orders (id) on delete cascade,
  completion_certificate_id uuid references public.completion_certificates (id) on delete cascade,
  approval_type public.approval_type not null,
  status public.approval_status not null default 'pending',
  requested_document_id uuid references public.documents (id) on delete set null,
  requested_by_profile_id uuid references public.profiles (id) on delete set null,
  notes text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_approvals_timestamps_chk check (
    approved_at is null
    or rejected_at is null
  )
);

create table if not exists public.sales_goals (
  id uuid primary key default gen_random_uuid(),
  salesperson_id uuid not null references public.salespersons (id) on delete cascade,
  goal_type public.sales_goal_type not null,
  period_start date not null,
  period_end date not null,
  target_value numeric(12, 2) not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sales_goals_period_chk check (period_end >= period_start),
  constraint sales_goals_target_value_chk check (target_value >= 0)
);

create table if not exists public.sales_snapshots (
  id uuid primary key default gen_random_uuid(),
  salesperson_id uuid not null references public.salespersons (id) on delete cascade,
  snapshot_date date not null,
  jobs_sold_count integer not null default 0,
  booked_revenue numeric(12, 2) not null default 0,
  approved_change_order_revenue numeric(12, 2) not null default 0,
  total_revenue numeric(12, 2) not null default 0,
  goal_attainment_pct numeric(5, 2),
  created_at timestamptz not null default timezone('utc', now()),
  constraint sales_snapshots_jobs_sold_count_chk check (jobs_sold_count >= 0),
  constraint sales_snapshots_booked_revenue_chk check (booked_revenue >= 0),
  constraint sales_snapshots_change_order_revenue_chk check (approved_change_order_revenue >= 0),
  constraint sales_snapshots_total_revenue_chk check (total_revenue >= 0),
  constraint sales_snapshots_goal_attainment_pct_chk check (
    goal_attainment_pct is null
    or goal_attainment_pct >= 0
  )
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null,
  entity_id uuid not null,
  job_id uuid references public.jobs (id) on delete set null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  actor_role public.app_role,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists service_types_set_updated_at on public.service_types;
create trigger service_types_set_updated_at
before update on public.service_types
for each row
execute function public.set_domain_updated_at();

drop trigger if exists specialties_set_updated_at on public.specialties;
create trigger specialties_set_updated_at
before update on public.specialties
for each row
execute function public.set_domain_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_domain_updated_at();

drop trigger if exists salespersons_set_updated_at on public.salespersons;
create trigger salespersons_set_updated_at
before update on public.salespersons
for each row
execute function public.set_domain_updated_at();

drop trigger if exists crews_set_updated_at on public.crews;
create trigger crews_set_updated_at
before update on public.crews
for each row
execute function public.set_domain_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row
execute function public.set_domain_updated_at();

drop trigger if exists job_services_set_updated_at on public.job_services;
create trigger job_services_set_updated_at
before update on public.job_services
for each row
execute function public.set_domain_updated_at();

drop trigger if exists service_assignments_set_updated_at on public.service_assignments;
create trigger service_assignments_set_updated_at
before update on public.service_assignments
for each row
execute function public.set_domain_updated_at();

drop trigger if exists blockers_set_updated_at on public.blockers;
create trigger blockers_set_updated_at
before update on public.blockers
for each row
execute function public.set_domain_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.set_domain_updated_at();

drop trigger if exists change_orders_set_updated_at on public.change_orders;
create trigger change_orders_set_updated_at
before update on public.change_orders
for each row
execute function public.set_domain_updated_at();

drop trigger if exists customer_approvals_set_updated_at on public.customer_approvals;
create trigger customer_approvals_set_updated_at
before update on public.customer_approvals
for each row
execute function public.set_domain_updated_at();

drop trigger if exists completion_certificates_set_updated_at on public.completion_certificates;
create trigger completion_certificates_set_updated_at
before update on public.completion_certificates
for each row
execute function public.set_domain_updated_at();

drop trigger if exists sales_goals_set_updated_at on public.sales_goals;
create trigger sales_goals_set_updated_at
before update on public.sales_goals
for each row
execute function public.set_domain_updated_at();

drop trigger if exists validate_service_dependencies on public.service_dependencies;
create trigger validate_service_dependencies
before insert or update on public.service_dependencies
for each row
execute function public.validate_service_dependency();

drop trigger if exists validate_service_assignment_specialty on public.service_assignments;
create trigger validate_service_assignment_specialty
before insert or update on public.service_assignments
for each row
execute function public.validate_service_assignment_specialty();

create unique index if not exists customers_email_lower_idx
  on public.customers (lower(email));

create unique index if not exists salespersons_email_lower_idx
  on public.salespersons (lower(email));

create index if not exists crew_specialties_specialty_idx
  on public.crew_specialties (specialty_id);

create index if not exists jobs_customer_status_idx
  on public.jobs (customer_id, status);

create index if not exists jobs_salesperson_status_idx
  on public.jobs (salesperson_id, status);

create index if not exists job_services_job_status_idx
  on public.job_services (job_id, status, sort_order);

create index if not exists job_services_service_type_idx
  on public.job_services (service_type_id);

create index if not exists service_assignments_crew_status_idx
  on public.service_assignments (crew_id, status);

create index if not exists service_assignments_specialty_status_idx
  on public.service_assignments (specialty_id, status);

create index if not exists service_assignments_schedule_idx
  on public.service_assignments (scheduled_start_at, scheduled_end_at);

create index if not exists service_dependencies_predecessor_idx
  on public.service_dependencies (predecessor_job_service_id);

create index if not exists blockers_job_status_idx
  on public.blockers (job_id, status, type);

create index if not exists blockers_assignment_idx
  on public.blockers (service_assignment_id);

create index if not exists documents_job_type_idx
  on public.documents (job_id, document_type, status);

create index if not exists photos_job_taken_at_idx
  on public.photos (job_id, taken_at desc);

create index if not exists photos_assignment_idx
  on public.photos (service_assignment_id);

create index if not exists change_orders_job_status_idx
  on public.change_orders (job_id, status, requested_at desc);

create unique index if not exists customer_approvals_change_order_idx
  on public.customer_approvals (change_order_id)
  where change_order_id is not null;

create unique index if not exists customer_approvals_completion_certificate_idx
  on public.customer_approvals (completion_certificate_id)
  where completion_certificate_id is not null;

create index if not exists customer_approvals_customer_status_idx
  on public.customer_approvals (customer_id, status, approval_type);

create index if not exists completion_certificates_job_status_idx
  on public.completion_certificates (job_id, status);

create unique index if not exists sales_goals_unique_period_idx
  on public.sales_goals (salesperson_id, goal_type, period_start, period_end);

create unique index if not exists sales_snapshots_salesperson_date_idx
  on public.sales_snapshots (salesperson_id, snapshot_date);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_table, entity_id, created_at desc);

create index if not exists audit_logs_job_created_idx
  on public.audit_logs (job_id, created_at desc);

insert into public.service_types (
  code,
  name,
  description,
  allows_dependencies
)
values
  ('siding', 'Siding', 'Exterior siding installation or replacement.', true),
  ('painting', 'Painting', 'Interior or exterior painting services.', true),
  ('decks', 'Decks', 'Deck installation, repair or expansion.', true),
  ('gutters', 'Gutters', 'Gutter installation or replacement.', true),
  ('roofing', 'Roofing', 'Roof repair or reroofing.', true),
  ('windows', 'Windows', 'Window installation or replacement.', true)
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      allows_dependencies = excluded.allows_dependencies,
      updated_at = timezone('utc', now());

insert into public.specialties (
  code,
  name,
  description
)
values
  ('siding_installation', 'Siding Installation', 'Crew specializes in siding installation.'),
  ('painting', 'Painting', 'Crew specializes in painting services.'),
  ('deck_building', 'Deck Building', 'Crew specializes in deck construction and repairs.'),
  ('gutters', 'Gutters', 'Crew specializes in gutter installation.'),
  ('roofing', 'Roofing', 'Crew specializes in roofing work.'),
  ('windows', 'Windows', 'Crew specializes in window installation.'),
  ('finish_carpentry', 'Finish Carpentry', 'Crew covers trim, details and finish work.')
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      updated_at = timezone('utc', now());

comment on table public.job_services
  is 'Servicos contratados por job. Nao representa atribuicao operacional nem scheduling de crew.';

comment on table public.service_assignments
  is 'Execucao operacional de um servico contratado. Permite agendamento, crew e specialty separados do contrato.';

comment on table public.service_dependencies
  is 'Dependencias opcionais entre servicos do mesmo job. So validadas para tipos de servico que aceitam dependencia.';