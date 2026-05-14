-- 1. Remove public enumeration of invites
DROP POLICY IF EXISTS "Anyone can read active invites by code" ON public.team_invites;
DROP POLICY IF EXISTS "Anyone can read active invites by code" ON public.client_invites;

-- 2. Fix elevation_transects manage policy (org-scoped)
DROP POLICY IF EXISTS "Owners and managers can manage transects" ON public.elevation_transects;
CREATE POLICY "Owners and managers can manage transects"
ON public.elevation_transects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.estates e
    JOIN public.profiles p ON p.org_id = e.org_id
    WHERE e.id = elevation_transects.estate_id
      AND p.id = auth.uid()
      AND (public.has_role(auth.uid(), 'owner'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.estates e
    JOIN public.profiles p ON p.org_id = e.org_id
    WHERE e.id = elevation_transects.estate_id
      AND p.id = auth.uid()
      AND (public.has_role(auth.uid(), 'owner'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role))
  )
);

-- 3. Storage: restrict asset-photos writes to org members of the asset
-- Filename convention: "asset-photos/<asset_uuid>-<timestamp>.<ext>"
CREATE OR REPLACE FUNCTION public.user_can_write_asset_photo(_path text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assets a
    JOIN public.estates e ON e.id = a.estate_id
    JOIN public.profiles p ON p.org_id = e.org_id
    WHERE p.id = _user_id
      AND a.id::text = substring(_path from '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
  )
$$;

DROP POLICY IF EXISTS "Authenticated users can upload asset photos" ON storage.objects;
CREATE POLICY "Org members can upload asset photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'asset-photos'
  AND public.user_can_write_asset_photo(name, auth.uid())
);

DROP POLICY IF EXISTS "Users can delete asset photos they uploaded" ON storage.objects;
CREATE POLICY "Org members can delete asset photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'asset-photos'
  AND public.user_can_write_asset_photo(name, auth.uid())
);