-- Run after 202611050001_fairshare.sql. Supabase Auth owns passwords and sessions;
-- this private application profile stores account details and preferences.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text check (email is null or length(email) <= 320),
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  timezone text not null default 'Australia/Sydney',
  email_verified_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profile_owner_read on public.profiles
  for select to authenticated using (id = (select auth.uid()));
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- Account creation and updates sync atomically. No client-supplied role or email
-- metadata is used for authorisation or as the authoritative email address.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.sync_auth_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (
    id, email, display_name, email_verified_at, last_sign_in_at, created_at
  ) values (
    new.id, new.email,
    coalesce(nullif(left(btrim(coalesce(new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')),80),''),'Housemate'),
    new.email_confirmed_at, new.last_sign_in_at, coalesce(new.created_at,now())
  ) on conflict (id) do update set
    email = excluded.email,
    email_verified_at = excluded.email_verified_at,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = now();
  -- Preserve the name/timezone chosen in account settings on subsequent logins.
  return new;
end $$;
revoke all on function private.sync_auth_profile() from public, anon, authenticated;
create trigger fairshare_auth_profile
  after insert or update of email, email_confirmed_at, last_sign_in_at, raw_user_meta_data
  on auth.users for each row execute function private.sync_auth_profile();

-- Include accounts created before this migration.
insert into public.profiles (id,email,display_name,email_verified_at,last_sign_in_at,created_at)
select id,email,
  coalesce(nullif(left(btrim(coalesce(raw_user_meta_data->>'display_name',
    raw_user_meta_data->>'full_name',raw_user_meta_data->>'name','')),80),''),'Housemate'),
  email_confirmed_at,last_sign_in_at,coalesce(created_at,now())
from auth.users on conflict (id) do nothing;

-- Login can repair a missing profile without accepting an arbitrary user ID.
create function private.ensure_profile() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare account auth.users; profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into account from auth.users where id=auth.uid();
  if account.id is null or account.email_confirmed_at is null then
    raise exception 'Verify your email address before continuing';
  end if;
  insert into public.profiles (id,email,display_name,email_verified_at,last_sign_in_at,created_at)
  values (account.id,account.email,
    coalesce(nullif(left(btrim(coalesce(account.raw_user_meta_data->>'display_name',
      account.raw_user_meta_data->>'full_name',account.raw_user_meta_data->>'name','')),80),''),'Housemate'),
    account.email_confirmed_at,account.last_sign_in_at,coalesce(account.created_at,now()))
  on conflict (id) do update set email=excluded.email,
    email_verified_at=excluded.email_verified_at,last_sign_in_at=excluded.last_sign_in_at
  returning * into profile;
  return to_jsonb(profile);
end $$;

create function private.update_profile(account_name text, account_timezone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if account_name is null or length(btrim(account_name)) not between 1 and 80 then
    raise exception 'Enter a name between 1 and 80 characters';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=account_timezone) then
    raise exception 'Choose a valid timezone';
  end if;
  perform private.ensure_profile();
  perform public.rate_limit('profile',30);
  update public.profiles set display_name=btrim(account_name),timezone=account_timezone,updated_at=now()
    where id=auth.uid() returning * into profile;
  return to_jsonb(profile);
end $$;
revoke all on function private.ensure_profile(), private.update_profile(text,text)
  from public, anon, authenticated;
grant execute on function private.ensure_profile(), private.update_profile(text,text)
  to authenticated;

-- Data API entry points use invoker privileges. Keep the privileged implementation
-- in a schema that is not exposed by PostgREST. All mutations remain caller-owned.
create function public.ensure_profile() returns jsonb
language sql security invoker set search_path = '' as $$
  select private.ensure_profile()
$$;
create function public.update_profile(account_name text, account_timezone text) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.update_profile(account_name,account_timezone)
$$;
revoke all on function public.ensure_profile(), public.update_profile(text,text) from public, anon, authenticated;
grant execute on function public.ensure_profile(), public.update_profile(text,text) to authenticated;
