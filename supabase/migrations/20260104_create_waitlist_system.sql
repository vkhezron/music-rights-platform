begin;

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists public.waitlist_requests (
  id uuid primary key default gen_random_uuid(),
  contact_method text not null check (contact_method in ('instagram', 'telegram')),
  contact_handle text not null,
  contact_handle_normalized citext not null,
  role text not null,
  role_description text not null,
  status text not null default 'pending' check (status in ('pending', 'invited', 'converted', 'archived')),
  invite_code text,
  invited_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists waitlist_requests_contact_unique_idx
  on public.waitlist_requests (contact_method, contact_handle_normalized);

create index if not exists waitlist_requests_status_idx
  on public.waitlist_requests (status);

create or replace function public.waitlist_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger trg_waitlist_set_updated_at
before update on public.waitlist_requests
for each row execute function public.waitlist_set_updated_at();

alter table public.waitlist_requests enable row level security;

drop policy if exists "Waitlist insert for anon" on public.waitlist_requests;

create policy "Waitlist insert for anon"
  on public.waitlist_requests
  for insert
  to anon
  with check (true);

drop policy if exists "Waitlist full access for service role" on public.waitlist_requests;

create policy "Waitlist full access for service role"
  on public.waitlist_requests
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.waitlist_public_metrics()
returns table (
  waitlist_total bigint,
  user_total bigint,
  rights_holder_total bigint,
  work_total bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.waitlist_requests) as waitlist_total,
    (select count(*) from public.profiles) as user_total,
    (select count(*) from public.rights_holders) as rights_holder_total,
    (select count(*) from public.works) as work_total;
$$;

revoke all on function public.waitlist_public_metrics() from public;
grant execute on function public.waitlist_public_metrics() to anon;
grant execute on function public.waitlist_public_metrics() to authenticated;

drop function if exists public.waitlist_mark_invited(text, text);
drop function if exists public.waitlist_mark_invited(text, text, text);
drop function if exists public.waitlist_mark_converted(text);
drop function if exists public.waitlist_mark_converted(text, text);

create or replace function public.waitlist_mark_invited(
  p_contact_method text,
  p_contact_handle text,
  p_invite_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_handle text;
begin
  normalized_handle := lower(regexp_replace(p_contact_handle, '\s+', '', 'g'));
  normalized_handle := regexp_replace(normalized_handle, '^@+', '');

  if p_contact_method not in ('instagram', 'telegram') then
    raise exception 'Unsupported contact method %', p_contact_method;
  end if;

  update public.waitlist_requests
     set status = 'invited',
         invite_code = p_invite_code,
         invited_at = timezone('utc', now())
   where contact_method = p_contact_method
     and (contact_handle_normalized = normalized_handle or contact_handle = p_contact_handle);
end;
$$;

create or replace function public.waitlist_mark_converted(
  p_contact_method text,
  p_contact_handle text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_handle text;
begin
  normalized_handle := lower(regexp_replace(p_contact_handle, '\s+', '', 'g'));
  normalized_handle := regexp_replace(normalized_handle, '^@+', '');

  if p_contact_method not in ('instagram', 'telegram') then
    raise exception 'Unsupported contact method %', p_contact_method;
  end if;

  update public.waitlist_requests
     set status = 'converted',
         converted_at = timezone('utc', now())
   where contact_method = p_contact_method
     and (contact_handle_normalized = normalized_handle or contact_handle = p_contact_handle);
end;
$$;

revoke all on function public.waitlist_mark_invited(text, text, text) from public;
revoke all on function public.waitlist_mark_converted(text, text) from public;

grant execute on function public.waitlist_mark_invited(text, text, text) to service_role;
grant execute on function public.waitlist_mark_converted(text, text) to service_role;

commit;
