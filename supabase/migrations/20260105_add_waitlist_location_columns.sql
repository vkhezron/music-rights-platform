begin;

alter table public.waitlist_requests
  add column if not exists country text default 'unspecified',
  add column if not exists city text;

update public.waitlist_requests
set country = coalesce(country, 'unspecified');

alter table public.waitlist_requests
  alter column country set not null,
  alter column country drop default;

commit;
