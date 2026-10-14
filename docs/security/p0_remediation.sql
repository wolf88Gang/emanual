-- P0 security remediation (HomeGuide). Idempotent; rollback in docs/security/p0_rollback.sql

-- ---------- P0-1: profile org takeover ----------
CREATE OR REPLACE FUNCTION public.guard_profile_org_id()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  -- Direct Data API callers run as anon/authenticated. Trusted paths
  -- (SECURITY DEFINER RPCs, service-role edge functions) run as other roles.
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' AND NEW.org_id IS NOT NULL THEN
      RAISE EXCEPTION 'organization can only be assigned through onboarding or an invitation' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.org_id IS DISTINCT FROM OLD.org_id THEN
      RAISE EXCEPTION 'organization can only be changed through onboarding or an invitation' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_org_id ON public.profiles;
CREATE TRIGGER trg_guard_profile_org_id
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_org_id();

-- Helper: does the user hold any tenant role?
CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','manager','crew','vendor','client')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid) TO authenticated, service_role;

-- Server-side trial row (replaces the former client-side insert).
CREATE OR REPLACE FUNCTION public.ensure_org_trial_subscription(_user_id uuid, _org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE org_id = _org_id OR user_id = _user_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.subscriptions
    (user_id, org_id, plan_type, status, amount, trial_started_at, trial_ends_at, current_period_start, current_period_end)
  VALUES
    (_user_id, _org_id, 'trial', 'active', 0, now(), now() + interval '15 days', now(), now() + interval '15 days');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ensure_org_trial_subscription(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_business_onboarding(p_org_name text, p_archetype text, p_country text DEFAULT NULL::text, p_modules jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_archetype text := coalesce(nullif(trim(p_archetype), ''), 'general_service');
  v_org_type text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF coalesce(trim(p_org_name), '') = '' THEN RAISE EXCEPTION 'Business name is required'; END IF;
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
    IF public.has_tenant_role(v_user_id) THEN
      RAISE EXCEPTION 'Account already has a workspace role' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.organizations (name, org_type, business_archetype, account_scope, modules_json)
    VALUES (trim(p_org_name), v_org_type, v_archetype,
            CASE WHEN v_archetype = 'individual' THEN 'individual' ELSE 'business' END,
            coalesce(p_modules, '{}'::jsonb))
    RETURNING id INTO v_org_id;

    UPDATE public.profiles SET org_id = v_org_id, updated_at = now() WHERE id = v_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'owner'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Existing workspace: only its owner may reconfigure it; never grants roles.
    IF NOT public.has_role(v_user_id, 'owner'::public.app_role) THEN
      RAISE EXCEPTION 'Only the workspace owner can change it' USING ERRCODE = '42501';
    END IF;
    UPDATE public.organizations
    SET name = trim(p_org_name), org_type = v_org_type, business_archetype = v_archetype,
        account_scope = CASE WHEN v_archetype = 'individual' THEN 'individual' ELSE 'business' END,
        modules_json = coalesce(p_modules, modules_json), updated_at = now()
    WHERE id = v_org_id;
  END IF;

  PERFORM public.ensure_org_trial_subscription(v_user_id, v_org_id);
  RETURN v_org_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_initial_onboarding(p_org_name text, p_org_type text, p_client_type text, p_estate_name text, p_country text DEFAULT NULL::text, p_address_text text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_estate_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF coalesce(trim(p_org_name), '') = '' THEN RAISE EXCEPTION 'Organization name is required'; END IF;
  IF coalesce(trim(p_estate_name), '') = '' THEN RAISE EXCEPTION 'Estate name is required'; END IF;

  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    IF public.has_tenant_role(v_user_id) THEN
      RAISE EXCEPTION 'Account already has a workspace role' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.organizations (name, org_type)
    VALUES (trim(p_org_name), coalesce(nullif(trim(p_org_type), ''), 'residential'))
    RETURNING id INTO v_org_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'owner'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NOT public.has_role(v_user_id, 'owner'::public.app_role) THEN
    RAISE EXCEPTION 'Only the workspace owner can add a property here' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET org_id = v_org_id,
      client_type = CASE
        WHEN p_client_type IN ('property_owner','landscaping_company','hybrid','other','property_management','plant_rental')
          THEN p_client_type::public.client_type ELSE client_type END,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.estates (name, org_id, country, address_text)
  VALUES (trim(p_estate_name), v_org_id,
          nullif(trim(coalesce(p_country, '')), ''), nullif(trim(coalesce(p_address_text, '')), ''))
  RETURNING id INTO v_estate_id;

  PERFORM public.ensure_org_trial_subscription(v_user_id, v_org_id);
  RETURN v_estate_id;
END;
$function$;

-- ---------- P0-2: subscription self-write ----------
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE DELETE, TRUNCATE ON public.subscriptions FROM authenticated;
GRANT ALL ON public.subscriptions TO service_role;

CREATE OR REPLACE FUNCTION public.guard_subscription_writes()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'subscriptions are managed by billing only' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_subscription_writes ON public.subscriptions;
CREATE TRIGGER trg_guard_subscription_writes
BEFORE INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.guard_subscription_writes();

DROP POLICY IF EXISTS "Members can view their organization subscription" ON public.subscriptions;
CREATE POLICY "Members can view their organization subscription" ON public.subscriptions
FOR SELECT TO authenticated
USING (org_id IS NOT NULL AND org_id = public.get_user_org_id(auth.uid()));

-- ---------- P0-3: client-only accounts lose org-wide scope ----------
-- Every same-org policy resolves scope via get_user_org_id. Client-only
-- accounts (role client, no internal role) get NULL => deny by default.
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT p.org_id FROM public.profiles p
  WHERE p.id = _user_id
    AND NOT (
      EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role = 'client')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role IN ('owner','manager','crew','vendor'))
    )
$function$;

-- Narrow replacement: a client sees only the properties explicitly granted.
DROP POLICY IF EXISTS "Clients can view granted estates" ON public.estates;
CREATE POLICY "Clients can view granted estates" ON public.estates
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.client_access ca
               WHERE ca.client_user_id = auth.uid() AND ca.estate_id = estates.id AND ca.org_id = estates.org_id));
