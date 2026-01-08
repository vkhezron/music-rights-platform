-- Add structured language metadata columns for works
alter table public.works
  add column if not exists primary_languages jsonb not null default '[]'::jsonb,
  add column if not exists secondary_languages jsonb not null default '[]'::jsonb;

-- Normalize null values to empty arrays
update public.works
set primary_languages = coalesce(primary_languages, '[]'::jsonb),
    secondary_languages = coalesce(secondary_languages, '[]'::jsonb)
where primary_languages is null
   or secondary_languages is null;

-- Backfill language selections from the legacy text array when available
with language_seed as (
  select
    id,
    languages,
    case
      when languages is null or array_length(languages, 1) = 0 then '[]'::jsonb
      else jsonb_build_array(
        jsonb_build_object(
          'language', languages[1],
          'iso_639_1', null,
          'iso_639_3', null,
          'is_custom', true
        )
      )
    end as primary_json,
    case
      when languages is null or array_length(languages, 1) <= 1 then '[]'::jsonb
      else (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'language', lang,
              'iso_639_1', null,
              'iso_639_3', null,
              'is_custom', true
            )
          ),
          '[]'::jsonb
        )
        from unnest(languages[2:array_length(languages, 1)]) as lang
      )
    end as secondary_json
  from public.works
)
update public.works as w
set primary_languages = case
      when coalesce(jsonb_array_length(w.primary_languages), 0) = 0 then seed.primary_json
      else w.primary_languages
    end,
    secondary_languages = case
      when coalesce(jsonb_array_length(w.secondary_languages), 0) = 0 then seed.secondary_json
      else w.secondary_languages
    end
from language_seed as seed
where w.id = seed.id;
