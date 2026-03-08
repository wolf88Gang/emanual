-- Fix infinite recursion on platform_admins by replacing self-referencing policy
DROP POLICY IF EXISTS "Platform admins can view all" ON public.platform_admins;

CREATE POLICY "Platform admins can view all"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));