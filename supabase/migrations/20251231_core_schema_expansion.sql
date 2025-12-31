-- Core schema expansion to align work splits and protocol metadata
-- Migration: 20251231_core_schema_expansion
BEGIN;

-- Neighbouring functions lookup -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.neighbouring_functions (
  id serial PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('instrument', 'voice', 'recording')),
  function_name text NOT NULL UNIQUE,
  display_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.neighbouring_functions IS 'Lookup table for neighbouring rights functions (instruments, voice types, recording roles).';
COMMENT ON COLUMN public.neighbouring_functions.type IS 'Category of neighbouring function (instrument, voice, recording).';
COMMENT ON COLUMN public.neighbouring_functions.function_name IS 'Human-readable name for the neighbouring function.';
COMMENT ON COLUMN public.neighbouring_functions.display_order IS 'Order hint for grouping and sorting neighbouring functions.';

CREATE INDEX IF NOT EXISTS idx_neighbouring_functions_type ON public.neighbouring_functions(type);
CREATE INDEX IF NOT EXISTS idx_neighbouring_functions_active ON public.neighbouring_functions(is_active);

-- CMO / PRO lookup --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cmo_pro_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  acronym text UNIQUE,
  organization_type text NOT NULL CHECK (organization_type IN ('CMO', 'PRO', 'BOTH')),
  country text,
  website text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cmo_pro_organizations IS 'Lookup table for Collective Management Organizations and Performing Rights Organizations.';
COMMENT ON COLUMN public.cmo_pro_organizations.organization_type IS 'Classification for the organization: CMO, PRO, or BOTH.';
COMMENT ON COLUMN public.cmo_pro_organizations.country IS 'Two-letter ISO 3166-1 alpha country code.';

CREATE INDEX IF NOT EXISTS idx_cmo_pro_organizations_type ON public.cmo_pro_organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_cmo_pro_organizations_country ON public.cmo_pro_organizations(country);
CREATE INDEX IF NOT EXISTS idx_cmo_pro_organizations_active ON public.cmo_pro_organizations(is_active);

-- Work splits enhancements ------------------------------------------------------
ALTER TABLE public.work_splits
  ADD COLUMN IF NOT EXISTS contribution_types jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.work_splits.contribution_types IS 'Stores contribution flags (melody, harmony, arrangement) for music splits.';
COMMENT ON COLUMN public.work_splits.roles IS 'Stores neighbouring roles captured for a split (values align with neighbouring_functions.function_name).';

CREATE INDEX IF NOT EXISTS idx_work_splits_contribution_types ON public.work_splits USING gin(contribution_types);
CREATE INDEX IF NOT EXISTS idx_work_splits_roles ON public.work_splits USING gin(roles);

-- Works / Protocols metadata ----------------------------------------------------
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS catalog_number text,
  ADD COLUMN IF NOT EXISTS ean text;

ALTER TABLE public.protocols
  ADD COLUMN IF NOT EXISTS catalog_number text,
  ADD COLUMN IF NOT EXISTS ean text;

COMMENT ON COLUMN public.works.catalog_number IS 'Internal catalog number (e.g., CN-24-12-31-0001).';
COMMENT ON COLUMN public.works.ean IS 'European Article Number for distribution.';
COMMENT ON COLUMN public.protocols.catalog_number IS 'Internal catalog number mirrored from works.';
COMMENT ON COLUMN public.protocols.ean IS 'European Article Number captured during protocol submission.';

CREATE INDEX IF NOT EXISTS idx_works_catalog_number ON public.works(catalog_number);
CREATE INDEX IF NOT EXISTS idx_works_ean ON public.works(ean);
CREATE INDEX IF NOT EXISTS idx_protocols_catalog_number ON public.protocols(catalog_number);
CREATE INDEX IF NOT EXISTS idx_protocols_ean ON public.protocols(ean);

-- Work creation declarations ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_creation_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('ip', 'mixing', 'mastering', 'session_musicians', 'visuals')),
  creation_type text NOT NULL CHECK (creation_type IN ('human', 'ai_assisted', 'ai_generated')),
  ai_tool text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_creation_declarations_unique_work_section UNIQUE (work_id, section)
);

COMMENT ON TABLE public.work_creation_declarations IS 'Tracks creation context for each work section, including AI usage.';
COMMENT ON COLUMN public.work_creation_declarations.section IS 'Work section (ip, mixing, mastering, session_musicians, visuals).';
COMMENT ON COLUMN public.work_creation_declarations.creation_type IS 'How the section was created: human, ai_assisted, ai_generated.';

CREATE INDEX IF NOT EXISTS idx_work_creation_declarations_work_id ON public.work_creation_declarations(work_id);
CREATE INDEX IF NOT EXISTS idx_work_creation_declarations_section ON public.work_creation_declarations(section);
CREATE INDEX IF NOT EXISTS idx_work_creation_declarations_creation_type ON public.work_creation_declarations(creation_type);

-- Helper functions and triggers -------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_neighbouring_functions_updated_at ON public.neighbouring_functions;
CREATE TRIGGER trg_neighbouring_functions_updated_at
  BEFORE UPDATE ON public.neighbouring_functions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cmo_pro_organizations_updated_at ON public.cmo_pro_organizations;
CREATE TRIGGER trg_cmo_pro_organizations_updated_at
  BEFORE UPDATE ON public.cmo_pro_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_work_creation_declarations_updated_at ON public.work_creation_declarations;
CREATE TRIGGER trg_work_creation_declarations_updated_at
  BEFORE UPDATE ON public.work_creation_declarations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.generate_catalog_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  today_prefix text;
  next_seq integer;
BEGIN
  today_prefix := to_char(current_date, 'YY-MM-DD');
  SELECT COALESCE(MAX(CAST(substring(catalog_number FROM 'CN-\d{2}-\d{2}-\d{2}-(\d{4})') AS integer)), 0) + 1
    INTO next_seq
    FROM public.works
    WHERE catalog_number LIKE 'CN-' || today_prefix || '%';
  RETURN 'CN-' || today_prefix || '-' || lpad(next_seq::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_split_totals(p_work_id uuid, p_split_type text)
RETURNS TABLE(is_valid boolean, total numeric, message text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(ownership_percentage), 0)
    INTO v_total
    FROM public.work_splits
    WHERE work_id = p_work_id
      AND split_type = p_split_type
      AND is_active IS NOT FALSE;

  IF v_total = 100 THEN
    RETURN QUERY SELECT true, v_total, 'Splits total exactly 100%'::text;
  ELSIF v_total < 100 THEN
    RETURN QUERY SELECT false, v_total, format('Splits total %s%% (missing %s%%)', v_total, 100 - v_total);
  ELSE
    RETURN QUERY SELECT false, v_total, format('Splits total %s%% (over by %s%%)', v_total, v_total - 100);
  END IF;
END;
$$;

COMMIT;
