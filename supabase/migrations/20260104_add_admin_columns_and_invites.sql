-- Adds admin-related columns to profiles and introduces admin_invites table.
-- Also provides a helper function and row level security policies for admin access.

-- 1. Extend profiles with admin/deactivation flags.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_deactivated boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

ALTER TABLE public.profiles
  ALTER COLUMN is_admin SET DEFAULT false,
  ALTER COLUMN is_deactivated SET DEFAULT false;

-- Ensure existing rows respect the new defaults.
UPDATE public.profiles
   SET is_admin = COALESCE(is_admin, false),
       is_deactivated = COALESCE(is_deactivated, false)
 WHERE true;

-- 2. Helper function to reuse admin checks in policies.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT p.is_admin
              FROM public.profiles p
             WHERE p.id = auth.uid()
        ),
        false
    );
$$;

-- 3. Admin invites table for waitlist bypass codes.
CREATE TABLE IF NOT EXISTS public.admin_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    claimed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    expires_at timestamptz,
    claimed_at timestamptz,
    revoked_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes for frequent lookups.
CREATE INDEX IF NOT EXISTS admin_invites_code_idx ON public.admin_invites (code);
CREATE INDEX IF NOT EXISTS admin_invites_expires_at_idx ON public.admin_invites (expires_at);
CREATE INDEX IF NOT EXISTS admin_invites_created_by_idx ON public.admin_invites (created_by);
CREATE INDEX IF NOT EXISTS admin_invites_active_idx
  ON public.admin_invites (expires_at)
  WHERE claimed_at IS NULL AND revoked_at IS NULL;

-- Ensure updated_at stays in sync without relying on application code.
CREATE OR REPLACE FUNCTION public.set_admin_invites_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_admin_invites_updated_at ON public.admin_invites;
CREATE TRIGGER set_admin_invites_updated_at
  BEFORE UPDATE ON public.admin_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_admin_invites_updated_at();

-- 4. Enable row level security if not already on.
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Policies granting admins controlled access.
DROP POLICY IF EXISTS admin_manage_admin_invites ON public.admin_invites;
CREATE POLICY admin_manage_admin_invites
  ON public.admin_invites
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS admin_select_profiles ON public.profiles;
CREATE POLICY admin_select_profiles
  ON public.profiles
  FOR SELECT
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS admin_update_profiles ON public.profiles;
CREATE POLICY admin_update_profiles
  ON public.profiles
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Note: existing user-specific policies remain untouched to avoid regressions.
-- Superuser seeding for admins should be handled via a separate migration or manual update.
