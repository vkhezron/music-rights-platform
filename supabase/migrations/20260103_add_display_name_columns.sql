-- Add display name support with normalized keys while preserving existing records.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS display_name_normalized text;

-- Helper to collapse whitespace while preserving original casing.
CREATE OR REPLACE FUNCTION public.clean_display_name(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
SELECT CASE
  WHEN $1 IS NULL THEN NULL
  ELSE NULLIF(trim(regexp_replace($1, '\s+', ' ', 'g')), '')
END;
$$;

-- Helper to produce consistent normalized keys for uniqueness checks.
CREATE OR REPLACE FUNCTION public.normalize_display_name(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
SELECT CASE
  WHEN $1 IS NULL THEN NULL
  ELSE lower(trim(regexp_replace($1, '\s+', ' ', 'g')))
END;
$$;

-- Ensure normalized key is refreshed whenever the display name changes.
CREATE OR REPLACE FUNCTION public.set_profiles_display_name_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.display_name IS NULL THEN
    NEW.display_name_normalized := NULL;
    RETURN NEW;
  END IF;

  NEW.display_name := public.clean_display_name(NEW.display_name);

  IF NEW.display_name IS NULL THEN
    NEW.display_name_normalized := NULL;
    RETURN NEW;
  END IF;

  NEW.display_name_normalized := public.normalize_display_name(NEW.display_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_display_name_columns ON public.profiles;
CREATE TRIGGER set_profiles_display_name_columns
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profiles_display_name_columns();

-- Backfill: seed display_name from the cleanest existing label available.
WITH candidates AS (
  SELECT
    id,
    public.clean_display_name(
      COALESCE(NULLIF(display_name, ''), NULLIF(nickname, ''), NULLIF(username, ''))
    ) AS target_display_name
  FROM public.profiles
)
UPDATE public.profiles AS p
SET display_name = c.target_display_name
FROM candidates AS c
WHERE p.id = c.id
  AND c.target_display_name IS NOT NULL
  AND (p.display_name IS NULL OR trim(p.display_name) = '');

-- Normalize all populated display names.
UPDATE public.profiles
SET display_name_normalized = public.normalize_display_name(display_name)
WHERE display_name IS NOT NULL;

-- Resolve duplicates by appending a deterministic suffix before enforcing uniqueness.
WITH duplicates AS (
  SELECT
    id,
    display_name,
    display_name_normalized,
    ROW_NUMBER() OVER (PARTITION BY display_name_normalized ORDER BY created_at, id) AS rn
  FROM public.profiles
  WHERE display_name_normalized IS NOT NULL
),
updates AS (
  SELECT
    id,
    display_name || ' #' || rn AS new_display_name
  FROM duplicates
  WHERE rn > 1
)
UPDATE public.profiles AS p
SET display_name = u.new_display_name,
    display_name_normalized = public.normalize_display_name(u.new_display_name)
FROM updates AS u
WHERE p.id = u.id;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_normalized_unique
  ON public.profiles (display_name_normalized)
  WHERE display_name_normalized IS NOT NULL;

COMMIT;
