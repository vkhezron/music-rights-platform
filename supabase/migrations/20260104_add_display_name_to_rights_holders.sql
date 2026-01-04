-- Add display name support for rights holders so API can accept the new field
ALTER TABLE public.rights_holders
  ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN public.rights_holders.display_name IS 'Public-facing name for a rights holder (stage name, company name, etc.).';

-- Backfill from the cleanest existing label we have available
UPDATE public.rights_holders
SET display_name = COALESCE(
  NULLIF(nickname, ''),
  NULLIF(company_name, ''),
  NULLIF(CONCAT_WS(' ', NULLIF(first_name, ''), NULLIF(last_name, '')), '')
)
WHERE display_name IS NULL OR display_name = '';
