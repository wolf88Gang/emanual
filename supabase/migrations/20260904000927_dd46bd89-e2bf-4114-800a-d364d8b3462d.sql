DROP POLICY IF EXISTS "Public can view ratings" ON public.job_ratings;
CREATE POLICY "Authenticated users can view ratings" ON public.job_ratings
  FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.job_ratings FROM anon;
GRANT SELECT ON public.job_ratings TO authenticated;
GRANT ALL ON public.job_ratings TO service_role;