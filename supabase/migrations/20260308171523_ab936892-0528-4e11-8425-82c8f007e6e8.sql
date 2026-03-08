
-- Platform admins need to read organizations, profiles, estates, subscriptions
-- Add SELECT policies for platform admins

CREATE POLICY "Platform admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can view all estates"
ON public.estates
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));
