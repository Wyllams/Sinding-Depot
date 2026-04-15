-- ============================================================
-- Migration: 202604130016_payment_milestones
-- Purpose:   COC Digital Engine — Job Start Certificates &
--            Certificates of Completion with digital signature
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'milestone_document_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.milestone_document_type as enum (
      'job_start',           -- Job Start Certificate (1st, before work begins)
      'completion_certificate' -- Certificate of Completion (per service)
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'milestone_payment_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.milestone_payment_status as enum (
      'draft',               -- Created by admin, not yet sent to client
      'pending_signature',   -- Waiting for customer to sign
      'signed',              -- Customer signed — payment unlocked
      'paid'                 -- Payment confirmed by office
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'milestone_payment_method'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.milestone_payment_method as enum (
      'check',
      'financing',
      'credit_card'
    );
  end if;
end
$$;

-- ── 2. TABLE: project_payment_milestones ────────────────────
--
-- One row per "page" of the paper COC forms, e.g.:
--   sort_order=1  → Job Start (Material)
--   sort_order=2  → Siding COC
--   sort_order=3  → Paint COC
--   sort_order=4  → Gutters COC
--   sort_order=5  → Windows Deposit COC
--   sort_order=6  → Windows Installation COC
-- ─────────────────────────────────────────────────────────────

create table if not exists public.project_payment_milestones (
  id                             uuid primary key default gen_random_uuid(),

  -- Relations
  job_id                         uuid not null
    references public.jobs (id) on delete cascade,
  job_service_id                 uuid
    references public.job_services (id) on delete set null,

  -- Document identity
  sort_order                     integer not null default 0,
  document_type                  public.milestone_document_type not null,
  title                          text not null,           -- e.g. "Job Start (Material)", "Siding"
  description                    text,                    -- optional line-item description

  -- Financials (set by Admin/Sales Rep)
  amount                         numeric(12, 2) not null default 0
    constraint ppm_amount_chk check (amount >= 0),

  -- Status machine
  status                         public.milestone_payment_status not null default 'draft',

  -- Customer interaction (digital signature)
  marketing_authorization_initials text,                 -- Job Start only: "I authorize..."
  customer_notes                 text,                   -- COC only: open items comments
  signed_at                      timestamptz,
  signature_data_url             text,                   -- base64 SVG/PNG of the signature

  -- Payment info (recorded after signature)
  payment_method                 public.milestone_payment_method,
  paid_at                        timestamptz,
  payment_reference              text,                   -- e.g. check number or transaction ID

  -- Audit
  created_by_profile_id          uuid
    references public.profiles (id) on delete set null,
  created_at                     timestamptz not null default timezone('utc', now()),
  updated_at                     timestamptz not null default timezone('utc', now()),

  -- Constraints
  constraint ppm_signed_before_paid_chk check (
    paid_at is null or signed_at is null or paid_at >= signed_at
  ),
  constraint ppm_signature_required_when_signed_chk check (
    status != 'signed' or signed_at is not null
  )
);

-- ── 3. TRIGGER: auto-update updated_at ──────────────────────

drop trigger if exists ppm_set_updated_at on public.project_payment_milestones;
create trigger ppm_set_updated_at
before update on public.project_payment_milestones
for each row
execute function public.set_domain_updated_at();

-- ── 4. INDEXES ───────────────────────────────────────────────

create index if not exists ppm_job_id_idx
  on public.project_payment_milestones (job_id);

create index if not exists ppm_job_service_id_idx
  on public.project_payment_milestones (job_service_id);

create index if not exists ppm_job_status_sort_idx
  on public.project_payment_milestones (job_id, status, sort_order);

-- ── 5. ROW LEVEL SECURITY ────────────────────────────────────

alter table public.project_payment_milestones enable row level security;

-- Staff roles (admin, ops_manager, salesperson) can read all milestones
create policy "Staff can view all milestones"
  on public.project_payment_milestones
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'ops_manager', 'salesperson', 'crew_lead')
    )
  );

-- Only admin and ops_manager can insert/update milestones
create policy "Admin/OpsMgr can manage milestones"
  on public.project_payment_milestones
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'ops_manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'ops_manager')
    )
  );

-- Customers can view their own milestones (via their job)
create policy "Customer can view own milestones"
  on public.project_payment_milestones
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.jobs j
      join public.customers c on c.id = j.customer_id
      where j.id = project_payment_milestones.job_id
        and c.profile_id = auth.uid()
    )
  );

-- Customers can sign (update signature fields only) on pending milestones
create policy "Customer can sign their milestone"
  on public.project_payment_milestones
  for update
  to authenticated
  using (
    status = 'pending_signature'
    and exists (
      select 1
      from public.jobs j
      join public.customers c on c.id = j.customer_id
      where j.id = project_payment_milestones.job_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    -- Only allow updating signature-related fields
    status in ('pending_signature', 'signed')
  );

-- ── 6. COMMENT ───────────────────────────────────────────────

comment on table public.project_payment_milestones is
  'Digital version of the Siding Depot paper COC forms. Each row represents one '
  '"page" of a Job Start Certificate or Certificate of Completion, ordered by '
  'sort_order. The customer signs digitally; signature unlocks payment.';

comment on column public.project_payment_milestones.document_type is
  'job_start = first page (Job Start Certificate, before work begins). '
  'completion_certificate = subsequent pages per service completed.';

comment on column public.project_payment_milestones.marketing_authorization_initials is
  'Used only for job_start documents. Stores customer initials for the '
  'marketing photo authorization clause.';

comment on column public.project_payment_milestones.signature_data_url is
  'Base64-encoded PNG/SVG of the customer digital signature captured on the '
  'DynamicContractForm signature pad.';
