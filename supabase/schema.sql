-- QuoteCraft production schema
-- Run once in the Supabase SQL editor. Safe to re-run where noted.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free','solo','studio')),
  subscription_status text not null default 'inactive',
  paddle_customer_id text unique,
  paddle_subscription_id text unique,
  subscription_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  total numeric(14,2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_user_updated_idx on public.quotes(user_id,updated_at desc);

create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  currency text not null default 'USD',
  accent_color text not null default '#174c36' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_profiles_user_idx on public.brand_profiles(user_id,created_at);

create or replace function public.handle_new_quotecraft_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
begin
  insert into public.profiles(id,email) values(new.id,new.email)
  on conflict (id) do update set email=excluded.email,updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_quotecraft on auth.users;
create trigger on_auth_user_created_quotecraft
after insert or update of email on auth.users
for each row execute procedure public.handle_new_quotecraft_user();

create or replace function public.current_quotecraft_plan(requested_user uuid)
returns text
language sql
stable
security definer set search_path=public
as $$
  select case
    when p.plan in ('solo','studio') and p.subscription_status in ('active','trialing') then p.plan
    else 'free'
  end
  from public.profiles p
  where p.id=requested_user and requested_user=auth.uid();
$$;

create or replace function public.can_create_quotecraft_quote(requested_user uuid)
returns boolean
language sql
stable
security definer set search_path=public
as $$
  select requested_user=auth.uid() and case
    when coalesce(public.current_quotecraft_plan(requested_user),'free')<>'free' then true
    else (select count(*) from public.quotes q where q.user_id=requested_user)<3
  end;
$$;

create or replace function public.can_create_quotecraft_brand(requested_user uuid)
returns boolean
language sql
stable
security definer set search_path=public
as $$
  select requested_user=auth.uid()
    and coalesce(public.current_quotecraft_plan(requested_user),'free')='studio'
    and (select count(*) from public.brand_profiles b where b.user_id=requested_user)<5;
$$;

revoke all on function public.current_quotecraft_plan(uuid) from public;
revoke all on function public.can_create_quotecraft_quote(uuid) from public;
revoke all on function public.can_create_quotecraft_brand(uuid) from public;
grant execute on function public.current_quotecraft_plan(uuid) to authenticated;
grant execute on function public.can_create_quotecraft_quote(uuid) to authenticated;
grant execute on function public.can_create_quotecraft_brand(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.quotes enable row level security;
alter table public.brand_profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid()=id);

drop policy if exists "quotes_select_own" on public.quotes;
create policy "quotes_select_own" on public.quotes for select to authenticated using (auth.uid()=user_id);
drop policy if exists "quotes_insert_own_with_plan_limit" on public.quotes;
create policy "quotes_insert_own_with_plan_limit" on public.quotes for insert to authenticated with check (auth.uid()=user_id and public.can_create_quotecraft_quote(auth.uid()));
drop policy if exists "quotes_update_own" on public.quotes;
create policy "quotes_update_own" on public.quotes for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "quotes_delete_own" on public.quotes;
create policy "quotes_delete_own" on public.quotes for delete to authenticated using (auth.uid()=user_id);

drop policy if exists "brands_select_studio_own" on public.brand_profiles;
create policy "brands_select_studio_own" on public.brand_profiles for select to authenticated using (auth.uid()=user_id and public.current_quotecraft_plan(auth.uid())='studio');
drop policy if exists "brands_insert_studio_own" on public.brand_profiles;
create policy "brands_insert_studio_own" on public.brand_profiles for insert to authenticated with check (auth.uid()=user_id and public.can_create_quotecraft_brand(auth.uid()));
drop policy if exists "brands_update_studio_own" on public.brand_profiles;
create policy "brands_update_studio_own" on public.brand_profiles for update to authenticated using (auth.uid()=user_id and public.current_quotecraft_plan(auth.uid())='studio') with check (auth.uid()=user_id);
drop policy if exists "brands_delete_studio_own" on public.brand_profiles;
create policy "brands_delete_studio_own" on public.brand_profiles for delete to authenticated using (auth.uid()=user_id and public.current_quotecraft_plan(auth.uid())='studio');

revoke all on table public.profiles from anon,authenticated;
grant select on table public.profiles to authenticated;
grant select,insert,update,delete on table public.quotes to authenticated;
grant select,insert,update,delete on table public.brand_profiles to authenticated;
grant all on table public.profiles,public.quotes,public.brand_profiles to service_role;

-- Backfill a profile for any users created before this schema was installed.
insert into public.profiles(id,email)
select id,email from auth.users
on conflict (id) do nothing;
