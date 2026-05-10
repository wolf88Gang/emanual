
-- 1. user_roles: scope owner role management to own org
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
CREATE POLICY "Owners can manage roles in own org"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.org_id = public.get_user_org_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.org_id = public.get_user_org_id(auth.uid())
  )
);

-- 2. plant_instances: scope manage policy to org via assets/estates
DROP POLICY IF EXISTS "Owners/Managers can manage plant instances" ON public.plant_instances;
CREATE POLICY "Owners/Managers can manage plant instances"
ON public.plant_instances
FOR ALL
TO authenticated
USING (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.estates e ON e.id = a.estate_id
    WHERE a.id = plant_instances.asset_id
      AND e.org_id = public.get_user_org_id(auth.uid())
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.estates e ON e.id = a.estate_id
    WHERE a.id = plant_instances.asset_id
      AND e.org_id = public.get_user_org_id(auth.uid())
  )
);

-- 3. topographic_references: fix manager scope bypass
DROP POLICY IF EXISTS "Owners and managers can manage topographic references" ON public.topographic_references;
CREATE POLICY "Owners and managers can manage topographic references"
ON public.topographic_references
FOR ALL
TO authenticated
USING (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.estates e
    WHERE e.id = topographic_references.estate_id
      AND e.org_id = public.get_user_org_id(auth.uid())
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.estates e
    WHERE e.id = topographic_references.estate_id
      AND e.org_id = public.get_user_org_id(auth.uid())
  )
);

-- 4. notifications: restrict INSERT to authenticated users creating notifications for themselves.
-- System-generated notifications use SECURITY DEFINER triggers (auto_task_from_weather_alert,
-- notify_on_task_assignment) which bypass RLS, so this does not break automation.
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
