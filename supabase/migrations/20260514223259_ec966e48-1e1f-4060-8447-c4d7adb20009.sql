-- Allow platform admins to manage subscriptions
CREATE POLICY "Platform admins can update any subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert any subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));