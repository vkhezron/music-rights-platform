-- Provides aggregated metrics for the admin overview dashboard.
-- Requires caller to have admin privileges via public.is_current_user_admin().

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_overview_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  weekly jsonb := '[]'::jsonb;
  result jsonb;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  WITH weeks AS (
    SELECT generate_series(
             date_trunc('week', (now() - interval '5 weeks')),
             date_trunc('week', now()),
             interval '1 week'
           ) AS week_start
  ),
  signups AS (
    SELECT date_trunc('week', created_at) AS week_start,
           COUNT(*) AS total
      FROM public.profiles
     GROUP BY 1
  )
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'week', to_char(w.week_start, 'YYYY-MM-DD'),
               'count', COALESCE(s.total, 0)
             )
             ORDER BY w.week_start
           ),
           '[]'::jsonb
         )
    INTO weekly
    FROM weeks w
    LEFT JOIN signups s ON s.week_start = w.week_start;

  WITH work_flags AS (
    SELECT w.id,
           COALESCE(BOOL_OR(cd.creation_type = 'ai_assisted'), false) AS has_ai_assisted,
           COALESCE(BOOL_OR(cd.creation_type = 'ai_generated'), false) AS has_ai_generated
      FROM public.works w
      LEFT JOIN public.work_creation_declarations cd ON cd.work_id = w.id
     GROUP BY w.id
  ),
  completed_splits AS (
    SELECT DISTINCT work_id
      FROM public.work_splits
     WHERE is_active IS DISTINCT FROM FALSE
     GROUP BY work_id, split_type
    HAVING COALESCE(SUM(ownership_percentage), 0) = 100
  )
  SELECT jsonb_build_object(
           'totalUsers', (SELECT COUNT(*) FROM public.profiles),
           'activeUsers', (
             SELECT COUNT(*)
               FROM public.profiles
              WHERE COALESCE(is_deactivated, false) = false
                AND updated_at >= now() - interval '30 days'
           ),
           'deactivatedUsers', (
             SELECT COUNT(*)
               FROM public.profiles
              WHERE COALESCE(is_deactivated, false) = true
           ),
           'worksWithCompleteSplits', (
             SELECT COUNT(*) FROM completed_splits
           ),
           'worksHumanOnly', (
             SELECT COUNT(*)
               FROM work_flags wf
              WHERE wf.has_ai_assisted = false
                AND wf.has_ai_generated = false
           ),
           'worksAiAssisted', (
             SELECT COUNT(*)
               FROM work_flags wf
              WHERE wf.has_ai_assisted = true
                AND wf.has_ai_generated = false
           ),
           'worksAiGenerated', (
             SELECT COUNT(*)
               FROM work_flags wf
              WHERE wf.has_ai_generated = true
           ),
           'weeklySignups', weekly
         )
    INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.admin_overview_snapshot() IS 'Returns aggregated metrics and weekly signup counts for the admin dashboard.';

COMMIT;
