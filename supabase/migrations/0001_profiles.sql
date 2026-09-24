-- Streak · Phase 1 · profiles
-- One row per auth user, created automatically on sign-up. Guests never reach Supabase.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  username     text unique,
  avatar_url   text,
  provider     text not null default 'email' check (provider in ('apple', 'google', 'email')),
  -- Null until the device reports it; the app falls back to the device time zone.
  time_zone    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

comment on table public.profiles is 'Public profile for each Streak user (1:1 with auth.users).';

-- ── Row Level Security: each person can read, create and update only their own row. ──
alter table public.profiles enable row level security;

create policy "Profiles are readable by their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Profiles are insertable by their owner"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Profiles are updatable by their owner"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No delete policy: rows are soft-deleted (deleted_at). Account deletion (Phase 4) runs in an
-- Edge Function with the service role, and `on delete cascade` removes the row with the auth user.

grant select, insert, update on public.profiles to authenticated;

-- ── Create a profile whenever a new auth user signs up. ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(nullif(new.raw_app_meta_data ->> 'provider', ''), 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Keep updated_at current on every update. ──
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
