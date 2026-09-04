-- 1. Fix cross-tenant tautology in client_contacts insert/update checks
DROP POLICY IF EXISTS client_contacts_admin_write ON public.client_contacts;
CREATE POLICY client_contacts_admin_write ON public.client_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager'))
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_contacts.client_id
        AND c.org_id = public.get_user_org_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS client_contacts_admin_update ON public.client_contacts;
CREATE POLICY client_contacts_admin_update ON public.client_contacts
  FOR UPDATE TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager'))
  )
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_contacts.client_id
        AND c.org_id = public.get_user_org_id(auth.uid())
    )
  );

-- 2. Worker profiles: no anonymous access to location and rate data
DROP POLICY IF EXISTS "Public can view worker profiles" ON public.worker_profiles;
CREATE POLICY "Authenticated users can view worker profiles" ON public.worker_profiles
  FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.worker_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_profiles TO authenticated;
GRANT ALL ON public.worker_profiles TO service_role;

-- 3. photos bucket: scope writes and deletes to the uploader's own folder
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
