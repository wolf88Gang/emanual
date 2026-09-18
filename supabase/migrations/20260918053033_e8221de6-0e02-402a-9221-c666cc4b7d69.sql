CREATE OR REPLACE FUNCTION public.can_view_worker(_worker_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL AND (
      _worker_id = auth.uid()
      OR public.is_platform_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.job_applications ja
        JOIN public.job_postings jp ON jp.id = ja.job_id
        WHERE ja.worker_id = _worker_id
          AND (jp.created_by = auth.uid() OR jp.org_id = public.get_user_org_id(auth.uid()))
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.user_id = _worker_id
          AND tm.org_id = public.get_user_org_id(auth.uid())
      )
    )
$$;

REVOKE ALL ON FUNCTION public.can_view_worker(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_worker(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can view worker profiles" ON public.worker_profiles;
CREATE POLICY "Scoped worker profile reads" ON public.worker_profiles
  FOR SELECT TO authenticated
  USING (public.can_view_worker(user_id));

DROP POLICY IF EXISTS "Authenticated users can view ratings" ON public.job_ratings;
CREATE POLICY "Scoped rating reads" ON public.job_ratings
  FOR SELECT TO authenticated
  USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR public.can_view_worker(to_user_id)
  );

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Signed-in users can read platform settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.platform_settings FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_user_org_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon;