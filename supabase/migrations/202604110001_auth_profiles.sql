create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.app_role as enum (
      'admin',
      'salesperson',
      'partner',
      'customer'
    );
  end if;
end
$$;

create or replace function public.parse_app_role(role_text text)
returns public.app_role
language plpgsql
immutable
as $$
begin
  case lower(coalesce(role_text, 'customer'))
    when 'admin' then
      return 'admin'::public.app_role;
    when 'salesperson' then
      return 'salesperson'::public.app_role;
    when 'partner' then
      return 'partner'::public.app_role;
    else
      return 'customer'::public.app_role;
  end case;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin'::public.app_role, false);
$$;

create or replace function public.can_access_financials()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in (
      'admin'::public.app_role,
      'salesperson'::public.app_role
    ),
    false
  );
$$;

create or replace function public.can_access_internal_scheduling()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin'::public.app_role, false);
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    public.parse_app_role(new.raw_user_meta_data ->> 'role')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when public.profiles.full_name = '' then excluded.full_name
          else public.profiles.full_name
        end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

create or replace function public.protect_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.app_role;
begin
  actor_role := public.current_user_role();

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new.id <> old.id then
    raise exception 'Profile id is immutable';
  end if;

  if auth.uid() <> old.id and actor_role is distinct from 'admin'::public.app_role then
    raise exception 'Only admins can update another profile';
  end if;

  if new.role <> old.role and actor_role is distinct from 'admin'::public.app_role then
    raise exception 'Only admins can change roles';
  end if;

  if lower(new.email) <> lower(old.email)
     and actor_role is distinct from 'admin'::public.app_role then
    raise exception 'Only admins can change profile email';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_updates on public.profiles;
create trigger protect_profile_updates
before update on public.profiles
for each row
execute function public.protect_profile_updates();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_admin()
);

drop policy if exists profiles_insert_self_or_admin on public.profiles;
create policy profiles_insert_self_or_admin
on public.profiles
for insert
with check (
  auth.uid() = id
  or public.is_admin()
);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
using (
  auth.uid() = id
  or public.is_admin()
)
with check (
  auth.uid() = id
  or public.is_admin()
);

drop policy if exists profiles_delete_admin_only on public.profiles;
create policy profiles_delete_admin_only
on public.profiles
for delete
using (public.is_admin());

grant select, insert, update on public.profiles to authenticated;

comment on function public.current_user_role()
  is 'Role helper para RLS em jobs, documentos, financeiro e scheduling.';

comment on function public.can_access_financials()
  is 'Admin e salesperson podem acessar superficies financeiras permitidas.';

comment on function public.can_access_internal_scheduling()
  is 'Clientes nao acessam scheduling interno; admin possui acesso total.';