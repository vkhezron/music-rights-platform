-- Add work type and production metadata columns to works
alter table public.works
  add column if not exists work_type text not null default 'standard',
  add column if not exists is_100_percent_human boolean not null default false,
  add column if not exists uses_sample_libraries boolean not null default false,
  add column if not exists sample_library_names text,
  add column if not exists has_commercial_license boolean not null default false,
  add column if not exists original_works jsonb default '[]'::jsonb;

-- Ensure existing rows get defaults applied
update public.works
set work_type = coalesce(work_type, 'standard'),
    is_100_percent_human = coalesce(is_100_percent_human, false),
    uses_sample_libraries = coalesce(uses_sample_libraries, false),
    has_commercial_license = coalesce(has_commercial_license, false),
    original_works = coalesce(original_works, '[]'::jsonb)
where true;
