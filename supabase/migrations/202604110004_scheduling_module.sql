-- =============================================================================
-- Migration 004: Scheduling Module — Enum expansion + RLS
-- =============================================================================

-- 1. Expand assignment_status for review workflow
alter type public.assignment_status add value if not exists 'pending_review';
alter type public.assignment_status add value if not exists 'rework_required';

-- 2. Expand blocker_type with Siding Depot specific types
alter type public.blocker_type add value if not exists 'windows_pending';
alter type public.blocker_type add value if not exists 'doors_pending';
alter type public.blocker_type add value if not exists 'financing_pending';
alter type public.blocker_type add value if not exists 'hoa_pending';
alter type public.blocker_type add value if not exists 'electrician_pending';
alter type public.blocker_type add value if not exists 'customer_unreachable';

-- 3. RLS on service_assignments
alter table public.service_assignments enable row level security;

drop policy if exists sa_admin_all on public.service_assignments;
create policy sa_admin_all
  on public.service_assignments
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists sa_partner_select on public.service_assignments;
create policy sa_partner_select
  on public.service_assignments
  for select
  using (
    public.current_user_role() = 'partner'::public.app_role
    and crew_id in (
      select id from public.crews where profile_id = auth.uid()
    )
  );

drop policy if exists sa_partner_update_status on public.service_assignments;
create policy sa_partner_update_status
  on public.service_assignments
  for update
  using (
    public.current_user_role() = 'partner'::public.app_role
    and crew_id in (
      select id from public.crews where profile_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'partner'::public.app_role
    and crew_id in (
      select id from public.crews where profile_id = auth.uid()
    )
  );

grant select, insert, update on public.service_assignments to authenticated;

-- 4. RLS on blockers
alter table public.blockers enable row level security;

drop policy if exists blockers_admin_all on public.blockers;
create policy blockers_admin_all
  on public.blockers
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists blockers_partner_select on public.blockers;
create policy blockers_partner_select
  on public.blockers
  for select
  using (
    public.current_user_role() = 'partner'::public.app_role
    and service_assignment_id in (
      select id from public.service_assignments
      where crew_id in (
        select id from public.crews where profile_id = auth.uid()
      )
    )
  );

-- Partner can open blockers on their own assignments
drop policy if exists blockers_partner_insert on public.blockers;
create policy blockers_partner_insert
  on public.blockers
  for insert
  with check (
    public.current_user_role() = 'partner'::public.app_role
    and service_assignment_id in (
      select id from public.service_assignments
      where crew_id in (
        select id from public.crews where profile_id = auth.uid()
      )
    )
  );

grant select, insert, update on public.blockers to authenticated;

-- 5. RLS on service_dependencies (admin read + write, partner read)
alter table public.service_dependencies enable row level security;

drop policy if exists sd_admin_all on public.service_dependencies;
create policy sd_admin_all
  on public.service_dependencies
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists sd_authenticated_select on public.service_dependencies;
create policy sd_authenticated_select
  on public.service_dependencies
  for select
  using (auth.uid() is not null);

grant select on public.service_dependencies to authenticated;
