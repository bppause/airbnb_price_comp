create extension if not exists pgcrypto;

create table if not exists public.user_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_properties_updated_at on public.user_properties;
create trigger trg_user_properties_updated_at
before update on public.user_properties
for each row
execute function public.set_updated_at();

alter table public.user_properties enable row level security;

drop policy if exists "Users can view their own properties" on public.user_properties;
create policy "Users can view their own properties"
on public.user_properties
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own properties" on public.user_properties;
create policy "Users can insert their own properties"
on public.user_properties
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own properties" on public.user_properties;
create policy "Users can update their own properties"
on public.user_properties
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own properties" on public.user_properties;
create policy "Users can delete their own properties"
on public.user_properties
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists idx_user_properties_user_slug
on public.user_properties (user_id, slug);
