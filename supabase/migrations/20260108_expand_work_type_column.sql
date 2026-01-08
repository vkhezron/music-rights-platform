-- Allow longer work type names beyond 10 characters
alter table public.works
  alter column work_type type text
  using work_type::text;

-- Ensure default remains standard
alter table public.works
  alter column work_type set default 'standard';
