-- Adjust the name_required constraint to recognize nickname/profile based identities
ALTER TABLE public.rights_holders
DROP CONSTRAINT IF EXISTS name_required;

ALTER TABLE public.rights_holders
ADD CONSTRAINT name_required CHECK (
  COALESCE(
    NULLIF(TRIM(first_name), ''),
    NULLIF(TRIM(last_name), ''),
    NULLIF(TRIM(company_name), ''),
    NULLIF(TRIM(nickname), '')
  ) IS NOT NULL
  OR profile_id IS NOT NULL
);
