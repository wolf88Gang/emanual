-- ROLLBACK for P0 remediation. Captured definitions before change.
DROP TRIGGER IF EXISTS trg_guard_profile_org_id ON public.profiles;
DROP TRIGGER IF EXISTS trg_guard_subscription_writes ON public.subscriptions;
DROP POLICY IF EXISTS "Clients can view granted estates" ON public.estates;
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid());
-- Original function bodies:
CREATE OR REPLACE FUNCTION public.complete_business_onboarding(p_org_name text, p_archetype text, p_country text DEFAULT NULL::text, p_modules jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_archetype text := coalesce(nullif(trim(p_archetype), ''), 'general_service');
  v_org_type text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF coalesce(trim(p_org_name), '') = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;
  IF v_archetype NOT IN ('plant_services','landscaping_services','property_services','property_management','asset_service','general_service','individual') THEN
    RAISE EXCEPTION 'Unknown business archetype: %', v_archetype;
  END IF;

  v_org_type := CASE v_archetype
    WHEN 'plant_services' THEN 'plant_rental'
    WHEN 'landscaping_services' THEN 'landscaping_company'
    WHEN 'property_services' THEN 'landscaping_company'
    WHEN 'property_management' THEN 'property_management'
    WHEN 'individual' THEN 'residential'
    ELSE 'landscaping_company'
  END;

  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, org_type, business_archetype, account_scope, modules_json)
    VALUES (
      trim(p_org_name),
      v_org_type,
      v_archetype,
      CASE WHEN v_archetype = 'individual' THEN 'individual' ELSE 'business' END,
      coalesce(p_modules, '{}'::jsonb)
    )
    RETURNING id INTO v_org_id;
  ELSE
    UPDATE public.organizations
    SET name = trim(p_org_name),
        org_type = v_org_type,
        business_archetype = v_archetype,
        account_scope = CASE WHEN v_archetype = 'individual' THEN 'individual' ELSE 'business' END,
        modules_json = coalesce(p_modules, modules_json),
        updated_at = now()
    WHERE id = v_org_id;
  END IF;

  -- p_country is accepted for backwards compatibility but not persisted:
  -- there is no canonical country field in the data model yet.
  UPDATE public.profiles
  SET org_id = v_org_id,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_org_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.complete_initial_onboarding(p_org_name text, p_org_type text, p_client_type text, p_estate_name text, p_country text DEFAULT NULL::text, p_address_text text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_estate_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF coalesce(trim(p_org_name), '') = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  IF coalesce(trim(p_estate_name), '') = '' THEN
    RAISE EXCEPTION 'Estate name is required';
  END IF;

  SELECT org_id INTO v_org_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, org_type)
    VALUES (trim(p_org_name), coalesce(nullif(trim(p_org_type), ''), 'residential'))
    RETURNING id INTO v_org_id;
  END IF;

  UPDATE public.profiles
  SET
    org_id = v_org_id,
    client_type = CASE
      WHEN p_client_type IN ('property_owner', 'landscaping_company', 'hybrid', 'other', 'property_management', 'plant_rental')
        THEN p_client_type::public.client_type
      ELSE client_type
    END,
    updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.estates (name, org_id, country, address_text)
  VALUES (
    trim(p_estate_name),
    v_org_id,
    nullif(trim(coalesce(p_country, '')), ''),
    nullif(trim(coalesce(p_address_text, '')), '')
  )
  RETURNING id INTO v_estate_id;

  RETURN v_estate_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT org_id FROM public.profiles WHERE id = _user_id
$function$

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.platform_admins
        WHERE user_id = _user_id
    )
$function$


-- Original policies snapshot:
-- client_access|Clients can view own access|SELECT|{authenticated}|(client_user_id = auth.uid())|
-- client_access|Owners/Managers can manage client access|ALL|{authenticated}|((org_id = get_user_org_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))|((org_id = get_user_org_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
-- organizations|Authenticated users can create organizations|INSERT|{authenticated}||(auth.uid() IS NOT NULL)
-- organizations|Owners can manage their org|ALL|{public}|((id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role))|
-- organizations|Platform admins can view all organizations|SELECT|{authenticated}|is_platform_admin(auth.uid())|
-- organizations|Platform admins update organizations|UPDATE|{authenticated}|(EXISTS ( SELECT 1
--    FROM platform_admins pa
--   WHERE (pa.user_id = auth.uid())))|(EXISTS ( SELECT 1
--    FROM platform_admins pa
--   WHERE (pa.user_id = auth.uid())))
-- organizations|Users can view their org|SELECT|{public}|(id = get_user_org_id(auth.uid()))|
-- platform_admins|Platform admins can view all|SELECT|{authenticated}|is_platform_admin(auth.uid())|
-- profiles|Platform admins can view all profiles|SELECT|{authenticated}|is_platform_admin(auth.uid())|
-- profiles|Users can insert their own profile|INSERT|{public}||(id = auth.uid())
-- profiles|Users can update their own profile|UPDATE|{public}|(id = auth.uid())|
-- profiles|Users can view profiles in their org|SELECT|{public}|(org_id = get_user_org_id(auth.uid()))|
-- profiles|Users can view their own profile|SELECT|{public}|(id = auth.uid())|
-- subscriptions|Members can view their organization subscription|SELECT|{authenticated}|((org_id IS NOT NULL) AND (org_id = ( SELECT p.org_id
--    FROM profiles p
--   WHERE (p.id = auth.uid()))))|
-- subscriptions|Platform admins can insert any subscription|INSERT|{authenticated}||is_platform_admin(auth.uid())
-- subscriptions|Platform admins can update any subscription|UPDATE|{authenticated}|is_platform_admin(auth.uid())|is_platform_admin(auth.uid())
-- subscriptions|Platform admins can view all subscriptions|SELECT|{authenticated}|is_platform_admin(auth.uid())|
-- subscriptions|Users can insert own subscription|INSERT|{authenticated}||(user_id = auth.uid())
-- subscriptions|Users can update own subscription|UPDATE|{authenticated}|(user_id = auth.uid())|
-- subscriptions|Users can view own subscription|SELECT|{authenticated}|(user_id = auth.uid())|
-- team_invites|Owners/Managers can manage team invites|ALL|{public}|((org_id = get_user_org_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))|
-- team_members|Owners/Managers can manage team members|ALL|{public}|((org_id = get_user_org_id(auth.uid())) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))|
-- team_members|Users can view team members in their org|SELECT|{public}|(org_id = get_user_org_id(auth.uid()))|
-- user_roles|Owners can manage roles in own org|ALL|{authenticated}|(has_role(auth.uid(), 'owner'::app_role) AND (EXISTS ( SELECT 1
--    FROM profiles p
--   WHERE ((p.id = user_roles.user_id) AND (p.org_id = get_user_org_id(auth.uid()))))))|(has_role(auth.uid(), 'owner'::app_role) AND (EXISTS ( SELECT 1
--    FROM profiles p
--   WHERE ((p.id = user_roles.user_id) AND (p.org_id = get_user_org_id(auth.uid()))))))
-- user_roles|Owners/Managers can view all roles in org|SELECT|{public}|((EXISTS ( SELECT 1
--    FROM profiles p
--   WHERE ((p.id = user_roles.user_id) AND (p.org_id = get_user_org_id(auth.uid()))))) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))|
-- user_roles|Users can view their own roles|SELECT|{public}|(user_id = auth.uid())|
